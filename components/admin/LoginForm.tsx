"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LockKeyhole } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { createClient } from "@/lib/supabase/client";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setError(signInError.message);
      setLoading(false);
      return;
    }

    router.replace(searchParams.get("redirectTo") || "/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-900 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-white/10 bg-ink-800 p-6"
      >
        <div className="mb-5 flex flex-col items-center gap-2 text-white">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand-500">
            <LockKeyhole className="h-6 w-6" />
          </div>
          <h1 className="text-lg font-semibold">Staff Login</h1>
        </div>

        <label className="mb-3 block">
          <span className="mb-1 block text-xs font-medium text-white/60">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-ink-900 px-3 text-sm text-white outline-none focus:border-brand-500"
          />
        </label>

        <label className="mb-4 block">
          <span className="mb-1 block text-xs font-medium text-white/60">Password</span>
          <input
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="h-11 w-full rounded-xl border border-white/10 bg-ink-900 px-3 text-sm text-white outline-none focus:border-brand-500"
          />
        </label>

        {error ? <p className="mb-3 text-sm text-red-400">{error}</p> : null}

        <Button type="submit" variant="secondary" size="lg" className="w-full" disabled={loading}>
          {loading ? "Signing in..." : "Sign In"}
        </Button>
      </form>
    </div>
  );
}
