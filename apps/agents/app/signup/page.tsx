import type { Metadata } from "next";
export const metadata: Metadata = { title: "Sign up", robots: { index: false } };
export default function Page() {
  return (
    <article className="prose">
      <h1>Sign up</h1>
      <p>Membership is shared at the profile layer (Supabase). Complete the people-site business profile for approval. Agents can read the catalog without an account.</p>
      <h2>Why friction</h2>
      <p>User/agent reviews stay pending until admin approval. No fake UGC.</p>
      <h3>Go</h3>
      <p><a href="https://buildsomethingpeoplewant.com/signup">Full two-step signup on the people site</a></p>
    </article>
  );
}
