import type { Metadata } from "next";
import { ForgotForm } from "../../components/auth-forms";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Reset your password. Emails return to the people site.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <article className="prose">
      <h1>Forgot password</h1>
      <p>Reset links use this site’s origin, not the agent twin, so you land back on the magazine.</p>
      <ForgotForm />
    </article>
  );
}
