import Link from "next/link";
import { CalendarDays, History, LibraryBig, LogOut, Sparkles, Upload } from "lucide-react";

import { ThemeToggle } from "@/components/layout/theme-toggle";
import { signOutAction } from "@/lib/actions/app";
import { SubmitButton } from "@/components/ui/submit-button";

const navItems = [
  { href: "/today", label: "Today", icon: Sparkles },
  { href: "/recipes", label: "Recipes", icon: LibraryBig },
  { href: "/plan", label: "Plan", icon: CalendarDays },
  { href: "/plan/import", label: "Import", icon: Upload },
  { href: "/history", label: "History", icon: History }
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl gap-6 px-4 py-6 lg:px-6">
      <aside className="hidden w-72 shrink-0 flex-col rounded-[28px] border border-border/70 bg-card/85 p-5 shadow-soft backdrop-blur lg:flex">
        <div className="mb-8 space-y-2">
          <div className="inline-flex rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            Meal Tracking
          </div>
          <h1 className="text-2xl font-semibold">Personal meal adherence</h1>
          <p className="text-sm text-muted-foreground">
            Fast lunch and dinner logging tied directly to your current plan.
          </p>
        </div>

        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto flex items-center justify-between">
          <ThemeToggle />
          <form action={signOutAction}>
            <SubmitButton pendingLabel="Signing out..." variant="ghost" size="sm">
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </SubmitButton>
          </form>
        </div>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col">
        <header className="mb-5 flex items-center justify-between rounded-[28px] border border-border/70 bg-card/85 px-5 py-4 shadow-soft backdrop-blur lg:hidden">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Meal Tracking</p>
            <p className="text-lg font-semibold">Lunch and dinner only</p>
          </div>
          <ThemeToggle />
        </header>

        <main className="flex-1">{children}</main>

        <nav className="sticky bottom-4 mt-6 grid grid-cols-5 gap-2 rounded-[28px] border border-border/70 bg-card/95 p-2 shadow-soft backdrop-blur lg:hidden">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                className="flex flex-col items-center gap-1 rounded-2xl px-2 py-3 text-[11px] font-medium text-muted-foreground transition hover:bg-accent hover:text-foreground"
                href={item.href}
                key={item.href}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
