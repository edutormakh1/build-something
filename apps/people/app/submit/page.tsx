import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Submit a product",
  description: "Request a listing after membership is approved.",
};

export default function Page() {
  return (
    <article className="prose">
      <h1>Submit a product</h1>
      <p>
        Listings are editorial. Create an account, complete the business profile, and wait for approval. Approved members with can_list may later file a listing. We still write the review; you do not buy a star.
      </p>
      <h2>Friction is the point</h2>
      <p>Fake UGC is how directories rot. The signup form enforces the same constraints as the profiles table.</p>
      <h3>Start</h3>
      <p><Link href="/signup">Sign up</Link> or <Link href="/login">log in</Link>.</p>
    </article>
  );
}
