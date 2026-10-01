import type { Metadata } from "next";
import type { ReactNode } from "react";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ClauseOps AI — Executable compliance",
    template: "%s | ClauseOps AI",
  },
  description:
    "From legal obligations to executable compliance. A workspace for traceable obligations, evidence, and compliance operations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <a
          href="#main-content"
          className="skip-link"
        >
          Skip to content
        </a>

        {children}
      </body>
    </html>
  );
}