import Link from "next/link";
export default function NotFound() {
  return <main id="main-content" className="not-found">
    <span className="eyebrow">CLAUSEOPS AI · 404</span>
    <h1>This record isn’t in the workspace.</h1>
    <p>The demo includes a small set of fictional contracts and obligations.</p>
    <Link className="button primary" href="/dashboard">Return to dashboard</Link>
  </main>;
}
