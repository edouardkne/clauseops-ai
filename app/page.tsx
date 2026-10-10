import Link from "next/link";
import { Brand } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { disclaimer } from "@/mock-data";
const pillars: { title: string; icon: IconName; description: string; state: string }[] = [
  { title: "Understand", icon: "file", description: "Extract obligations from a text-readable PDF. Trace each interpretation to a page and supporting quote.", state: "AI analysis · On request" },
  { title: "Execute", icon: "check", description: "Review uncertain interpretations, identify responsibilities and track actions with deterministic operational statuses.", state: "Obligation intelligence · Local" },
  { title: "Verify", icon: "shield", description: "Add evidence, inspect proposed matches and decide which documents to associate with an obligation.", state: "Evidence intelligence · On request" },
  { title: "Prove", icon: "link", description: "Prepare a traceable record of sources, decisions and evidence. Independent verification is a future layer.", state: "Independent verification · Upcoming" },
];
export default function Home() {
  return <div className="landing consolidated-landing">
    <header className="landing-header"><div className="landing-nav"><Brand /><nav aria-label="Main navigation"><a href="#how-it-works">Workflow</a><a href="#built-for-you">For your team</a><Link href="/settings">Capabilities</Link></nav><Link href="/contracts/upload" className="button primary compact">Analyze a contract <Icon name="arrow" size={16} /></Link></div></header>
    <main id="main-content">
      <section className="hero">
        <div className="hero-copy"><div className="hero-label"><span /> LEGALTECH / REGTECH</div>
          <h1>From legal obligations to <span>executable compliance.</span></h1>
          <p>Upload a contract. Find what needs to happen. Trace AI interpretations to the source, review uncertainty, and connect the evidence behind each action.</p>
          <div className="hero-actions"><Link className="button primary large" href="/contracts/upload">Analyze a contract <Icon name="arrow" size={18} /></Link><a className="button secondary large" href="#how-it-works">Explore the workflow</a></div>
          <div className="hero-footnote"><Icon name="shield" size={16} /><span>PDF stays local · AI runs on request · Session-only tracking</span></div>
        </div>
        <div className="source-preview" aria-label="Illustrative example of the real source-to-action workflow">
          <div className="source-preview-bar"><Brand /><span className="badge neutral">Illustrative example</span></div>
          <div className="source-preview-heading"><span className="eyebrow">ONE CLAUSE. A CLEAR NEXT STEP.</span><h2>Keep the source in sight.</h2></div>
          <div className="source-preview-clause"><span className="eyebrow">SOURCE · PAGE 3</span><blockquote>“The supplier shall submit a monthly service report.”</blockquote><span className="small-muted">Example wording, not an uploaded document.</span></div>
          <div className="source-preview-action"><span className="eyebrow">AI INTERPRETATION</span><h3>Submit the service report</h3><p>Owner: Supplier · Recurrence: Monthly</p><span className="badge blue">Direct</span></div>
          <div className="source-preview-bottom"><div><span className="eyebrow">HUMAN REVIEW</span><p>Confirm scope and timing</p></div><div><span className="eyebrow">OPERATIONAL STATE</span><span className="badge amber">Needs Review</span></div></div>
          <div className="source-preview-caption"><Icon name="link" size={17} /> Evidence matches are proposals. You decide what to accept.</div>
        </div>
      </section>
      <section className="audience-strip" id="built-for-you"><p>FOR TEAMS WITH REAL RESPONSIBILITIES</p><div><span>SMEs</span><span>NGOs & grant-funded teams</span><span>Freelancers</span><span>Legal & compliance teams</span><span>Service providers</span></div></section>
      <section id="how-it-works" className="landing-section"><div className="section-intro"><span className="eyebrow">UNDERSTAND → EXECUTE → VERIFY → PROVE</span><h2>A working path from clause to evidence.</h2><p>AI helps interpret. You review. ClauseOps tracks the operational state.</p></div>
        <ol className="landing-workflow">{["Add contract", "Analyze on request", "Review obligations", "Connect evidence", "Track & ask"].map((step,i)=><li key={step}><span>0{i+1}</span>{step}</li>)}</ol>
        <div className="pillar-grid">{pillars.map((p,i)=><article key={p.title}><div className="pillar-top"><span className="icon-tile violet"><Icon name={p.icon} size={22}/></span><span>0{i+1}</span></div><h3>{p.title}</h3><p>{p.description}</p><strong className="capability-state">{p.state}</strong></article>)}</div>
      </section>
      <section className="trust-section"><div><span className="eyebrow">REVIEWABLE BY DESIGN</span><h2>The facts, the interpretation,<br/>and your decisions.</h2><p>Keep these layers separate, from the first contract clause to the last evidence association. A matched quote is a text check, not a legal verdict.</p><Link className="text-link" href="/contracts/upload">Start with your document <Icon name="arrow" size={17}/></Link></div><div className="trust-list">{[["Sources you can inspect","Quotes are checked against the cited extracted page. Unverified sources stay visibly flagged."],["Decisions you control","Accept, reject or review evidence suggestions. AI cannot silently complete a task."],["A clear privacy boundary","PDF extraction runs locally. Text is sent for AI only on your request; session data clears on refresh."],["Answers without another AI call","Ask supported structured questions about obligations, sources and evidence using the local assistant."]].map(([title,copy])=><div key={title}><span className="trust-check"><Icon name="check" size={18}/></span><div><h3>{title}</h3><p>{copy}</p></div></div>)}</div></section>
      <section className="landing-cta"><span className="eyebrow">YOUR DOCUMENT. YOUR NEXT ACTION.</span><h2>Make the obligations visible.</h2><p>Start with a text-readable PDF. No account required.</p><Link className="button primary large" href="/contracts/upload">Analyze a contract <Icon name="arrow" size={18}/></Link><small>Built for the BLI Legal Tech Hackathon 2 · No persistent storage or independent verification yet</small></section>
    </main>
    <footer className="landing-footer"><div><Brand/><span>From legal obligations to executable compliance.</span></div><p>{disclaimer}</p><div className="footer-bottom"><span>© 2026 ClauseOps AI</span><Link href="/settings">Capabilities & limitations <Icon name="arrow" size={14}/></Link></div></footer>
  </div>;
}
