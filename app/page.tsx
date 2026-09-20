import Link from "next/link";
import { Brand, StatusBadge } from "@/components/ui";
import { Icon, type IconName } from "@/components/icon";
import { disclaimer, obligations, summary } from "@/mock-data";
const pillars: {
  number: string;
  title: string;
  question: string;
  description: string;
  icon: IconName;
}[] = [
    { number: "01", title: "Understand", question: "What does this document require?", description: "Bring obligations out of dense documents and into a structured view, with the original clause always close at hand.", icon: "file" },
    { number: "02", title: "Execute", question: "Who must do what, and when?", description: "Turn requirements into clear responsibilities, deadlines, and practical actions your team can track.", icon: "check" },
    { number: "03", title: "Verify", question: "What evidence proves completion?", description: "Connect actions to supporting records. See what is available, what needs review, and what is still missing.", icon: "shield" },
    { number: "04", title: "Prove", question: "Can the state be independently verified?", description: "Build toward a traceable compliance record, with a separate layer for future independent verification.", icon: "link" },
  ];
export default function Home() {
  return <div className="landing">
    <header className="landing-header">
      <div className="landing-nav">
        <Brand />
        <nav aria-label="Main navigation">
          <a href="#how-it-works">How it works</a>
          <a href="#built-for-you">Who it’s for</a>
          <Link href="/dashboard">Product demo</Link>
        </nav>
        <Link className="button primary compact" href="/contracts/upload">Analyze a contract <Icon name="arrow" size={16} />
        </Link>
      </div>
    </header>
    <main id="main-content">
      <section className="hero">
        <div className="hero-copy">
          <div className="hero-label">
            <span /> LEGALTECH / REGTECH, MADE ACTIONABLE</div>
          <h1>From legal obligations to <span>executable compliance.</span>
          </h1>
          <p>Contracts shouldn’t end in a folder. Turn agreements into clear obligations, accountable actions, and evidence you can trace.</p>
          <div className="hero-actions">
            <Link className="button primary large" href="/contracts/upload">Analyze a contract <Icon name="arrow" size={18} />
            </Link>
            <Link className="button secondary large" href="/dashboard">
              <span className="play-icon">▶</span> View demo</Link>
          </div>
          <div className="hero-footnote">
            <Icon name="shield" size={15} />
            <span>Frontend demo · No sign-up required · No document upload</span>
          </div>
        </div>
        <div className="product-preview" aria-label="Illustrative ClauseOps product preview">
          <div className="preview-topbar">
            <span className="preview-dots">
              <i />
              <i />
              <i />
            </span>
            <span>ClauseOps workspace</span>
            <span className="badge violet">Demo</span>
          </div>
          <div className="preview-body">
            <div className="preview-rail">
              <Icon name="shield" size={23} />
              <span className="selected">
                <Icon name="grid" size={18} />
              </span>
              <Icon name="file" size={18} />
              <Icon name="check" size={18} />
              <Icon name="calendar" size={18} />
            </div>
            <div className="preview-content">
              <div className="preview-heading">
                <div>
                  <span>WORKSPACE OVERVIEW</span>
                  <h2>Clarity at a glance.</h2>
                </div>
                <span className="avatar small">AO</span>
              </div>
              <div className="preview-stats">
                <div>
                  <span>Obligations</span>
                  <strong>{summary.total}<small>across 4 documents</small>
                  </strong>
                </div>
                <div>
                  <span>Completed</span>
                  <strong>{summary.completed}<small>with reviewed evidence</small>
                  </strong>
                </div>
                <div>
                  <span>Overdue</span>
                  <strong className="text-red">{summary.overdue}<small>needs attention</small>
                  </strong>
                </div>
              </div>
              <div className="preview-document">
                <span className="file-icon">
                  <Icon name="file" />
                </span>
                <div>
                  <strong>Grant_Agreement.pdf</strong>
                  <small>Ubuntu Community Foundation</small>
                </div>
                <StatusBadge status="Active" />
              </div>
              <div className="preview-table-heading">
                <span>OBLIGATION</span>
                <span>STATUS</span>
              </div>{obligations.slice(0, 3).map(o => <div key={o.id} className="preview-obligation">
                <span>{o.title}</span>
                <StatusBadge status={o.status} />
              </div>)}<div className="preview-source">
                <Icon name="link" size={16} />
                <span>Every obligation connected to its source.</span>
              </div>
            </div>
          </div>
          <div className="preview-caption">
            <span className="icon-tile green">
              <Icon name="check" size={17} />
            </span>
            <div>
              <strong>From clause to clear next step</strong>
              <span>Source → Action → Evidence</span>
            </div>
          </div>
        </div>
      </section>
      <section className="audience-strip" id="built-for-you">
        <p>BUILT FOR TEAMS WITH REAL RESPONSIBILITIES</p>
        <div>
          <span>Small businesses</span>
          <span>NGOs & foundations</span>
          <span>Freelancers</span>
          <span>Legal & compliance teams</span>
          <span>Service providers</span>
        </div>
      </section>
      <section id="how-it-works" className="landing-section">
        <div className="section-intro">
          <span className="eyebrow">ONE CONNECTED WORKFLOW</span>
          <h2>The agreement is just the beginning.</h2>
          <p>Bridge the gap between what a document says and what your team does next.</p>
        </div>
        <div className="workflow">{([['Contract', 'file'], ['Obligations', 'check'], ['Actions', 'calendar'], ['Evidence', 'shield'], ['Compliance', 'chart']] as [
          string,
          IconName
        ][]).map(([label, icon], i) => <div key={label}>
          <span className="workflow-step">
            <Icon name={icon} size={22} />
            <strong>{label}</strong>
            <small>0{i + 1}</small>
          </span>{i < 4 && <span className="workflow-arrow">
            <Icon name="arrow" size={20} />
          </span>}</div>)}</div>
        <div className="pillar-grid">{pillars.map(p => <article key={p.number}>
          <div className="pillar-top">
            <span className="icon-tile violet">
              <Icon name={p.icon} size={22} />
            </span>
            <span>{p.number}</span>
          </div>
          <h3>{p.title}</h3>
          <strong>{p.question}</strong>
          <p>{p.description}</p>
        </article>)}</div>
      </section>
      <section className="trust-section">
        <div>
          <span className="eyebrow">CLARITY WITHOUT BLACK BOXES</span>
          <h2>A clear source.<br />A traceable next step.</h2>
          <p>Designed for SMEs, grant-funded organisations, and lean teams that need a practical way to stay on top of their commitments.</p>
          <Link className="text-link" href="/obligations/demo">Explore a traceable obligation <Icon name="arrow" size={17} />
          </Link>
        </div>
        <div className="trust-list">{[["Source stays visible", "Return to the exact clause and page behind each obligation."], ["Interpretation stays reviewable", "Treat AI suggestions as a separate layer that needs human judgment."], ["Progress stays accountable", "Distinguish tracking status, supporting evidence, and future verification."]].map(([title, text]) => <div key={title}>
          <span className="trust-check">
            <Icon name="check" size={18} />
          </span>
          <div>
            <h3>{title}</h3>
            <p>{text}</p>
          </div>
        </div>)}</div>
      </section>
      <section className="landing-cta">
        <span className="eyebrow">UNDERSTAND → EXECUTE → VERIFY → PROVE</span>
        <h2>Your next step starts with clarity.</h2>
        <p>Explore a more connected way to manage obligations.</p>
        <Link className="button primary large" href="/dashboard">Explore the workspace <Icon name="arrow" size={18} />
        </Link>
        <small>Built for the BLI Legal Tech Hackathon 2 · Phase 1 prototype</small>
      </section>
    </main>
    <footer className="landing-footer">
      <div>
        <Brand />
        <span>From legal obligations to executable compliance.</span>
      </div>
      <p>{disclaimer}</p>
      <div className="footer-bottom">
        <span>© 2026 ClauseOps AI. Frontend prototype.</span>
        <Link href="/settings">Demo capabilities & limitations <Icon name="arrow" size={14} />
        </Link>
      </div>
    </footer>
  </div>;
}
