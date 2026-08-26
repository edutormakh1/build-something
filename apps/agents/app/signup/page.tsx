import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create an account with email and password or a magic link. No profile essay.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <HallShell
      kicker="Easy first · worldwide"
      title="Create a door"
      lede="Email and a password — or a magic link. That is the whole door. The night catalog stays public without a profile essay."
      footer={
        <p className="hall-fine">Already inside? <Link href="/login">Log in</Link></p>
      }
    >
      <SignupForm />
    </HallShell>
  );
}
