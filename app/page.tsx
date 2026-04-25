'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const SAMPLE_JD = `We're looking for a Senior Full Stack Engineer to join our 15-person startup building the future of developer tools.

You'll build and ship features end-to-end across our React/TypeScript frontend and Node.js/PostgreSQL backend. We use GraphQL for our API layer and Docker for containerization.

Requirements:
- 5+ years of professional software engineering experience
- Strong proficiency in React, TypeScript, and Node.js
- Experience with PostgreSQL or similar relational databases
- Familiarity with cloud services (AWS preferred)
- Excellent communication skills

Nice to have:
- Experience with GraphQL
- Docker and CI/CD pipeline experience
- Contributions to open source

We value autonomy, fast iteration, and strong communication. Remote-friendly, US timezones preferred. Competitive salary + equity.`;

export default function Home() {
  const [jdText, setJdText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async () => {
    if (!jdText.trim() || jdText.trim().length < 20) {
      setError('Please enter a job description (at least 20 characters).');
      return;
    }
    setLoading(true);
    setError('');
    try {
      // Store JD in sessionStorage and navigate to dashboard
      sessionStorage.setItem('jd_text', jdText.trim());
      router.push('/dashboard');
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <div className="container">
        {/* Hero */}
        <section className="hero">
          <div className="hero-badge">⚡ AI-Powered Recruiting Agent</div>
          <h1>
            Find the <span className="gradient">Perfect Candidates</span>
            <br />in Seconds, Not Hours
          </h1>
          <p>
            Paste a job description and let our AI agent discover, match, and engage
            candidates — delivering a ranked shortlist scored on fit and genuine interest.
          </p>
        </section>

        {/* Resume Saved Session */}
        {typeof window !== 'undefined' && localStorage.getItem('talentscout_session') && (() => {
          try {
            const saved = JSON.parse(localStorage.getItem('talentscout_session')!);
            return (
              <section className="animate-in" style={{ maxWidth: 800, margin: '0 auto 24px' }}>
                <div className="card" style={{ padding: 20, border: '1px solid rgba(99,102,241,0.3)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>💾 Resume Previous Session</div>
                      <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 4 }}>
                        {saved.parsedJD?.title || 'Saved search'} — {saved.matches?.length || 0} candidates •
                        Saved {new Date(saved.savedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn btn-primary btn-sm" onClick={() => {
                        sessionStorage.setItem('jd_text', saved.jdText);
                        sessionStorage.setItem('talentscout_resume', JSON.stringify(saved));
                        router.push('/dashboard');
                      }}>▶ Resume</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => {
                        localStorage.removeItem('talentscout_session');
                        window.location.reload();
                      }}>🗑️</button>
                    </div>
                  </div>
                </div>
              </section>
            );
          } catch { return null; }
        })()}

        {/* JD Input */}
        <section className="animate-in" style={{ maxWidth: 800, margin: '0 auto' }}>
          <div className="card" style={{ padding: 32 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <h2 style={{ fontSize: 18, fontWeight: 600 }}>📋 Paste Your Job Description</h2>
              <button
                className="btn btn-ghost btn-sm"
                onClick={() => setJdText(SAMPLE_JD)}
                style={{ fontSize: 13 }}
              >
                Use Sample JD
              </button>
            </div>

            <textarea
              className="textarea"
              placeholder="Paste the full job description here...&#10;&#10;Include role title, required skills, experience level, and any other relevant details."
              value={jdText}
              onChange={(e) => { setJdText(e.target.value); setError(''); }}
              style={{ minHeight: 240 }}
            />

            {error && (
              <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>
                {error}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
              <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                {jdText.length > 0 ? `${jdText.split(/\s+/).filter(Boolean).length} words` : 'No text entered'}
              </span>
              <button
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={loading || jdText.trim().length < 20}
              >
                {loading ? (
                  <>
                    <span className="spinner" /> Processing...
                  </>
                ) : (
                  <>🚀 Discover Candidates</>
                )}
              </button>
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ marginTop: 80 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
            {[
              { icon: '🧠', title: 'Smart JD Parsing', desc: 'AI extracts skills, experience, culture keywords, and role requirements automatically.' },
              { icon: '🎯', title: 'Dual-Score Matching', desc: 'Candidates ranked by Match Score (skill fit) and Interest Score (engagement level).' },
              { icon: '💬', title: 'Simulated Outreach', desc: 'AI-powered conversations assess genuine candidate interest before you reach out.' },
              { icon: '📧', title: 'Email Draft Generation', desc: 'Get personalized, ready-to-send recruiter emails for your top candidates.' },
              { icon: '📊', title: 'Visual Analytics', desc: 'Scatter plots and score breakdowns help you spot the best candidates instantly.' },
              { icon: '🔍', title: 'Explainable Matching', desc: 'Every match comes with a plain-English explanation of why they fit.' },
            ].map((f, i) => (
              <div key={i} className={`card animate-in animate-in-delay-${(i % 3) + 1}`} style={{ padding: 24 }}>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{f.icon}</div>
                <h3 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{f.title}</h3>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
