"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Moon, Save, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Level = "BEGINNER" | "INTERMEDIATE" | "ADVANCED";
type Length = "CONCISE" | "NORMAL" | "DETAILED";

interface Props {
  initial: {
    name: string;
    email: string;
    level: Level;
    preferredLength: Length;
    darkMode: boolean;
  };
}

export function SettingsForm({ initial }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [name, setName] = useState(initial.name);
  const [level, setLevel] = useState<Level>(initial.level);
  const [length, setLength] = useState<Length>(initial.preferredLength);
  const [darkMode, setDarkMode] = useState(initial.darkMode);

  const applyTheme = (next: boolean) => {
    if (typeof document !== "undefined") {
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem("theme", next ? "dark" : "light");
      } catch {}
    }
  };

  const save = () => {
    startTransition(async () => {
      try {
        const res = await fetch("/api/settings", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim() || undefined,
            level,
            preferredLength: length,
            darkMode,
          }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "Save failed");
        }
        applyTheme(darkMode);
        toast({ title: "Saved", description: "Your preferences are updated." });
        router.refresh();
      } catch (err) {
        toast({
          variant: "destructive",
          title: "Could not save",
          description: err instanceof Error ? err.message : "Try again.",
        });
      }
    });
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        save();
      }}
      className="space-y-6"
    >
      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Display name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={initial.email} disabled />
            <p className="text-xs text-muted-foreground">
              Email is tied to your account and can't be changed here.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tutor behaviour</CardTitle>
          <p className="text-sm text-muted-foreground">
            These feed directly into the prompt — expect the next reply to match.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="level">Your level</Label>
            <Select value={level} onValueChange={(v) => setLevel(v as Level)}>
              <SelectTrigger id="level">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="BEGINNER">Beginner — assume little prior knowledge</SelectItem>
                <SelectItem value="INTERMEDIATE">Intermediate — the default</SelectItem>
                <SelectItem value="ADVANCED">Advanced — skip intros, be precise</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="length">Preferred reply length</Label>
            <Select value={length} onValueChange={(v) => setLength(v as Length)}>
              <SelectTrigger id="length">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CONCISE">Concise — short, no fluff</SelectItem>
                <SelectItem value="NORMAL">Normal — balanced</SelectItem>
                <SelectItem value="DETAILED">Detailed — thorough and worked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Appearance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => {
                setDarkMode(false);
                applyTheme(false);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                !darkMode
                  ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                  : "hover:border-primary/30"
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-500">
                <Sun className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Light</p>
                <p className="text-xs text-muted-foreground">Bright and clear</p>
              </div>
            </button>
            <button
              type="button"
              onClick={() => {
                setDarkMode(true);
                applyTheme(true);
              }}
              className={cn(
                "flex items-center gap-3 rounded-xl border p-3 text-left transition-all",
                darkMode
                  ? "border-primary/60 bg-primary/5 shadow-sm shadow-primary/10"
                  : "hover:border-primary/30"
              )}
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
                <Moon className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-medium">Dark</p>
                <p className="text-xs text-muted-foreground">Easy on the eyes at night</p>
              </div>
            </button>
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-end gap-3">
        <Button type="submit" variant="gradient" size="lg" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          Save changes
        </Button>
      </div>
    </form>
  );
}
