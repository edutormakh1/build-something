import type { Metadata } from "next";
import { SignupForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create an account with email and password. Business profile is optional, later.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <HallShell
      kicker="The door, not the paperwork"
      title="Take a seat"
      lede="Email and a password — or a magic link. After that you can use the site. The long membership card appears only when you want to list a product or write a review."
    >
      <SignupForm />
    </HallShell>
  );
}
