import Link from "next/link";

export default function NotFound() {
  return (
    <article className="prose">
      <h1>Not found</h1>
      <p>That URL is not in the agent catalog. It may be a typo, an unpublished draft, or a page we never had.</p>
      <h2>Recover</h2>
      <ul>
        <li><Link href="/products">All products</Link></li>
        <li><Link href="/">Home</Link></li>
        <li><Link href="/for-agents">Build Something Agents Want developer resources</Link></li>
      </ul>
      <h3>Agents</h3>
      <p>Markdown 404s are also served when you send Accept: text/markdown. Try /products/chatgpt.</p>
    </article>
  );
}
