import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase, hasRealSupabase } from "@bs/auth/server";
import { BusinessProfileForm, ReviewDraftForm } from "../../components/auth-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Write a review",
  description: "File a pending user review after you have an account. The long membership card is only required to review or list, not to log in.",
  robots: { index: false, follow: false },
};

export default async function Page() {
  let signedIn = false;
  let complete = false;
  let canReview = false;
  if (hasRealSupabase()) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      const { data } = await supabase.from("profiles").select("company_name, what_they_ship, can_review, status").eq("id", user.id).maybeSingle();
      complete = Boolean(data?.company_name && (data.what_they_ship?.length ?? 0) >= 400);
      canReview = Boolean(data?.can_review);
    }
  }
  return (
    <article className="prose">
      <h1>Write a review</h1>
      <p>
        User reviews stay pending until an editor approves them. We never present fake UGC as authentic. You do not need this form to walk the gallery.
      </p>
      <h2>Who can file</h2>
      <p>Create an account first. Complete the membership card only when you want to review. Approved can_review members may insert pending reviews.</p>
      <h3>Start</h3>
      {!signedIn ? (
        <p><Link href="/signup">Sign up</Link> or <Link href="/login">log in</Link>.</p>
      ) : !complete ? (
        <BusinessProfileForm purpose="review" />
      ) : (
        <>
          {!canReview ? <p>Your card is in. Editors still grant can_review. You can draft below; inserts stay pending.</p> : null}
          <ReviewDraftForm />
        </>
      )}
    </article>
  );
}
