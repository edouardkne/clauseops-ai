import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "ClauseOps AI — Executable compliance", template: "%s | ClauseOps AI" },
  description: "From legal obligations to executable compliance. A demo workspace for traceable obligations, evidence, and compliance operations.",
};
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (<html lang="en">
    <body>
      <a href="#main-content" className="skip-link">Skip to content</a>{children}</body>
  </html>);
}
