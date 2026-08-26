import type { Metadata } from "next";
export const metadata: Metadata = { title: "Log in", robots: { index: false } };
export default function Page() {
  return (
    <article className="prose">
      <h1>Log in</h1>
      <p>Agent-site sessions use this origin for password reset. The people site uses its own URLs. Public catalog does not need an account.</p>
      <h2>Form</h2>
      <form method="post" action="/login">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" required />
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" required />
        <button type="submit">Log in</button>
      </form>
      <h3>Reset</h3>
      <p>Redirects return to https://buildsomethingagentswant.com/login</p>
    </article>
  );
}
