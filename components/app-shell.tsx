"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Brand } from "./ui";
import { Icon, type IconName } from "./icon";
import { disclaimer } from "@/mock-data";
const navigation: {
  href: string;
  label: string;
  icon: IconName;
}[] = [
    { href: "/dashboard", label: "Dashboard", icon: "grid" }, { href: "/contracts", label: "My Contracts", icon: "file" },
    { href: "/obligations", label: "Obligations", icon: "check" }, { href: "/calendar", label: "Calendar", icon: "calendar" },
    { href: "/evidence", label: "Evidence Vault", icon: "shield" }, { href: "/assistant", label: "AI Assistant", icon: "spark" },
    { href: "/reports", label: "Reports", icon: "chart" }, { href: "/settings", label: "Settings", icon: "settings" },
  ];
export function AppSidebar({ close }: {
  close: () => void;
}) {
  const path = usePathname(); return <aside className="sidebar" id="app-navigation">
    <Brand />
    <div className="workspace">
      <span className="workspace-avatar">UC</span>
      <div>
        <strong>Ubuntu Community</strong>
        <small>Demo workspace</small>
      </div>
    </div>
    <div className="nav-caption">WORKSPACE</div>
    <nav aria-label="Application">{navigation.map(n => <Link key={n.href} href={n.href} onClick={close} className={`nav-link ${path.startsWith(n.href) ? "active" : ""}`} aria-current={path.startsWith(n.href) ? "page" : undefined}>
      <Icon name={n.icon} />
      <span>{n.label}</span>{n.label === "AI Assistant" && <span className="nav-new">DEMO</span>}</Link>)}</nav>
    <div className="sidebar-bottom">
      <div className="phase-card">
        <Icon name="spark" size={19} />
        <strong>Clarity. Then action.</strong>
        <p>Your compliance workspace, connected from clause to evidence.</p>
        <Link href="/contracts/demo" onClick={close}>Explore the demo <Icon name="arrow" size={15} />
        </Link>
      </div>
      <div className="sidebar-user">
        <span className="avatar">AO</span>
        <div>
          <strong>Amara Okafor</strong>
          <small>Workspace administrator</small>
        </div>
      </div>
    </div>
  </aside>;
}
export function AppHeader({ open, toggle }: {
  open: boolean;
  toggle: () => void;
}) {
  const path = usePathname(); const label = navigation.find(n => path.startsWith(n.href))?.label || "Workspace"; return <header className="app-header">
    <div className="header-breadcrumb">
      <button className="icon-button mobile-toggle" onClick={toggle} aria-label={open ? "Close navigation" : "Open navigation"} aria-expanded={open} aria-controls="app-navigation">
        <Icon name={open ? "close" : "menu"} />
      </button>
      <span>Workspace</span>
      <span className="breadcrumb-slash">/</span>
      <strong>{label}</strong>
    </div>
    <div className="header-right">
      <span className="demo-pill">
        <span /> Demo mode</span>
      <span className="header-divider" />
      <span className="avatar small">AO</span>
    </div>
  </header>;
}
export function AppShell({ children }: {
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false); return <div className={`app-shell ${open ? "nav-open" : ""}`} onKeyDown={e => {
    if(e.key === "Escape")
      setOpen(false);
  }}>
    <AppSidebar close={() => setOpen(false)} />
    <div className="app-body">
      <AppHeader open={open} toggle={() => setOpen(!open)} />
      <main id="main-content" className="app-main">{children}</main>
      <footer className="app-footer">
        <span>{disclaimer}</span>
        <span>Phase 1 · Frontend demo</span>
      </footer>
    </div>
  </div>;
}
