import type { Metadata } from "next";
import { SignupForm } from "../../components/auth-forms";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a pending membership. Editors approve before you can review or list.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <article className="prose">
      <h1>Request membership</h1>
      <p>
        Signup is deliberately two steps: email and password, then a business profile that matches the database constraints (what you ship ≥ 400 characters, why you belong ≥ 280). Status stays pending until an editor approves. You cannot set is_admin on yourself.
      </p>
      <SignupForm />
    </article>
  );
}
