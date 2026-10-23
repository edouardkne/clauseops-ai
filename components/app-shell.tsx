
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

import { Brand } from "./ui";
import { Icon, type IconName } from "./icon";
import { WorkflowNav } from "./workflow-nav";
import { disclaimer } from "@/mock-data";
import { signOut } from "@/app/auth/actions";

type WorkspaceAccount = {
  email: string;
  fullName: string | null;
  organization: string | null;
};

const navigation: {
  href: string;
  label: string;
  icon: IconName;
}[] = [
  { href: "/dashboard", label: "Dashboard", icon: "grid" },
  { href: "/contracts", label: "My Contracts", icon: "file" },
  { href: "/obligations", label: "Obligations", icon: "check" },
  { href: "/calendar", label: "Calendar", icon: "calendar" },
  { href: "/evidence", label: "Evidence Vault", icon: "shield" },
  { href: "/assistant", label: "AI Assistant", icon: "spark" },
  { href: "/reports", label: "Reports", icon: "chart" },
  { href: "/settings", label: "Settings", icon: "settings" },
];

function getInitials(account: WorkspaceAccount) {
  const name = account.fullName?.trim();

  if (name) {
    const parts = name.split(/\s+/);

    return parts
      .slice(0, 2)
      .map((part) => part.charAt(0))
      .join("")
      .toUpperCase();
  }

  return account.email.slice(0, 2).toUpperCase();
}

export function AppSidebar({
  close,
  account,
}: {
  close: () => void;
  account: WorkspaceAccount;
}) {
  const path = usePathname();

  const accountName =
    account.fullName?.trim() || account.email;

  return (
    <aside className="sidebar" id="app-navigation">
      <Brand />

      <div className="workspace">
        <span className="workspace-avatar">
          {getInitials(account)}
        </span>

        <div>
          <strong>
            {account.organization || "Your workspace"}
          </strong>
          <small>Signed in · Analysis not saved</small>
        </div>
      </div>

      <div className="nav-caption">YOUR DOCUMENT</div>

      <nav aria-label="Current document">
        {[
          {
            href: "/contracts/upload",
            label: "Contract & obligations",
            icon: "file" as IconName,
          },
          ...navigation.filter((item) =>
            ["/evidence", "/assistant", "/settings"].includes(
              item.href
            )
          ),
        ].map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={close}
            className={`nav-link ${
              path === item.href ? "active" : ""
            }`}
            aria-current={
              path === item.href ? "page" : undefined
            }
          >
            <Icon name={item.icon} />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <details className="sample-navigation">
        <summary>Sample workspace · Fictional</summary>

        <nav aria-label="Fictional sample workspace">
          {navigation
            .filter(
              (item) =>
                ![
                  "/evidence",
                  "/assistant",
                  "/settings",
                ].includes(item.href)
            )
            .map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={close}
                className={`nav-link ${
                  path.startsWith(item.href) ? "active" : ""
                }`}
                aria-current={
                  path.startsWith(item.href)
                    ? "page"
                    : undefined
                }
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
              </Link>
            ))}
        </nav>
      </details>

      <div className="sidebar-bottom">
        <div className="phase-card">
          <Icon name="spark" size={19} />

          <strong>Clarity. Then action.</strong>

          <p>
            Your compliance workspace, connected from clause
            to evidence.
          </p>

          <Link href="/contracts/upload" onClick={close}>
            Analyze a contract
            <Icon name="arrow" size={15} />
          </Link>
        </div>

        <div className="sidebar-user">
          <span className="avatar">
            {getInitials(account)}
          </span>

          <div className="min-w-0">
            <strong className="block truncate">
              {accountName}
            </strong>

            <small className="block truncate">
              {account.email}
            </small>
          </div>
        </div>

        <form action={signOut}>
          <button
            type="submit"
            className="mt-3 w-full rounded-lg border border-white/20 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}

export function AppHeader({
  open,
  toggle,
  account,
}: {
  open: boolean;
  toggle: () => void;
  account: WorkspaceAccount;
}) {
  const path = usePathname();

  const label =
    navigation.find((item) =>
      path.startsWith(item.href)
    )?.label || "Workspace";

  return (
    <header className="app-header">
      <div className="header-breadcrumb">
        <button
          className="icon-button mobile-toggle"
          onClick={toggle}
          aria-label={
            open ? "Close navigation" : "Open navigation"
          }
          aria-expanded={open}
          aria-controls="app-navigation"
        >
          <Icon name={open ? "close" : "menu"} />
        </button>

        <span>Workspace</span>
        <span className="breadcrumb-slash">/</span>
        <strong>{label}</strong>
      </div>

      <div className="header-right">
        <span className="demo-pill">
          <span />
          {path === "/settings"
            ? "Capabilities"
            : [
                "/contracts/upload",
                "/assistant",
                "/evidence",
              ].includes(path)
            ? "Session intelligence"
            : "Fictional sample"}
        </span>

        <span className="header-divider" />

        <span className="avatar small">
          {getInitials(account)}
        </span>
      </div>
    </header>
  );
}

export function AppShell({
  children,
  account,
}: {
  children: React.ReactNode;
  account: WorkspaceAccount;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className={`app-shell ${open ? "nav-open" : ""}`}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          setOpen(false);
        }
      }}
    >
      <AppSidebar
        account={account}
        close={() => setOpen(false)}
      />

      <div className="app-body">
        <AppHeader
          account={account}
          open={open}
          toggle={() => setOpen(!open)}
        />

        <main id="main-content" className="app-main">
          <WorkflowNav />
          {children}
        </main>

        <footer className="app-footer">
          <span>{disclaimer}</span>
          <span>
            Memory-only analysis session · Unsaved work may
            be lost on refresh
          </span>
        </footer>
      </div>
    </div>
  );
}
