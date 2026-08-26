import type { Metadata } from "next";
import { ForgotForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your password. Emails return to the agents hall.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <HallShell
      kicker="Same origin"
      title="Forgot password"
      lede="Reset links return to this hall, not the magazine twin."
    >
      <ForgotForm />
    </HallShell>
  );
}
