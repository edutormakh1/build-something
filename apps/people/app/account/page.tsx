import type { Metadata } from "next";
import { createServerSupabase, hasRealSupabase } from "@bs/auth/server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Account", robots: { index: false, follow: false } };

export default async function Page() {
  let email = "";
  let status = "unknown";
  if (hasRealSupabase()) {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    email = user?.email || "";
    if (user) {
      const { data } = await supabase.from("profiles").select("status, full_name, can_review, can_list").eq("id", user.id).maybeSingle();
      status = data?.status || "pending";
    }
  }
  return (
    <article className="prose">
      <h1>Your account</h1>
      <p>Membership is pending until an editor approves. Public catalog pages do not depend on this screen.</p>
      <h2>Session</h2>
      <p>{email ? `Signed in as ${email}. Profile status: ${status}.` : "Not signed in, or Supabase keys are not configured."}</p>
      <h3>Next</h3>
      <p><a href="/submit">Submit a product</a> · <a href="/login">Log in</a></p>
    </article>
  );
}
