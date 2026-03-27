"use client";

import { useActionState, useEffect, useState } from "react";

import { requestMagicLinkAction } from "@/lib/actions/app";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";

export default function LoginPage() {
  const [origin, setOrigin] = useState("");
  const [state, formAction] = useActionState(requestMagicLinkAction, undefined);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <div className="grid w-full max-w-5xl gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[32px] border border-border/70 bg-card/70 p-8 shadow-soft backdrop-blur">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary">
            Meal Tracking
          </p>
          <h1 className="mt-4 max-w-xl text-4xl font-semibold leading-tight">
            Keep lunch and dinner logging tied to the plan you already follow.
          </h1>
          <p className="mt-4 max-w-2xl text-base text-muted-foreground">
            The MVP centers on a fast Today screen, a recipe library, meal-plan import from PDF, and a clean audit trail of planned vs eaten meals.
          </p>
        </section>

        <Card className="bg-card/90">
          <CardHeader>
            <CardTitle>Sign in</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={formAction} className="space-y-4">
              <input name="origin" type="hidden" value={origin} />
              <div className="grid gap-1.5">
                <label className="text-sm font-medium">Email</label>
                <Input name="email" placeholder="you@example.com" required type="email" />
              </div>
              {state?.message ? <p className="text-sm text-muted-foreground">{state.message}</p> : null}
              <SubmitButton className="w-full" pendingLabel="Sending magic link...">
                Send magic link
              </SubmitButton>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
