import { prisma } from "@/lib/prisma";
import {
  Users, BookOpen, FileText, MessageSquare,
  ClipboardCheck, HardDrive, Zap, DollarSign,
} from "lucide-react";

export const dynamic = "force-dynamic";

// GPT-4o-mini pricing (per 1M tokens, USD) — update if OpenAI changes pricing
const PRICE_INPUT_PER_M = 0.15;
const PRICE_OUTPUT_PER_M = 0.60;
// Rough split: ~60% prompt, ~40% completion
function estimateCostUSD(totalTokens: number): number {
  const inputT = totalTokens * 0.6;
  const outputT = totalTokens * 0.4;
  return (inputT / 1_000_000) * PRICE_INPUT_PER_M + (outputT / 1_000_000) * PRICE_OUTPUT_PER_M;
}

async function getStats() {
  const [
    totalUsers, bannedUsers, totalCourses,
    totalMaterials, readyMaterials, failedMaterials,
    totalSessions, totalMessages,
    totalQuizzes, totalAttempts,
    recentUsers, recentSessions,
    materialSizeAgg, tokenAgg,
    modeCounts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { bannedAt: { not: null } } }),
    prisma.course.count(),
    prisma.courseMaterial.count(),
    prisma.courseMaterial.count({ where: { status: "READY" } }),
    prisma.courseMaterial.count({ where: { status: "FAILED" } }),
    prisma.chatSession.count(),
    prisma.chatMessage.count(),
    prisma.quiz.count(),
    prisma.quizAttempt.count({ where: { completedAt: { not: null } } }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      select: { id: true, name: true, email: true, createdAt: true, isAdmin: true },
    }),
    prisma.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true, title: true, mode: true, updatedAt: true, totalTokensUsed: true,
        user: { select: { email: true } },
        course: { select: { title: true } },
      },
    }),
    prisma.courseMaterial.aggregate({ _sum: { size: true } }),
    prisma.chatSession.aggregate({ _sum: { totalTokensUsed: true } }),
    // Count sessions per mode
    prisma.chatSession.groupBy({ by: ["mode"], _count: { _all: true } }),
  ]);

  const totalStorageMB = ((materialSizeAgg._sum.size ?? 0) / 1024 / 1024).toFixed(1);
  const totalTokens = tokenAgg._sum.totalTokensUsed ?? 0;
  const estimatedCost = estimateCostUSD(totalTokens);

  return {
    totalUsers, bannedUsers, totalCourses,
    totalMaterials, readyMaterials, failedMaterials,
    totalSessions, totalMessages,
    totalQuizzes, totalAttempts,
    recentUsers, recentSessions,
    totalStorageMB, totalTokens, estimatedCost,
    modeCounts,
  };
}

function StatCard({
  label, value, sub, icon, accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</span>
        <span className={`p-1.5 rounded-lg ${accent}`}>{icon}</span>
      </div>
      <div className="text-2xl font-bold text-gray-100">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-1">{sub}</div>}
    </div>
  );
}

function formatDate(d: Date) {
  return new Date(d).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function formatRelative(d: Date) {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

export default async function AdminPage() {
  const s = await getStats();

  const modeMap = Object.fromEntries(s.modeCounts.map((m) => [m.mode, m._count._all]));

  const tutorTotal = (modeMap["LEARN"] ?? 0) + (modeMap["PRACTICE"] ?? 0) +
    (modeMap["REVISION"] ?? 0) + (modeMap["DIRECT"] ?? 0);
  const assistantTotal = (modeMap["GENERAL"] ?? 0) + (modeMap["CODE"] ?? 0) +
    (modeMap["WRITE"] ?? 0) + (modeMap["RESEARCH"] ?? 0) + (modeMap["BUSINESS"] ?? 0);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide metrics across all users.</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total users"
          value={s.totalUsers}
          sub={s.bannedUsers > 0 ? `${s.bannedUsers} banned` : "all active"}
          icon={<Users className="h-4 w-4 text-violet-400" />}
          accent="bg-violet-500/10"
        />
        <StatCard
          label="Courses"
          value={s.totalCourses}
          icon={<BookOpen className="h-4 w-4 text-indigo-400" />}
          accent="bg-indigo-500/10"
        />
        <StatCard
          label="Materials"
          value={s.totalMaterials}
          sub={`${s.readyMaterials} ready · ${s.failedMaterials} failed`}
          icon={<FileText className="h-4 w-4 text-fuchsia-400" />}
          accent="bg-fuchsia-500/10"
        />
        <StatCard
          label="Storage"
          value={`${s.totalStorageMB} MB`}
          icon={<HardDrive className="h-4 w-4 text-emerald-400" />}
          accent="bg-emerald-500/10"
        />
        <StatCard
          label="Chat sessions"
          value={s.totalSessions}
          sub={`${s.totalMessages} messages`}
          icon={<MessageSquare className="h-4 w-4 text-sky-400" />}
          accent="bg-sky-500/10"
        />
        <StatCard
          label="Quizzes"
          value={s.totalQuizzes}
          sub={`${s.totalAttempts} attempts done`}
          icon={<ClipboardCheck className="h-4 w-4 text-amber-400" />}
          accent="bg-amber-500/10"
        />
        <StatCard
          label="Tokens used"
          value={formatTokens(s.totalTokens)}
          sub="tracked since upgrade"
          icon={<Zap className="h-4 w-4 text-rose-400" />}
          accent="bg-rose-500/10"
        />
        <StatCard
          label="Est. AI cost"
          value={`$${s.estimatedCost.toFixed(3)}`}
          sub="gpt-4o-mini rates"
          icon={<DollarSign className="h-4 w-4 text-green-400" />}
          accent="bg-green-500/10"
        />
      </div>

      {/* Mode breakdown */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-200 mb-4">Chat sessions by mode</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {[
            { mode: "LEARN", label: "Learn", color: "text-indigo-400" },
            { mode: "PRACTICE", label: "Practice", color: "text-violet-400" },
            { mode: "REVISION", label: "Revision", color: "text-fuchsia-400" },
            { mode: "DIRECT", label: "Direct", color: "text-emerald-400" },
            { mode: "GENERAL", label: "General", color: "text-sky-400" },
            { mode: "CODE", label: "Code", color: "text-green-400" },
            { mode: "WRITE", label: "Write", color: "text-amber-400" },
            { mode: "RESEARCH", label: "Research", color: "text-rose-400" },
            { mode: "BUSINESS", label: "Business", color: "text-orange-400" },
          ].map(({ mode, label, color }) => (
            <div key={mode} className="rounded-lg bg-gray-800/60 px-3 py-2.5 text-center">
              <div className={`text-lg font-bold ${color}`}>{modeMap[mode] ?? 0}</div>
              <div className="text-[11px] text-gray-500 mt-0.5">{label}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-4 text-xs text-gray-500">
          <span>Tutor total: <span className="text-gray-300 font-medium">{tutorTotal}</span></span>
          <span>Assistant total: <span className="text-gray-300 font-medium">{assistantTotal}</span></span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent users */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-gray-200">Recent sign-ups</h2>
            <a href="/admin/users" className="text-xs text-violet-400 hover:text-violet-300">View all →</a>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {s.recentUsers.map((u) => (
                <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-200">{u.name ?? "—"}</div>
                    <div className="text-gray-500 text-xs">{u.email}</div>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                    {formatDate(u.createdAt)}
                    {u.isAdmin && (
                      <span className="ml-2 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">admin</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent sessions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-200">Recent sessions</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {s.recentSessions.map((sess) => (
                <tr key={sess.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-200 truncate max-w-[180px]">{sess.title}</div>
                    <div className="text-gray-500 text-xs">{sess.user.email} · {sess.mode.toLowerCase()}</div>
                  </td>
                  <td className="px-5 py-3 text-right text-xs whitespace-nowrap">
                    {sess.totalTokensUsed > 0 && (
                      <span className="text-gray-600 mr-2">{formatTokens(sess.totalTokensUsed)}t</span>
                    )}
                    <span className="text-gray-500">{formatRelative(sess.updatedAt)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
