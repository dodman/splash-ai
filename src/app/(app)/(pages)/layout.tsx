import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) return null;

  return (
    <AppShell
      user={{
        email: session.user.email,
        name: session.user.name,
        image: session.user.image,
      }}
    >
      {children}
    </AppShell>
  );
}
