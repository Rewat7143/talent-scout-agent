'use client';

export default function Architecture() {
  return (
    <main className="page">
      <div className="container" style={{ maxWidth: 900 }}>
        <div className="section-header">
          <div>
            <h1 className="section-title">🏗️ Architecture & Scoring Logic</h1>
            <p className="section-subtitle">How TalentScout AI discovers, matches, and engages candidates</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <a href="https://talent-scout-agent-rho.vercel.app" target="_blank" rel="noopener noreferrer" className="btn btn-primary btn-sm">🌐 Live Demo</a>
            <a href="https://github.com/Rewat7143/talent-scout-agent" target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm">📦 GitHub Repo</a>
          </div>
        </div>

        {/* System Architecture Diagram */}
        <div className="card animate-in" style={{ marginBottom: 32, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🔄 System Architecture</h2>
          <div style={{ background: 'var(--bg-secondary)', borderRadius: 12, padding: 24, fontFamily: 'monospace', fontSize: 12, lineHeight: 2.2, overflow: 'auto' }}>
            <pre style={{ margin: 0, color: 'var(--text-secondary)' }}>{`
┌─────────────────────────────────────────────────────────────────┐
│  📋 JD Input (Recruiter pastes Job Description)                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  🧠 AI JD Parser (Groq Llama 3.3 / Gemini 2.0 Flash)         │
│  → Extracts: skills, experience, location, culture keywords    │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  🔍 GitHub API: Search 100K+ Real Developers                  │
│  → Query by language, followers, repos                         │
│  → Fetch profiles + repos → Extract skills from codebase       │
│  → Fallback: 50 synthetic candidates if API unavailable        │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  🎯 Scoring Engine (Match Score 0-100)                         │
│  → Text Similarity × 40 + Skill Overlap × 30                  │
│  → Preferred Skills × 10 + Experience Fit × 20                │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  📝 AI Explanation Generator (Top 10 candidates)               │
│  → Personalized match rationale for each candidate             │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  💬 Outreach Agent (Per-candidate, on-demand)                  │
│  → 6-turn simulated conversation (3 recruiter + 3 candidate)   │
│  → Candidate persona derived from profile + availability       │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  📊 Interest Scorer (0-100)                                    │
│  → Enthusiasm (25) + Availability (25)                         │
│  → Cultural Fit (25) + Specificity (25)                        │
│  → Combined Score = Match × 0.6 + Interest × 0.4              │
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────┐
│  📈 Dashboard: Table + Scatter Plot + Email Generator          │
│  → Ranked shortlist with explainable scoring                   │
│  → One-click bulk outreach for top 5 candidates                │
│  → Generated recruiter emails with match context               │
└─────────────────────────────────────────────────────────────────┘
`}</pre>
          </div>
        </div>

        {/* Agent Pipeline */}
        <div className="card animate-in animate-in-delay-1" style={{ marginBottom: 32, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🤖 Agent Pipeline Steps</h2>
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', justifyContent: 'center' }}>
            {[
              { step: '1', icon: '📋', title: 'JD Input', desc: 'Recruiter pastes job description', time: '~0s' },
              { step: '2', icon: '🧠', title: 'AI Parsing', desc: 'Groq/Gemini extracts skills & requirements', time: '~2s' },
              { step: '3', icon: '🔍', title: 'GitHub Search', desc: 'Search 100K+ real developer profiles', time: '~5s' },
              { step: '4', icon: '🎯', title: 'Scoring', desc: 'Match score via skill overlap + experience', time: '~1s' },
              { step: '5', icon: '💬', title: 'Outreach', desc: 'AI simulates multi-turn conversations', time: '~3s' },
              { step: '6', icon: '📊', title: 'Ranking', desc: 'Combined = Match×0.6 + Interest×0.4', time: '~0s' },
            ].map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 90, textAlign: 'center', padding: '16px 8px',
                  background: 'var(--bg-secondary)', borderRadius: 12, border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 28, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{s.title}</div>
                  <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{s.desc}</div>
                  <div style={{ fontSize: 10, color: 'var(--accent-light)', marginTop: 4 }}>{s.time}</div>
                </div>
                {i < 5 && <span style={{ color: 'var(--accent)', fontSize: 18, fontWeight: 700 }}>→</span>}
              </div>
            ))}
          </div>
        </div>

        {/* Scoring */}
        <div className="card animate-in animate-in-delay-2" style={{ marginBottom: 32, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>📐 Scoring Logic</h2>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 8 }}>Match Score (0–100)</h3>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
              Match Score =<br/>
              &nbsp;&nbsp;text_similarity(JD, candidate_profile) × <strong>40</strong><br/>
              &nbsp;&nbsp;+ jaccard(required_skills, candidate_skills) × <strong>30</strong><br/>
              &nbsp;&nbsp;+ jaccard(preferred_skills, candidate_skills) × <strong>10</strong><br/>
              &nbsp;&nbsp;+ experience_fit(jd_range, candidate_years) × <strong>20</strong>
            </div>
            <div style={{ marginTop: 12, fontSize: 13, color: 'var(--text-secondary)' }}>
              <strong>Experience Fit:</strong> Within range = 1.0 · ±1 year = 0.7 · ±2 years = 0.4 · &gt;2 outside = 0.1
            </div>
          </div>

          <div style={{ marginBottom: 24 }}>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 8 }}>Interest Score (0–100)</h3>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 13, lineHeight: 1.8 }}>
              Interest Score =<br/>
              &nbsp;&nbsp;enthusiasm (0-25) — excitement about the opportunity<br/>
              &nbsp;&nbsp;+ availability (0-25) — openness to move / next steps<br/>
              &nbsp;&nbsp;+ cultural_fit (0-25) — values alignment signals<br/>
              &nbsp;&nbsp;+ specificity (0-25) — engagement with role details
            </div>
          </div>

          <div>
            <h3 style={{ fontSize: 15, fontWeight: 600, color: 'var(--accent-light)', marginBottom: 8 }}>Combined Score (0–100)</h3>
            <div style={{ background: 'var(--bg-secondary)', padding: 16, borderRadius: 8, fontFamily: 'monospace', fontSize: 13 }}>
              Combined Score = (Match × <strong>0.6</strong>) + (Interest × <strong>0.4</strong>)
            </div>
          </div>
        </div>

        {/* Tech Stack */}
        <div className="card animate-in animate-in-delay-3" style={{ marginBottom: 32, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>🛠️ Tech Stack</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { label: 'Frontend', tech: 'Next.js 16 (App Router)', detail: 'React 19 + TypeScript' },
              { label: 'AI / LLM', tech: 'Groq Llama 3.3 70B', detail: 'Fallback: Gemini 2.0 Flash' },
              { label: 'Candidate Data', tech: 'GitHub REST API', detail: 'Real developer profiles & repos' },
              { label: 'Styling', tech: 'Custom CSS Design System', detail: 'Dark mode, glassmorphism, micro-animations' },
              { label: 'Deployment', tech: 'Vercel', detail: 'Serverless, Edge-optimized' },
              { label: 'Matching', tech: 'TF-IDF + Jaccard + NLP', detail: 'Skill overlap + text similarity + experience fit' },
            ].map((t, i) => (
              <div key={i} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 4 }}>{t.label}</div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{t.tech}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t.detail}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Key Differentiators */}
        <div className="card animate-in animate-in-delay-3" style={{ marginBottom: 32, padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>⚡ Key Differentiators</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { icon: '🔗', title: 'Real Data, Not Mocks', desc: 'Sources from 100K+ real GitHub developer profiles — not synthetic data' },
              { icon: '📊', title: 'Dual-Score Ranking', desc: 'Two-dimensional scoring: objective Match Score + conversational Interest Score' },
              { icon: '💬', title: 'Multi-Turn AI Outreach', desc: '6-turn simulated conversations that assess genuine candidate interest' },
              { icon: '🔍', title: 'Explainable AI', desc: 'Skill-by-skill breakdown, experience fit analysis, and AI-generated match rationale' },
              { icon: '⚡', title: 'Bulk Operations', desc: 'One-click outreach for top 5 candidates with aggregated interest summary' },
              { icon: '📧', title: 'Email Generation', desc: 'AI-crafted personalized recruiter emails with match context baked in' },
            ].map((d, i) => (
              <div key={i} style={{ padding: 16, background: 'var(--bg-secondary)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <span style={{ fontSize: 24 }}>{d.icon}</span>
                <div style={{ fontSize: 14, fontWeight: 600, marginTop: 4 }}>{d.title}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{d.desc}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Outreach Flow */}
        <div className="card animate-in animate-in-delay-3" style={{ padding: 28 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>💬 Simulated Outreach Flow</h2>
          <div style={{ position: 'relative', paddingLeft: 24 }}>
            <div style={{ position: 'absolute', left: 8, top: 0, bottom: 0, width: 2, background: 'var(--border)' }} />
            {[
              { role: 'Recruiter Agent', text: 'Introduce role, reference candidate background and GitHub activity', color: 'var(--accent)' },
              { role: 'Candidate (AI)', text: 'Responds in persona — enthusiasm varies by availability & profile signals', color: 'var(--success)' },
              { role: 'Recruiter Agent', text: 'Ask about current situation, career goals, and interest level', color: 'var(--accent)' },
              { role: 'Candidate (AI)', text: 'Share preferences, concerns, salary expectations, or excitement', color: 'var(--success)' },
              { role: 'Recruiter Agent', text: 'Close with specific role fit details and invite to next step', color: 'var(--accent)' },
              { role: 'Candidate (AI)', text: 'Final response — suggest meeting, ask questions, or politely decline', color: 'var(--success)' },
              { role: 'Interest Scorer', text: 'Analyzes all candidate responses → Interest Score (4 dimensions, 0-100)', color: 'var(--warning)' },
            ].map((step, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, marginBottom: 16, position: 'relative' }}>
                <div style={{
                  width: 12, height: 12, borderRadius: 6, background: step.color,
                  position: 'absolute', left: -21, top: 4, border: '2px solid var(--bg-card)',
                }} />
                <div>
                  <div style={{ fontSize: 12, fontWeight: 600, color: step.color }}>{step.role}</div>
                  <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{step.text}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
