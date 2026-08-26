import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "../../components/auth-forms";
import { HallShell } from "../../components/hall-shell";

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to Build Something People Want.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return (
    <HallShell
      kicker="Members’ hall"
      title="Come in"
      lede="One email. One password. Then the gallery is yours. The public catalog never required an account."
      footer={
        <p className="hall-fine">
          New here? <Link href="/signup">Take a seat</Link>. Listing a product is a later, optional card.
        </p>
      }
    >
      <LoginForm nextPath="/account" resetUrl="https://buildsomethingpeoplewant.com/account" />
    </HallShell>
  );
}
