import type { Metadata } from "next";
import Link from "next/link";
import { createServerSupabase, hasRealSupabase } from "@bs/auth/server";
import { BusinessProfileForm, SignOutButton } from "../../components/auth-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function Page() {
  let email = "";
  let status = "unknown";
  let complete = false;
  if (hasRealSupabase()) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email || "";
    if (user) {
      const { data } = await supabase.from("profiles").select("status, full_name, company_name, what_they_ship, can_review, can_list").eq("id", user.id).maybeSingle();
      status = data?.status || "member";
      complete = Boolean(data?.company_name && (data.what_they_ship?.length ?? 0) >= 400);
    }
  }
  return (
    <article className="prose">
      <h1>Your seat in the hall</h1>
      <p>You can walk the gallery with this account. Listing a product or filing a review is a later, optional card — not the door.</p>
      <h2>Session</h2>
      <p>{email ? `Signed in as ${email}. Profile status: ${status}.` : "Not signed in, or Supabase keys are not configured."}</p>
      <h3>Next</h3>
      <p>
        <Link href="/submit">Submit a product</Link> · <Link href="/reviews">Write a review</Link> · <Link href="/products">Gallery</Link>
      </p>
      {email ? <SignOutButton /> : <p><Link href="/login">Log in</Link></p>}
      {email && !complete ? <BusinessProfileForm purpose="account" /> : null}
    </article>
  );
}
