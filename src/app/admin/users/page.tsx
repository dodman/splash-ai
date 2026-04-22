import { prisma } from "@/lib/prisma";
import { AdminToggleAdmin } from "@/components/admin/toggle-admin";
import { AdminDeleteUser } from "@/components/admin/delete-user";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      isAdmin: true,
      createdAt: true,
      _count: {
        select: {
          ownedCourses: true,
          chatSessions: true,
          quizAttempts: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-100">Users</h1>
        <p className="text-sm text-gray-500 mt-1">{users.length} total accounts</p>
      </div>

      <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-800 text-left">
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Courses</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Sessions</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Quizzes</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-center">Role</th>
              <th className="px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-b border-gray-800/50 last:border-0 hover:bg-gray-800/20 transition-colors">
                <td className="px-5 py-3.5">
                  <div className="font-medium text-gray-200">{u.name ?? <span className="text-gray-600">—</span>}</div>
                  <div className="text-gray-500 text-xs mt-0.5">{u.email}</div>
                </td>
                <td className="px-5 py-3.5 text-gray-400 text-xs whitespace-nowrap">
                  {new Date(u.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                </td>
                <td className="px-5 py-3.5 text-center text-gray-300">{u._count.ownedCourses}</td>
                <td className="px-5 py-3.5 text-center text-gray-300">{u._count.chatSessions}</td>
                <td className="px-5 py-3.5 text-center text-gray-300">{u._count.quizAttempts}</td>
                <td className="px-5 py-3.5 text-center">
                  {u.isAdmin ? (
                    <span className="px-2 py-0.5 bg-violet-500/20 text-violet-400 rounded-full text-xs font-medium">admin</span>
                  ) : (
                    <span className="px-2 py-0.5 bg-gray-800 text-gray-500 rounded-full text-xs">student</span>
                  )}
                </td>
                <td className="px-5 py-3.5">
                  <div className="flex items-center justify-end gap-2">
                    <AdminToggleAdmin userId={u.id} isAdmin={u.isAdmin} />
                    <AdminDeleteUser userId={u.id} email={u.email} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
