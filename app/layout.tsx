import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TalentScout AI — Intelligent Candidate Discovery & Engagement",
  description: "AI-powered talent scouting agent that parses job descriptions, discovers matching candidates, simulates outreach conversations, and delivers a ranked shortlist scored on Match and Interest.",
  keywords: ["AI recruiting", "talent scouting", "candidate matching", "HR tech"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <header className="header">
          <div className="header-inner">
            <a href="/" className="logo" style={{ textDecoration: 'none' }}>
              <span className="logo-icon">🎯</span>
              TalentScout AI
            </a>
            <nav className="nav">
              <a href="/" className="nav-link">Home</a>
              <a href="/architecture" className="nav-link">Architecture</a>
            </nav>
          </div>
        </header>
        {children}
      </body>
    </html>
  );
}
