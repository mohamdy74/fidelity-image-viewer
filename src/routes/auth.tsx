import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Join the league — DOWNFORCE" },
      {
        name: "description",
        content: "Sign in with Google to join the DOWNFORCE prediction league.",
      },
      { property: "og:title", content: "Join the league — DOWNFORCE" },
      {
        property: "og:description",
        content: "Sign in with Google to join the DOWNFORCE prediction league.",
      },
      { name: "twitter:title", content: "Join the league — DOWNFORCE" },
      {
        name: "twitter:description",
        content: "Sign in with Google to join the DOWNFORCE prediction league.",
      },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) navigate({ to: "/predict" });
  }, [loading, user, navigate]);

  async function signIn() {
    setBusy(true);

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    if (error) {
      setBusy(false);
      toast.error("Sign in failed. Please try again.");
    }
  }

  return (
    <main className="mx-auto flex max-w-md flex-col items-center px-4 py-20 text-center">
      <h1 className="text-3xl">Enter the league</h1>

      <p className="mt-3 text-sm text-muted-foreground">
        Sign in to lock in your predictions and appear on the league table.
      </p>

      <Button size="lg" className="mt-8 w-full" disabled={busy} onClick={signIn}>
        {busy ? "Opening Google…" : "Continue with Google"}
      </Button>

      <p className="mt-6 font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
        Registered players who submit nothing score −25
      </p>
    </main>
  );
}
