import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getAIProvider } from "@/providers/ai";
import { similaritySearch, formatSourcesForPrompt } from "./retrievalService";
import {
  quizGenerationSchema,
  buildQuizGenerationPrompt,
  buildShortAnswerGradingPrompt,
  shortAnswerGradingSchema,
} from "@/prompts/quiz";
import { updateTopicMastery } from "./progressService";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import type { QuestionType } from "@prisma/client";

export const generateQuizInputSchema = z.object({
  courseId: z.string().cuid(),
  topic: z.string().trim().max(120).optional().or(z.literal("")).transform((v) => v || undefined),
  count: z.coerce.number().int().min(3).max(15).default(5),
  types: z
    .array(z.enum(["MCQ", "SHORT", "SCENARIO"]))
    .min(1)
    .default(["MCQ", "SHORT"]),
});

export type GenerateQuizInput = z.infer<typeof generateQuizInputSchema>;

export async function generateQuiz(userId: string, input: GenerateQuizInput) {
  const course = await prisma.course.findUnique({ where: { id: input.courseId } });
  if (!course) throw new NotFoundError("Course not found");
  if (course.ownerId !== userId) {
    const enrolled = await prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId: input.courseId } },
    });
    if (!enrolled) throw new ForbiddenError();
  }

  const readyMaterialCount = await prisma.courseMaterial.count({
    where: { courseId: input.courseId, status: "READY" },
  });
  if (readyMaterialCount === 0) {
    throw new ValidationError(
      "Upload at least one course material before generating a quiz."
    );
  }

  const settings = await prisma.userSettings.findUnique({ where: { userId } });
  const level = settings?.level ?? "INTERMEDIATE";

  const chunks = await similaritySearch({
    courseId: input.courseId,
    query: input.topic ?? `${course.title} — exam-style key concepts`,
    k: 10,
  });

  if (chunks.length === 0) {
    throw new ValidationError(
      "Course materials have not finished processing yet — try again in a moment."
    );
  }

  const ai = getAIProvider();
  const prompt = buildQuizGenerationPrompt({
    courseTitle: course.title,
    topic: input.topic,
    count: input.count,
    types: input.types,
    sources: formatSourcesForPrompt(chunks),
    studentLevel: level,
  });

  const generated = await ai.chatJSON({
    system:
      "You generate rigorous university-level quizzes grounded in provided SOURCES. Output strictly matches the JSON schema.",
    messages: [{ role: "user", content: prompt }],
    schema: quizGenerationSchema,
    temperature: 0.5,
  });

  // Validate MCQ answers are inside their options list
  const sanitized = generated.questions.filter((q) => {
    if (q.type !== "MCQ") return true;
    if (!q.options || q.options.length < 2) return false;
    return q.options.includes(q.correctAnswer);
  });

  if (sanitized.length === 0) {
    throw new ValidationError("The model returned an unusable quiz. Please try again.");
  }

  const quiz = await prisma.quiz.create({
    data: {
      userId,
      courseId: input.courseId,
      title: generated.title,
      topic: input.topic,
      questions: {
        create: sanitized.map((q, i) => ({
          order: i,
          type: q.type as QuestionType,
          prompt: q.prompt,
          options: q.options ?? undefined,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          topic: q.topic,
        })),
      },
    },
    include: { questions: { orderBy: { order: "asc" } } },
  });

  return quiz;
}

export async function listQuizzes(userId: string, courseId?: string | null) {
  return prisma.quiz.findMany({
    where: { userId, ...(courseId !== undefined ? { courseId } : {}) },
    orderBy: { createdAt: "desc" },
    include: {
      course: { select: { id: true, title: true, code: true } },
      _count: { select: { questions: true, attempts: true } },
      attempts: {
        orderBy: { completedAt: "desc" },
        take: 1,
        select: { score: true, maxScore: true, completedAt: true },
      },
    },
    take: 50,
  });
}

export async function getQuizForUser(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      course: true,
      attempts: { where: { userId }, orderBy: { completedAt: "desc" } },
    },
  });
  if (!quiz) throw new NotFoundError();
  if (quiz.userId !== userId) throw new ForbiddenError();
  return quiz;
}

export async function deleteQuiz(userId: string, quizId: string) {
  const quiz = await prisma.quiz.findUnique({ where: { id: quizId } });
  if (!quiz) throw new NotFoundError();
  if (quiz.userId !== userId) throw new ForbiddenError();
  await prisma.quiz.delete({ where: { id: quizId } });
}

export const quizSubmissionSchema = z.object({
  responses: z
    .array(
      z.object({
        questionId: z.string().cuid(),
        answer: z.string().trim().max(4000),
      })
    )
    .min(1),
});

export type QuizSubmission = z.infer<typeof quizSubmissionSchema>;

export async function submitQuizAttempt(
  userId: string,
  quizId: string,
  submission: QuizSubmission
) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: true },
  });
  if (!quiz) throw new NotFoundError();
  if (quiz.userId !== userId) throw new ForbiddenError();

  const questionById = new Map(quiz.questions.map((q) => [q.id, q]));
  const ai = getAIProvider();

  let score = 0;
  const graded = await Promise.all(
    submission.responses.map(async (r) => {
      const q = questionById.get(r.questionId);
      if (!q) {
        return {
          questionId: r.questionId,
          answer: r.answer,
          correct: false,
          pointsAwarded: 0,
          feedback: "Unknown question.",
        };
      }
      if (q.type === "MCQ") {
        const correct = r.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        return {
          questionId: q.id,
          answer: r.answer,
          correct,
          pointsAwarded: correct ? 1 : 0,
          feedback: correct ? "Correct." : q.explanation,
        };
      }
      // SHORT + SCENARIO → use model to grade
      if (!r.answer.trim()) {
        return {
          questionId: q.id,
          answer: "",
          correct: false,
          pointsAwarded: 0,
          feedback: "No answer provided.",
        };
      }
      try {
        const grade = await ai.chatJSON({
          system: "You are a fair but strict grader for short-answer academic questions.",
          messages: [
            {
              role: "user",
              content: buildShortAnswerGradingPrompt({
                prompt: q.prompt,
                expected: q.correctAnswer,
                studentAnswer: r.answer,
              }),
            },
          ],
          schema: shortAnswerGradingSchema,
          temperature: 0.2,
        });
        return {
          questionId: q.id,
          answer: r.answer,
          correct: grade.correct,
          pointsAwarded: grade.points,
          feedback: grade.feedback,
        };
      } catch {
        // Fall back to strict string compare if the model fails.
        const correct = r.answer.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase();
        return {
          questionId: q.id,
          answer: r.answer,
          correct,
          pointsAwarded: correct ? 1 : 0,
          feedback: correct ? "Correct." : q.explanation,
        };
      }
    })
  );

  for (const g of graded) {
    score += g.pointsAwarded ?? 0;
  }
  const maxScore = quiz.questions.length;

  const attempt = await prisma.quizAttempt.create({
    data: {
      userId,
      quizId,
      score: Math.round(score * 100) / 100,
      maxScore,
      responses: graded as any,
      completedAt: new Date(),
    },
  });

  // Update topic mastery
  const topicScores = new Map<string, { total: number; correct: number }>();
  for (const g of graded) {
    const q = questionById.get(g.questionId);
    if (!q?.topic) continue;
    const entry = topicScores.get(q.topic) ?? { total: 0, correct: 0 };
    entry.total += 1;
    entry.correct += g.pointsAwarded ?? 0;
    topicScores.set(q.topic, entry);
  }

  for (const [topic, stats] of topicScores) {
    const achieved = stats.correct / stats.total;
    await updateTopicMastery({
      userId,
      courseId: quiz.courseId,
      topic,
      observation: achieved,
    });
  }

  return {
    attempt,
    graded,
    score: attempt.score,
    maxScore: attempt.maxScore,
  };
}
