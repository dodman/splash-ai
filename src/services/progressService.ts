import { prisma } from "@/lib/prisma";
import { clamp } from "@/lib/utils";
import type { ProgressSummary } from "@/types";

// Exponential-moving-average update. New observation has weight 0.3.
const EMA_WEIGHT = 0.3;

export async function updateTopicMastery(params: {
  userId: string;
  courseId?: string | null;
  topic: string;
  /** 0..1 — how well the student did on this observation */
  observation: number;
}) {
  const observation = clamp(params.observation, 0, 1);
  const courseId = params.courseId ?? null;

  const existing = await prisma.topicProgress.findFirst({
    where: {
      userId: params.userId,
      courseId,
      topic: params.topic,
    },
  });

  const newMastery = existing
    ? clamp(existing.mastery * (1 - EMA_WEIGHT) + observation * EMA_WEIGHT, 0, 1)
    : observation;

  if (existing) {
    return prisma.topicProgress.update({
      where: { id: existing.id },
      data: {
        mastery: newMastery,
        sessionCount: { increment: 1 },
        lastStudiedAt: new Date(),
      },
    });
  }

  return prisma.topicProgress.create({
    data: {
      userId: params.userId,
      courseId,
      topic: params.topic,
      mastery: newMastery,
      sessionCount: 1,
    },
  });
}

export async function getProgressSummary(userId: string): Promise<ProgressSummary> {
  const [sessions, attempts, topicProgress, courses] = await Promise.all([
    prisma.chatSession.findMany({
      where: { userId },
      include: {
        _count: { select: { messages: true } },
        course: { select: { id: true, title: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 20,
    }),
    prisma.quizAttempt.findMany({
      where: { userId, completedAt: { not: null } },
      include: { quiz: { select: { id: true, title: true, courseId: true } } },
      orderBy: { completedAt: "desc" },
      take: 20,
    }),
    prisma.topicProgress.findMany({ where: { userId }, orderBy: { mastery: "asc" } }),
    prisma.course.findMany({
      where: { ownerId: userId },
      select: { id: true, title: true, code: true },
    }),
  ]);

  const totalMessages = sessions.reduce((sum, s) => sum + s._count.messages, 0);
  const hoursStudied = Math.round((totalMessages * 30) / 3600 * 10) / 10;

  const sessionsCompleted = sessions.filter((s) => s._count.messages >= 2).length;
  const quizzesCompleted = attempts.length;
  const averageScore =
    attempts.length > 0
      ? Math.round(
          (attempts.reduce((sum, a) => sum + (a.score / a.maxScore) * 100, 0) / attempts.length) * 10
        ) / 10
      : 0;

  const weakTopics = topicProgress
    .filter((t) => t.mastery < 0.6)
    .slice(0, 6)
    .map((t) => ({ topic: t.topic, mastery: t.mastery, courseId: t.courseId }));

  const strongTopics = [...topicProgress]
    .sort((a, b) => b.mastery - a.mastery)
    .filter((t) => t.mastery >= 0.7)
    .slice(0, 6)
    .map((t) => ({ topic: t.topic, mastery: t.mastery }));

  const recentActivity: ProgressSummary["recentActivity"] = [];
  for (const s of sessions.slice(0, 8)) {
    recentActivity.push({
      kind: "chat",
      title: s.title,
      at: s.updatedAt,
      href: `/chat/${s.id}`,
      detail: s.course ? s.course.title : undefined,
    });
  }
  for (const a of attempts.slice(0, 8)) {
    if (!a.completedAt) continue;
    recentActivity.push({
      kind: "quiz",
      title: a.quiz.title,
      at: a.completedAt,
      href: `/quiz/${a.quiz.id}`,
      detail: `${a.score}/${a.maxScore}`,
    });
  }
  recentActivity.sort((a, b) => b.at.getTime() - a.at.getTime());

  const streakDays = computeStreak(sessions.map((s) => s.updatedAt));

  // Per-course progress: group topics by course
  const courseMap = new Map(courses.map((c) => [c.id, c]));
  const courseProgressMap = new Map<string, ProgressSummary["courseProgress"][number]>();

  for (const tp of topicProgress) {
    if (!tp.courseId) continue;
    const c = courseMap.get(tp.courseId);
    if (!c) continue;

    let entry = courseProgressMap.get(tp.courseId);
    if (!entry) {
      entry = {
        courseId: c.id,
        courseTitle: c.title,
        courseCode: c.code,
        topics: [],
        averageMastery: 0,
      };
      courseProgressMap.set(tp.courseId, entry);
    }
    entry.topics.push({ topic: tp.topic, mastery: tp.mastery });
  }

  // Also include courses with no topics yet
  for (const c of courses) {
    if (!courseProgressMap.has(c.id)) {
      courseProgressMap.set(c.id, {
        courseId: c.id,
        courseTitle: c.title,
        courseCode: c.code,
        topics: [],
        averageMastery: 0,
      });
    }
  }

  const courseProgress = Array.from(courseProgressMap.values()).map((cp) => {
    cp.averageMastery =
      cp.topics.length > 0
        ? cp.topics.reduce((sum, t) => sum + t.mastery, 0) / cp.topics.length
        : 0;
    cp.topics.sort((a, b) => a.mastery - b.mastery);
    return cp;
  });

  return {
    hoursStudied,
    sessionsCompleted,
    quizzesCompleted,
    averageScore,
    streakDays,
    weakTopics,
    strongTopics,
    courseProgress,
    recentActivity: recentActivity.slice(0, 10),
  };
}

export async function resetAllProgress(userId: string) {
  await prisma.topicProgress.deleteMany({ where: { userId } });
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function computeStreak(dates: Date[]): number {
  if (dates.length === 0) return 0;
  const set = new Set(dates.map(dayKey));
  let streak = 0;
  const cur = new Date();
  while (set.has(dayKey(cur))) {
    streak++;
    cur.setDate(cur.getDate() - 1);
  }
  return streak;
}

export async function recordSessionActivity(params: {
  userId: string;
  courseId: string | null;
  topicHint?: string;
}) {
  // Bump a lightweight "activity" topic when no finer signal exists.
  if (!params.topicHint) return;
  await updateTopicMastery({
    userId: params.userId,
    courseId: params.courseId,
    topic: params.topicHint,
    observation: 0.5,
  });
}
