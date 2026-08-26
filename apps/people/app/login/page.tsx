import type { Metadata } from "next";
import { LoginForm } from "../../components/auth-forms";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Build Something People Want.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <article className="prose">
      <h1>Log in</h1>
      <p>Members with approved profiles can submit reviews. The public catalog does not require an account.</p>
      <LoginForm nextPath="/account" resetUrl="https://buildsomethingpeoplewant.com/account" />
    </article>
  );
}
