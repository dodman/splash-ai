import { prisma } from "@/lib/prisma";
import { Users, BookOpen, FileText, MessageSquare, ClipboardCheck, HardDrive } from "lucide-react";

export const dynamic = "force-dynamic";

async function getStats() {
  const [
    totalUsers,
    totalCourses,
    totalMaterials,
    readyMaterials,
    failedMaterials,
    totalSessions,
    totalMessages,
    totalQuizzes,
    totalAttempts,
    recentUsers,
    recentSessions,
    materialSizeAgg,
  ] = await Promise.all([
    prisma.user.count(),
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
        id: true,
        title: true,
        updatedAt: true,
        user: { select: { email: true } },
        course: { select: { title: true } },
      },
    }),
    prisma.courseMaterial.aggregate({ _sum: { size: true } }),
  ]);

  const totalStorageBytes = materialSizeAgg._sum.size ?? 0;
  const totalStorageMB = (totalStorageBytes / 1024 / 1024).toFixed(1);

  return {
    totalUsers, totalCourses, totalMaterials, readyMaterials, failedMaterials,
    totalSessions, totalMessages, totalQuizzes, totalAttempts,
    recentUsers, recentSessions, totalStorageMB,
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

export default async function AdminPage() {
  const s = await getStats();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Overview</h1>
        <p className="text-sm text-gray-500 mt-1">Platform-wide metrics across all users.</p>
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total users" value={s.totalUsers} icon={<Users className="h-4 w-4 text-violet-400" />} accent="bg-violet-500/10" />
        <StatCard label="Courses" value={s.totalCourses} icon={<BookOpen className="h-4 w-4 text-indigo-400" />} accent="bg-indigo-500/10" />
        <StatCard label="Materials" value={s.totalMaterials} sub={`${s.readyMaterials} ready · ${s.failedMaterials} failed`} icon={<FileText className="h-4 w-4 text-fuchsia-400" />} accent="bg-fuchsia-500/10" />
        <StatCard label="Storage used" value={`${s.totalStorageMB} MB`} icon={<HardDrive className="h-4 w-4 text-emerald-400" />} accent="bg-emerald-500/10" />
        <StatCard label="Chat sessions" value={s.totalSessions} sub={`${s.totalMessages} messages`} icon={<MessageSquare className="h-4 w-4 text-sky-400" />} accent="bg-sky-500/10" />
        <StatCard label="Quizzes" value={s.totalQuizzes} sub={`${s.totalAttempts} attempts completed`} icon={<ClipboardCheck className="h-4 w-4 text-amber-400" />} accent="bg-amber-500/10" />
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
                    {u.isAdmin && <span className="ml-2 px-1.5 py-0.5 bg-violet-500/20 text-violet-400 rounded text-xs">admin</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Recent sessions */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-200">Recent tutor sessions</h2>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {s.recentSessions.map((s) => (
                <tr key={s.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition-colors">
                  <td className="px-5 py-3">
                    <div className="font-medium text-gray-200 truncate max-w-[200px]">{s.title}</div>
                    <div className="text-gray-500 text-xs">{s.user.email}</div>
                  </td>
                  <td className="px-5 py-3 text-right text-gray-500 text-xs whitespace-nowrap">
                    {formatRelative(s.updatedAt)}
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
