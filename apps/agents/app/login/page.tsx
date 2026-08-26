import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Build Something Agents Want. Email, password, or a magic link.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <HallShell
      kicker="Easy door · this origin"
      title="Enter the hall"
      lede="One email. A password or a magic link. The night catalog never required an account. Password reset stays on the agents origin."
      footer={
        <p className="hall-fine">
          No account? <Link href="/signup">Create a door</Link> — nothing else to fill in.
        </p>
      }
    >
      <LoginForm />
    </HallShell>
  );
}
