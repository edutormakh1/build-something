import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase } from "@bs/auth/server";
import { recoveryPageState, recoveryMessage } from "@bs/auth/recovery";
import { ResetPasswordForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";
import { updatePassword } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your account.",
  robots: { index: false, follow: false },
};

export default async function Page({ searchParams }: { searchParams: Promise<{ error?: string | string[] }> }) {
  const params = await searchParams;
  const state = await recoveryPageState(params.error, createServerSupabase);
  return (
    <HallShell kicker="Your account" title="Reset password" lede="Choose a new password to use the next time you sign in.">
      {state === "ready" ? (
        <ResetPasswordForm action={updatePassword} continuePath="/account" />
      ) : (
        <div>
          <p role="alert">{recoveryMessage(state)}</p>
          <p><Link href="/forgot-password" prefetch={false}>Request a new reset link</Link></p>
        </div>
      )}
    </HallShell>
  );
}
