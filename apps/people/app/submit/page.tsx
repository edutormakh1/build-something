import type { Metadata } from "next";
import Link from "next/link";
import { abs } from "@bs/seo";
import { createServerSupabase, hasRealSupabase } from "@bs/auth/server";
import { BusinessProfileForm } from "../../components/auth-forms";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Submit a product",
  description: "Request a listing. Sign in first; the long membership card is only for listing, not for entering the site.",
  alternates: { canonical: abs("people", "/submit") },
};

export default async function Page() {
  let signedIn = false;
  let complete = false;
  if (hasRealSupabase()) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    signedIn = Boolean(user);
    if (user) {
      const { data } = await supabase.from("profiles").select("company_name, what_they_ship").eq("id", user.id).maybeSingle();
      complete = Boolean(data?.company_name && (data.what_they_ship?.length ?? 0) >= 400);
    }
  }
  return (
    <article className="prose">
      <h1>Submit a product</h1>
      <p>
        Listings are editorial. Create an account in one step, then — only if you want to list — complete the business profile. We still write the review; you do not buy a star.
      </p>
      <h2>The door is easy</h2>
      <p>Signup is email and a password. The 400-character pitch is this page, not the first screen.</p>
      <h3>Start</h3>
      {!signedIn ? (
        <p><Link href="/signup">Sign up</Link> or <Link href="/login">log in</Link>.</p>
      ) : complete ? (
        <p>Your membership card is on file. Editors still decide what ships in the catalog. Email editor@buildsomethingpeoplewant.com with the product slug and public docs.</p>
      ) : (
        <BusinessProfileForm purpose="list" />
      )}
    </article>
  );
}
