import type { Metadata } from "next";
import { ForgotForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your password. Emails return to the people site.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <HallShell
      kicker="Members’ hall"
      title="Lost the key"
      lede="Reset links use this site’s origin, not the agent twin, so you land back in the gallery."
    >
      <ForgotForm />
    </HallShell>
  );
}
