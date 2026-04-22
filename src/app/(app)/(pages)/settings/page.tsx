import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SettingsForm } from "@/components/settings/settings-form";
import { SignOutButton } from "@/components/settings/sign-out-button";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");

  const [user, settings] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, email: true, name: true, image: true, createdAt: true },
    }),
    prisma.userSettings.upsert({
      where: { userId: session.user.id },
      update: {},
      create: { userId: session.user.id },
    }),
  ]);

  if (!user) redirect("/login");

  return (
    <div className="max-w-2xl space-y-8">
      <header>
        <h1 className="font-serif text-3xl tracking-tight">Settings</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Shape how the tutor teaches you, and manage your profile.
        </p>
      </header>

      <SettingsForm
        initial={{
          name: user.name ?? "",
          email: user.email ?? "",
          level: settings.level,
          preferredLength: settings.preferredLength,
          darkMode: settings.darkMode,
        }}
      />

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm">Signed in as</p>
            <p className="text-sm font-medium">{user.email}</p>
          </div>
          <SignOutButton />
        </CardContent>
      </Card>
    </div>
  );
}
