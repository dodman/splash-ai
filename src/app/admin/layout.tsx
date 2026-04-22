import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LayoutDashboard, Users, FileText, LogOut, Sparkles } from "lucide-react";

export const metadata = { title: "Admin — Splash AI" };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { isAdmin: true, name: true, email: true },
  });

  if (!user?.isAdmin) redirect("/dashboard");

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Top bar */}
      <header className="border-b border-gray-800 bg-gray-900/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="h-5 w-5 text-violet-400" />
            <span className="font-semibold text-sm tracking-wide text-gray-200">Splash AI Admin</span>
            <span className="text-gray-600 text-sm">|</span>
            <nav className="flex items-center gap-1">
              <AdminNavLink href="/admin" icon={<LayoutDashboard className="h-3.5 w-3.5" />} label="Overview" />
              <AdminNavLink href="/admin/users" icon={<Users className="h-3.5 w-3.5" />} label="Users" />
              <AdminNavLink href="/admin/materials" icon={<FileText className="h-3.5 w-3.5" />} label="Materials" />
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm text-gray-400">
            <span>{user.email}</span>
            <Link
              href="/dashboard"
              className="flex items-center gap-1.5 text-gray-500 hover:text-gray-200 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Exit admin
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}

function AdminNavLink({
  href,
  icon,
  label,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm text-gray-400 hover:text-gray-100 hover:bg-gray-800 transition-colors"
    >
      {icon}
      {label}
    </Link>
  );
}
