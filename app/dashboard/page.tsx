'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import type { ParsedJD, MatchResult } from '../lib/types';

function ScoreCircle({ score, color, size = 48 }: { score: number; color: string; size?: number }) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <div className="score-circle" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} className="score-circle-bg" />
        <circle cx={size/2} cy={size/2} r={r} className="score-circle-fill"
          style={{ stroke: color, strokeDasharray: circ, strokeDashoffset: offset }} />
      </svg>
      <span className="score-circle-text" style={{ fontSize: size * 0.26 }}>{score}</span>
    </div>
  );
}

function ScatterPlot({ matches, onSelect }: { matches: MatchResult[]; onSelect: (m: MatchResult) => void }) {
  const hasOutreach = matches.some(m => m.interest_score !== null);
  return (
    <div className="scatter-plot" style={{ padding: '30px 50px 50px 60px', minHeight: 350 }}>
      <span className="scatter-axis-label scatter-x-label">Match Score →</span>
      <span className="scatter-axis-label scatter-y-label">{hasOutreach ? 'Interest Score →' : 'Candidates (run outreach to plot Y-axis) →'}</span>
      {/* Grid lines */}
      {[20,40,60,80].map(v => (
        <div key={`h${v}`} className="scatter-grid-line scatter-grid-h"
          style={{ bottom: `${((v/100)*70)+15}%` }}>
          <span style={{ position:'absolute', left:-40, fontSize:10, color:'var(--text-muted)' }}>{v}</span>
        </div>
      ))}
      {[20,40,60,80].map(v => (
        <div key={`v${v}`} className="scatter-grid-line scatter-grid-v"
          style={{ left: `${((v/100)*85)+10}%` }}>
          <span style={{ position:'absolute', bottom:-20, fontSize:10, color:'var(--text-muted)' }}>{v}</span>
        </div>
      ))}
      {/* All candidates */}
      {matches.map((m) => {
        const hasInterest = m.interest_score !== null;
        const yPos = hasInterest
          ? `${(((m.interest_score||0)/100)*70)+15}%`
          : `${15 + Math.random() * 10}%`; // Scatter near bottom if no interest score
        return (
          <div key={m.candidate_id} className="scatter-dot tooltip-container"
            onClick={() => onSelect(m)}
            style={{
              left: `${((m.match_score/100)*85)+10}%`,
              bottom: yPos,
              backgroundColor: m.avatar_color,
              opacity: hasInterest ? 1 : 0.35,
              width: hasInterest ? 14 : 10,
              height: hasInterest ? 14 : 10,
              border: hasInterest ? '2px solid rgba(255,255,255,0.5)' : '1px solid rgba(255,255,255,0.15)',
            }}>
            <div className="tooltip">
              {m.candidate_name} — Match: {m.match_score}
              {hasInterest ? `, Interest: ${m.interest_score}, Combined: ${m.combined_score}` : ' (run outreach for interest score)'}
            </div>
          </div>
        );
      })}
      {/* Legend */}
      <div style={{ position: 'absolute', top: 12, right: 16, display: 'flex', gap: 16, fontSize: 11, color: 'var(--text-muted)' }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)', opacity: 1 }} /> Outreached
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--text-muted)', opacity: 0.4 }} /> Match Only
        </span>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const router = useRouter();
  const [jdText, setJdText] = useState('');
  const [parsedJD, setParsedJD] = useState<ParsedJD | null>(null);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [stage, setStage] = useState<'init'|'loading'|'parsing'|'searching'|'scoring'|'explaining'|'done'>('init');
  const [activeTab, setActiveTab] = useState<'table'|'chart'>('table');
  const [selectedCandidate, setSelectedCandidate] = useState<MatchResult | null>(null);
  const [outreachLoading, setOutreachLoading] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>({});
  const [emailLoading, setEmailLoading] = useState<string | null>(null);
  const [dataSource, setDataSource] = useState<'github' | 'synthetic'>('github');
  const [bulkOutreachActive, setBulkOutreachActive] = useState(false);
  const [bulkProgress, setBulkProgress] = useState(0);
  const [pipelineStartTime] = useState(Date.now());
  const [stageStartTime, setStageStartTime] = useState(Date.now());
  const [stageTimes, setStageTimes] = useState<Record<string, number>>({});
  const [showFilters, setShowFilters] = useState(false);
  const [filterLocation, setFilterLocation] = useState('');
  const [filterMinExp, setFilterMinExp] = useState(0);
  const [filterMaxExp, setFilterMaxExp] = useState(20);
  const [filterAvailability, setFilterAvailability] = useState<string[]>([]);
  const [filterMinScore, setFilterMinScore] = useState(0);
  const [filterSkill, setFilterSkill] = useState('');
  const [sortBy, setSortBy] = useState<'match'|'interest'|'combined'|'experience'>('match');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompare, setShowCompare] = useState(false);

  // Load JD from session
  useEffect(() => {
    // Check for resumed session first
    const resumeData = sessionStorage.getItem('talentscout_resume');
    if (resumeData) {
      try {
        const saved = JSON.parse(resumeData);
        sessionStorage.removeItem('talentscout_resume');
        setJdText(saved.jdText || '');
        setParsedJD(saved.parsedJD || null);
        setMatches(saved.matches || []);
        setDataSource(saved.dataSource || 'github');
        setEmailDrafts(saved.emailDrafts || {});
        setStage('done');
        return;
      } catch { /* fall through to normal load */ }
    }
    const jd = sessionStorage.getItem('jd_text');
    if (!jd) { router.push('/'); return; }
    setJdText(jd);
    runPipeline(jd);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const advanceStage = (next: typeof stage) => {
    setStageTimes(prev => ({ ...prev, [stage]: Date.now() - stageStartTime }));
    setStageStartTime(Date.now());
    setStage(next);
  };

  const runPipeline = async (jd: string) => {
    try {
      setStage('parsing');
      setStageStartTime(Date.now());
      const parseRes = await fetch('/api/jd/parse', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jd }),
      });
      if (!parseRes.ok) throw new Error('Failed to parse JD');
      const { parsed_jd } = await parseRes.json();
      setParsedJD(parsed_jd);

      advanceStage('searching');
      const matchRes = await fetch('/api/candidates/match', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parsed_jd, jd_text: jd, source: 'github', top_n: 30 }),
      });
      if (!matchRes.ok) throw new Error('Failed to match candidates');
      const matchData = await matchRes.json();
      setMatches(matchData.matches);
      setDataSource(matchData.source || 'github');
      advanceStage('done');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pipeline failed');
      setStage('done');
    }
  };

  const runOutreach = useCallback(async (candidate: MatchResult) => {
    if (!parsedJD) return;
    setOutreachLoading(candidate.candidate_id);
    try {
      const res = await fetch('/api/outreach/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidate, parsed_jd: parsedJD }),
      });
      if (!res.ok) throw new Error('Outreach failed');
      const data = await res.json();
      setMatches(prev => {
        const updated = prev.map(m => {
          if (m.candidate_id !== candidate.candidate_id) return m;
          return { ...m, conversation: data.conversation, interest_score: data.interest_score,
            interest_breakdown: data.interest_breakdown, combined_score: data.combined_score };
        });
        updated.sort((a, b) => (b.combined_score ?? b.match_score) - (a.combined_score ?? a.match_score));
        updated.forEach((m, i) => { m.rank = i + 1; });
        return updated;
      });
    } catch (err) { console.error(err); }
    setOutreachLoading(null);
  }, [parsedJD]);

  const runBulkOutreach = useCallback(async () => {
    if (!parsedJD || bulkOutreachActive) return;
    setBulkOutreachActive(true);
    setBulkProgress(0);
    const top5 = matches.filter(m => m.interest_score === null).slice(0, 5);
    for (let i = 0; i < top5.length; i++) {
      await runOutreach(top5[i]);
      setBulkProgress(i + 1);
    }
    setBulkOutreachActive(false);
  }, [parsedJD, matches, bulkOutreachActive, runOutreach]);

  const generateEmail = useCallback(async (candidate: MatchResult) => {
    if (!parsedJD) return;
    setEmailLoading(candidate.candidate_id);
    try {
      const res = await fetch('/api/outreach/email-draft', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          job_title: parsedJD.title, job_summary: parsedJD.role_summary,
          candidate_name: candidate.candidate_name, candidate_title: candidate.candidate_title,
          matching_skills: candidate.matching_skills, match_explanation: candidate.match_explanation,
        }),
      });
      if (!res.ok) throw new Error('Email draft failed');
      const { email_draft } = await res.json();
      setEmailDrafts(prev => ({ ...prev, [candidate.candidate_id]: email_draft }));
    } catch (err) { console.error(err); }
    setEmailLoading(null);
  }, [parsedJD]);

  const scoreColor = (s: number) => s >= 70 ? 'var(--success)' : s >= 50 ? 'var(--warning)' : 'var(--danger)';
  const scoreBadgeClass = (s: number) => s >= 70 ? 'badge-success' : s >= 50 ? 'badge-warning' : 'badge-danger';

  // All hooks must be called before any early returns (React Rules of Hooks)
  const outreachedCount = matches.filter(m => m.interest_score !== null).length;
  const avgMatch = matches.length ? Math.round(matches.reduce((s,m) => s + m.match_score, 0) / matches.length) : 0;
  const topCombined = matches.find(m => m.combined_score !== null)?.combined_score || 0;

  const filteredMatches = useMemo(() => {
    let result = [...matches];
    if (filterLocation.trim()) {
      const loc = filterLocation.toLowerCase();
      result = result.filter(m => m.candidate_location.toLowerCase().includes(loc));
    }
    if (filterMinExp > 0) result = result.filter(m => m.candidate_experience >= filterMinExp);
    if (filterMaxExp < 20) result = result.filter(m => m.candidate_experience <= filterMaxExp);
    if (filterAvailability.length > 0) result = result.filter(m => filterAvailability.includes(m.candidate_availability));
    if (filterMinScore > 0) result = result.filter(m => m.match_score >= filterMinScore);
    if (filterSkill.trim()) {
      const sk = filterSkill.toLowerCase();
      result = result.filter(m => m.candidate_skills.some(s => s.toLowerCase().includes(sk)));
    }
    result.sort((a, b) => {
      if (sortBy === 'interest') return (b.interest_score ?? -1) - (a.interest_score ?? -1);
      if (sortBy === 'combined') return (b.combined_score ?? b.match_score) - (a.combined_score ?? a.match_score);
      if (sortBy === 'experience') return b.candidate_experience - a.candidate_experience;
      return b.match_score - a.match_score;
    });
    return result;
  }, [matches, filterLocation, filterMinExp, filterMaxExp, filterAvailability, filterMinScore, filterSkill, sortBy]);

  const activeFiltersCount = [filterLocation, filterSkill].filter(Boolean).length +
    (filterMinExp > 0 ? 1 : 0) + (filterMaxExp < 20 ? 1 : 0) +
    filterAvailability.length + (filterMinScore > 0 ? 1 : 0);

  const clearFilters = () => {
    setFilterLocation(''); setFilterMinExp(0); setFilterMaxExp(20);
    setFilterAvailability([]); setFilterMinScore(0); setFilterSkill('');
  };

  const toggleCompare = (id: string) => {
    setCompareIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };
  const compareCandidates = compareIds.map(id => matches.find(m => m.candidate_id === id)).filter(Boolean) as MatchResult[];

  const saveSession = () => {
    const session = { jdText, parsedJD, matches, dataSource, emailDrafts, savedAt: new Date().toISOString() };
    localStorage.setItem('talentscout_session', JSON.stringify(session));
    alert('✅ Session saved! You can resume this shortlist later.');
  };

  const exportCSV = () => {
    const headers = ['Rank','Name','Title','Experience (yr)','Location','Availability','Match Score','Interest Score','Combined Score','Matching Skills','Missing Skills','GitHub URL','LinkedIn URL','Source'];
    const rows = filteredMatches.map(m => [
      m.rank, m.candidate_name, m.candidate_title, m.candidate_experience,
      m.candidate_location, m.candidate_availability,
      m.match_score, m.interest_score ?? '', m.combined_score ?? '',
      m.matching_skills.join('; '), m.missing_skills.join('; '),
      (m as any).github_url || '', (m as any).linkedin_url || '', m.source || dataSource,
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url;
    a.download = `talentscout_shortlist_${new Date().toISOString().slice(0,10)}.csv`;
    a.click(); URL.revokeObjectURL(url);
  };

  // Show nothing during init (before useEffect decides resume vs pipeline)
  if (stage === 'init') {
    return <main className="page"><div className="container" style={{ minHeight: 400 }} /></main>;
  }

  // Pipeline Progress UI
  if (stage !== 'done' && !error) {
    const steps = [
      { id: 'parsing', icon: '🧠', title: 'Parsing Job Description', desc: 'Extracting skills, experience, and culture fit with AI' },
      { id: 'searching', icon: '🔍', title: 'Searching GitHub Developers', desc: 'Querying 100K+ real developer profiles by language & activity' },
      { id: 'scoring', icon: '🎯', title: 'Scoring & Ranking Candidates', desc: 'Computing match scores via skill overlap + experience fit' },
      { id: 'explaining', icon: '📝', title: 'Generating AI Explanations', desc: 'Writing personalized match rationale for top candidates' },
    ];
    const stageOrder = ['loading', 'parsing', 'searching', 'scoring', 'explaining', 'done'];
    const currentIdx = stageOrder.indexOf(stage);
    const elapsed = ((Date.now() - pipelineStartTime) / 1000).toFixed(1);

    return (
      <main className="page">
        <div className="container" style={{ maxWidth: 650 }}>
          <div style={{ minHeight: 500, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <h2 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8, textAlign: 'center' }}>🤖 AI Agent Pipeline</h2>
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginBottom: 32, fontSize: 14 }}>
              Elapsed: {elapsed}s
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {steps.map((step, i) => {
                const stepIdx = stageOrder.indexOf(step.id);
                const isDone = currentIdx > stepIdx;
                const isActive = stage === step.id;
                const time = stageTimes[step.id];
                return (
                  <div key={step.id} className="card" style={{
                    padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 16,
                    borderLeft: `3px solid ${isDone ? 'var(--success)' : isActive ? 'var(--accent)' : 'var(--border)'}`,
                    opacity: isDone || isActive ? 1 : 0.4,
                    transition: 'all 0.3s ease',
                  }}>
                    <span style={{ fontSize: 28, filter: isDone || isActive ? 'none' : 'grayscale(1)' }}>{step.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 600, fontSize: 15 }}>{step.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{step.desc}</div>
                      {parsedJD && step.id === 'parsing' && isDone && (
                        <div style={{ fontSize: 12, color: 'var(--success)', marginTop: 4 }}>
                          → {parsedJD.title} • {parsedJD.required_skills.length} required skills
                        </div>
                      )}
                    </div>
                    <div style={{ minWidth: 60, textAlign: 'right' }}>
                      {isDone && <span style={{ color: 'var(--success)', fontWeight: 700, fontSize: 18 }}>✓</span>}
                      {isDone && time && <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>{(time/1000).toFixed(1)}s</div>}
                      {isActive && <span className="spinner" style={{ width: 20, height: 20 }} />}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="progress-bar" style={{ width: '100%', marginTop: 24, height: 6 }}>
              <div className="progress-fill" style={{ width: `${(currentIdx / steps.length) * 100}%`, transition: 'width 0.5s ease' }} />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="page"><div className="container">
        <div className="card" style={{ textAlign: 'center', padding: 40 }}>
          <p style={{ fontSize: 18, color: 'var(--danger)', marginBottom: 16 }}>❌ {error}</p>
          <button className="btn btn-primary" onClick={() => router.push('/')}>Try Again</button>
        </div>
      </div></main>
    );
  }

  return (
    <main className="page">
      <div className="container">
        {/* Header */}
        {/* Source indicator */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '10px 16px', marginBottom: 16,
          background: dataSource === 'github' ? 'rgba(34,197,94,0.08)' : 'rgba(6,182,212,0.08)',
          border: `1px solid ${dataSource === 'github' ? 'rgba(34,197,94,0.2)' : 'rgba(6,182,212,0.2)'}`,
          borderRadius: 8, fontSize: 13, color: dataSource === 'github' ? 'var(--success)' : 'var(--info)',
        }}>
          <span>{dataSource === 'github' ? '🔗' : 'ℹ️'}</span>
          <span>{dataSource === 'github'
            ? <><strong>Live Data:</strong> Candidates sourced from <strong>GitHub profiles</strong> — real developers matched by skills, repos, and activity.</>
            : <><strong>Fallback Mode:</strong> Using synthetic profiles. Set GITHUB_TOKEN in .env.local for real GitHub data.</>}</span>
        </div>

        <div className="section-header">
          <div>
            <h1 className="section-title">📊 Candidate Shortlist</h1>
            {parsedJD && <p className="section-subtitle">{parsedJD.title} — showing {filteredMatches.length} of {matches.length} candidates</p>}
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-sm"
              disabled={bulkOutreachActive || matches.filter(m => m.interest_score === null).length === 0}
              onClick={runBulkOutreach}>
              {bulkOutreachActive ? <><span className="spinner" /> Outreaching {bulkProgress}/5...</> : '⚡ Outreach Top 5'}
            </button>
            <button className="btn btn-secondary btn-sm" style={{ position: 'relative' }}
              onClick={() => setShowFilters(f => !f)}>
              🔽 Filters {activeFiltersCount > 0 && <span style={{ marginLeft: 4, background: 'var(--accent)', color: '#fff', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 10 }}>{activeFiltersCount}</span>}
            </button>
            <button className="btn btn-secondary btn-sm" onClick={exportCSV} title="Export shortlist as CSV">📥 Export CSV</button>
            <button className="btn btn-secondary btn-sm" onClick={saveSession} title="Save this session to resume later">💾 Save</button>
            {compareIds.length >= 2 && (
              <button className="btn btn-secondary btn-sm" onClick={() => setShowCompare(true)}>
                ⚖️ Compare ({compareIds.length})
              </button>
            )}
            <button className="btn btn-secondary btn-sm" onClick={() => router.push('/')}>← New Search</button>
          </div>
        </div>

        {/* Bulk Outreach Summary */}
        {outreachedCount > 0 && (
          <div style={{
            display: 'flex', gap: 16, padding: '10px 16px', marginBottom: 16,
            background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)',
            borderRadius: 8, fontSize: 13, alignItems: 'center', flexWrap: 'wrap',
          }}>
            <span>📊 <strong>Outreach Summary:</strong></span>
            <span style={{ color: 'var(--success)' }}>🟢 {matches.filter(m => (m.interest_score ?? 0) >= 70).length} Highly Interested</span>
            <span style={{ color: 'var(--warning)' }}>🟡 {matches.filter(m => m.interest_score !== null && m.interest_score >= 40 && m.interest_score < 70).length} Moderately Interested</span>
            <span style={{ color: 'var(--danger)' }}>🔴 {matches.filter(m => m.interest_score !== null && m.interest_score < 40).length} Low Interest</span>
          </div>
        )}

        {/* Filter Panel */}
        {showFilters && (
          <div className="card animate-in" style={{ marginBottom: 16, padding: 20, border: '1px solid rgba(99,102,241,0.3)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 600, fontSize: 15 }}>🔽 Filter & Sort Candidates</div>
              {activeFiltersCount > 0 && (
                <button className="btn btn-ghost btn-sm" onClick={clearFilters}>✕ Clear all filters</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
              {/* Location */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>📍 Location</label>
                <input type="text" placeholder="e.g. United States, India" value={filterLocation}
                  onChange={e => setFilterLocation(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              {/* Skill Search */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>🛠️ Must-Have Skill</label>
                <input type="text" placeholder="e.g. React, Python, AWS" value={filterSkill}
                  onChange={e => setFilterSkill(e.target.value)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13, boxSizing: 'border-box' }} />
              </div>
              {/* Min Experience */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>💼 Min Experience: {filterMinExp}yr</label>
                <input type="range" min={0} max={15} value={filterMinExp} onChange={e => setFilterMinExp(+e.target.value)}
                  style={{ width: '100%' }} />
              </div>
              {/* Max Experience */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>💼 Max Experience: {filterMaxExp < 20 ? `${filterMaxExp}yr` : 'Any'}</label>
                <input type="range" min={1} max={20} value={filterMaxExp} onChange={e => setFilterMaxExp(+e.target.value)}
                  style={{ width: '100%' }} />
              </div>
              {/* Min Match Score */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>🎯 Min Match Score: {filterMinScore}</label>
                <input type="range" min={0} max={100} step={5} value={filterMinScore} onChange={e => setFilterMinScore(+e.target.value)}
                  style={{ width: '100%' }} />
              </div>
              {/* Availability */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>✅ Availability</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {[['actively_looking', '🟢 Actively Looking'], ['open', '🟡 Open to Opportunities'], ['passive', '⚪ Passive']].map(([val, label]) => (
                    <label key={val} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                      <input type="checkbox" checked={filterAvailability.includes(val)}
                        onChange={e => setFilterAvailability(prev => e.target.checked ? [...prev, val] : prev.filter(v => v !== val))} />
                      {label}
                    </label>
                  ))}
                </div>
              </div>
              {/* Sort By */}
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', marginBottom: 6 }}>⬆️ Sort By</label>
                <select value={sortBy} onChange={e => setSortBy(e.target.value as typeof sortBy)}
                  style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)', fontSize: 13 }}>
                  <option value="match">Match Score (default)</option>
                  <option value="combined">Combined Score</option>
                  <option value="interest">Interest Score</option>
                  <option value="experience">Years of Experience</option>
                </select>
              </div>
            </div>
            {filteredMatches.length === 0 && (
              <p style={{ marginTop: 16, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>No candidates match these filters. Try relaxing some criteria.</p>
            )}
          </div>
        )}

        {/* Parsed JD Summary */}
        {parsedJD && (
          <div className="card animate-in" style={{ marginBottom: 24, padding: 20 }}>
            <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: 250 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Required Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parsedJD.required_skills.map((s, i) => <span key={`req-${i}`} className="skill-pill matched">{s}</span>)}
                </div>
              </div>
              <div style={{ flex: 1, minWidth: 250 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Preferred Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parsedJD.preferred_skills.map((s, i) => <span key={`pref-${i}`} className="skill-pill">{s}</span>)}
                </div>
              </div>
              <div style={{ minWidth: 150 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Details</div>
                <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                  📍 {parsedJD.location}<br/>
                  💼 {parsedJD.experience_min}{parsedJD.experience_max ? `–${parsedJD.experience_max}` : '+'} years<br/>
                  🎯 {parsedJD.culture_keywords.slice(0,3).join(', ')}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="stats-grid animate-in animate-in-delay-1">
          <div className="stat-card"><div className="stat-value">{filteredMatches.length}<span style={{fontSize:14,color:'var(--text-muted)'}}>/{matches.length}</span></div><div className="stat-label">Candidates Shown</div></div>
          <div className="stat-card"><div className="stat-value">{avgMatch}</div><div className="stat-label">Avg Match Score</div></div>
          <div className="stat-card"><div className="stat-value">{outreachedCount}</div><div className="stat-label">Outreach Simulated</div></div>
          <div className="stat-card"><div className="stat-value">{topCombined || '—'}</div><div className="stat-label">Top Combined Score</div></div>
        </div>

        {/* Tabs */}
        <div className="tabs">
          <button className={`tab ${activeTab === 'table' ? 'active' : ''}`} onClick={() => setActiveTab('table')}>📋 Table View</button>
          <button className={`tab ${activeTab === 'chart' ? 'active' : ''}`} onClick={() => setActiveTab('chart')}>📈 Scatter Plot</button>
        </div>

        {/* Scatter Plot */}
        {activeTab === 'chart' && (
          <div className="animate-in" style={{ marginBottom: 32 }}>
            <ScatterPlot matches={filteredMatches} onSelect={setSelectedCandidate} />
            <p style={{ textAlign: 'center', color: 'var(--text-muted)', marginTop: 12, fontSize: 13 }}>
              {matches.filter(m => m.interest_score !== null).length === 0
                ? '💡 Click "Outreach" on candidates in the table to plot them on the Y-axis (Interest Score)'
                : `${filteredMatches.filter(m => m.interest_score !== null).length} of ${filteredMatches.length} visible candidates have been outreached`}
            </p>
          </div>
        )}

        {/* Table */}
        {activeTab === 'table' && (
          <div className="table-wrapper animate-in animate-in-delay-2">
            <table className="table">
              <thead>
                <tr>
                  <th style={{width:32}}></th><th>#</th><th>Candidate</th><th>Skills Match</th>
                  <th>Match</th><th>Interest</th><th>Combined</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMatches.map((m) => (
                  <tr key={m.candidate_id} style={{ cursor: 'pointer' }}
                    onClick={() => setSelectedCandidate(m)}>
                    <td className="rank-cell" onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={compareIds.includes(m.candidate_id)}
                        onChange={() => toggleCompare(m.candidate_id)}
                        title="Select to compare" style={{ cursor: 'pointer' }} />
                    </td>
                    <td className="rank-cell">{m.rank}</td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {(m as any).avatar_url ? (
                          <img src={(m as any).avatar_url} alt={m.candidate_name}
                            style={{ width: 40, height: 40, borderRadius: '50%', border: '2px solid var(--border)' }} />
                        ) : (
                          <div className="avatar" style={{ background: m.avatar_color }}>
                            {m.candidate_name.split(' ').map(n => n[0]).join('')}
                          </div>
                        )}
                        <div>
                          <div style={{ fontWeight: 600, fontSize: 14 }}>{m.candidate_name}</div>
                          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                            {m.candidate_title} · {m.candidate_experience}yr · {m.candidate_location}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, maxWidth: 200 }}>
                        {m.matching_skills.slice(0, 3).map((s, i) => <span key={`${m.candidate_id}-ms-${i}`} className="skill-pill matched" style={{ fontSize: 11 }}>{s}</span>)}
                        {m.missing_skills.length > 0 && <span className="skill-pill missing" style={{ fontSize: 11 }}>-{m.missing_skills.length}</span>}
                      </div>
                    </td>
                    <td>
                      <div className="tooltip-container" style={{ display: 'inline-block' }}>
                        <span className={`badge ${scoreBadgeClass(m.match_score)}`}>{m.match_score}</span>
                        <div className="tooltip" style={{ width: 260, textAlign: 'left', padding: 12 }}>
                          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 12 }}>📊 Score Breakdown</div>
                          {parsedJD && parsedJD.required_skills.map((skill, si) => (
                            <div key={si} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 3 }}>
                              <span>{skill}</span>
                              <span>{m.matching_skills.some(ms => ms.toLowerCase() === skill.toLowerCase()) ? '✅' : '❌'}</span>
                            </div>
                          ))}
                          <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', marginTop: 6, paddingTop: 6, fontSize: 11 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 2 }}>
                              <span>Experience Fit</span>
                              <span>{m.candidate_experience}yr {parsedJD && m.candidate_experience >= parsedJD.experience_min ? '✅' : '⚠️'}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                              <span>Availability</span>
                              <span style={{ textTransform: 'capitalize' }}>{m.candidate_availability?.replace('_', ' ') || 'Unknown'}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      {m.interest_score !== null ?
                        <span className={`badge ${scoreBadgeClass(m.interest_score)}`}>{m.interest_score}</span> :
                        <span className="badge badge-neutral">—</span>}
                    </td>
                    <td>
                      {m.combined_score !== null ?
                        <span className={`badge ${scoreBadgeClass(m.combined_score)}`}>{m.combined_score}</span> :
                        <span className="badge badge-neutral">—</span>}
                    </td>
                    <td onClick={e => e.stopPropagation()}>
                      {m.interest_score === null ? (
                        <button className="btn btn-primary btn-sm"
                          disabled={outreachLoading === m.candidate_id}
                          onClick={() => runOutreach(m)}>
                          {outreachLoading === m.candidate_id ? <><span className="spinner" /> Running...</> : '💬 Outreach'}
                        </button>
                      ) : (
                        <button className="btn btn-secondary btn-sm" onClick={() => setSelectedCandidate(m)}>
                          View Details
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Candidate Detail Modal */}
        {selectedCandidate && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, animation: 'fadeIn 0.2s ease',
          }} onClick={() => setSelectedCandidate(null)}>
            <div className="card" style={{
              maxWidth: 700, width: '100%', maxHeight: '85vh', overflow: 'auto',
              padding: 32, animation: 'slideUp 0.3s ease',
            }} onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                  {(selectedCandidate as any).avatar_url ? (
                    <img src={(selectedCandidate as any).avatar_url} alt={selectedCandidate.candidate_name}
                      style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border)' }} />
                  ) : (
                    <div className="avatar" style={{ background: selectedCandidate.avatar_color, width: 56, height: 56, fontSize: 20 }}>
                      {selectedCandidate.candidate_name.split(' ').map(n => n[0]).join('')}
                    </div>
                  )}
                  <div>
                    <h2 style={{ fontSize: 20, fontWeight: 700 }}>
                      {selectedCandidate.candidate_name}
                      {(selectedCandidate as any).github_url && (
                        <a href={(selectedCandidate as any).github_url} target="_blank" rel="noopener noreferrer"
                          style={{ marginLeft: 8, fontSize: 14, color: 'var(--accent-light)', textDecoration: 'none' }}>↗ GitHub</a>
                      )}
                      {(selectedCandidate as any).linkedin_url && (
                        <a href={(selectedCandidate as any).linkedin_url} target="_blank" rel="noopener noreferrer"
                          style={{ marginLeft: 8, fontSize: 14, color: '#0077b5', textDecoration: 'none' }}>↗ LinkedIn</a>
                      )}
                    </h2>
                    <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                      {selectedCandidate.candidate_title} · {selectedCandidate.candidate_experience}yr · {selectedCandidate.candidate_location}
                      {(selectedCandidate as any).followers != null && ` · ⭐ ${(selectedCandidate as any).followers} followers`}
                    </p>
                  </div>
                </div>
                <button className="btn btn-ghost" onClick={() => setSelectedCandidate(null)}>✕</button>
              </div>

              {/* Scores */}
              <div style={{ display: 'flex', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
                <div style={{ textAlign: 'center' }}>
                  <ScoreCircle score={selectedCandidate.match_score} color={scoreColor(selectedCandidate.match_score)} size={64} />
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Match</div>
                </div>
                {selectedCandidate.interest_score !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <ScoreCircle score={selectedCandidate.interest_score} color={scoreColor(selectedCandidate.interest_score)} size={64} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Interest</div>
                  </div>
                )}
                {selectedCandidate.combined_score !== null && (
                  <div style={{ textAlign: 'center' }}>
                    <ScoreCircle score={selectedCandidate.combined_score} color={scoreColor(selectedCandidate.combined_score)} size={64} />
                    <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Combined</div>
                  </div>
                )}
              </div>

              {/* Availability Badge */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{
                  padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                  background: selectedCandidate.candidate_availability === 'actively_looking' ? 'rgba(34,197,94,0.15)' :
                    selectedCandidate.candidate_availability === 'open' ? 'rgba(234,179,8,0.15)' : 'rgba(148,163,184,0.15)',
                  color: selectedCandidate.candidate_availability === 'actively_looking' ? 'var(--success)' :
                    selectedCandidate.candidate_availability === 'open' ? 'var(--warning)' : 'var(--text-muted)',
                }}>
                  {selectedCandidate.candidate_availability === 'actively_looking' ? '🟢 Actively Looking' :
                   selectedCandidate.candidate_availability === 'open' ? '🟡 Open to Opportunities' : '⚪ Passive'}
                </span>
                {(selectedCandidate as any).repos_count != null && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>📦 {(selectedCandidate as any).repos_count} repos</span>
                )}
                {(selectedCandidate as any).followers != null && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>👥 {(selectedCandidate as any).followers} followers</span>
                )}
                {selectedCandidate.source === 'github' && (
                  <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>GitHub Verified</span>
                )}
              </div>

              {/* Top Repos — GitHub Intelligence */}
              {(selectedCandidate as any).top_repos && (selectedCandidate as any).top_repos.length > 0 && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>⭐ Top Repositories</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {(selectedCandidate as any).top_repos.slice(0, 4).map((repo: any, i: number) => (
                      <a key={i} href={repo.url} target="_blank" rel="noopener noreferrer"
                        style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', background: 'var(--bg-secondary)', borderRadius: 8,
                          textDecoration: 'none', color: 'var(--text-primary)', fontSize: 13,
                          border: '1px solid var(--border)', transition: 'border-color 0.2s',
                        }}>
                        <div>
                          <span style={{ fontWeight: 600 }}>{repo.name}</span>
                          <span style={{ marginLeft: 8, fontSize: 11, color: 'var(--text-muted)' }}>{repo.language}</span>
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--warning)' }}>⭐ {repo.stars}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Ranking Explainability */}
              {parsedJD && (
                <div style={{ marginBottom: 20, padding: 16, background: 'rgba(99,102,241,0.05)', borderRadius: 8, border: '1px solid rgba(99,102,241,0.1)' }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-light)', textTransform: 'uppercase', marginBottom: 10 }}>📊 Why This Rank?</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 6, marginBottom: 12 }}>
                    {parsedJD.required_skills.map((skill, si) => (
                      <div key={si} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, padding: '4px 8px', borderRadius: 4,
                        background: selectedCandidate.matching_skills.some(ms => ms.toLowerCase() === skill.toLowerCase()) ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)' }}>
                        <span>{skill}</span>
                        <span>{selectedCandidate.matching_skills.some(ms => ms.toLowerCase() === skill.toLowerCase()) ? '✅' : '❌'}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    Skills: {selectedCandidate.matching_skills.length}/{parsedJD.required_skills.length} required •
                    Experience: {selectedCandidate.candidate_experience}yr (need {parsedJD.experience_min}+) •
                    {selectedCandidate.candidate_experience >= parsedJD.experience_min ? ' ✅ Meets requirement' : ' ⚠️ Below minimum'}
                  </div>
                </div>
              )}

              {/* Bio & Explanation */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>About</div>
                <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{selectedCandidate.candidate_bio}</p>
              </div>
              {selectedCandidate.match_explanation && (
                <div style={{ marginBottom: 20, padding: 16, background: 'rgba(99,102,241,0.08)', borderRadius: 8 }}>
                  <div style={{ fontSize: 12, color: 'var(--accent-light)', marginBottom: 6 }}>🔍 Why They Match</div>
                  <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>{selectedCandidate.match_explanation}</p>
                </div>
              )}

              {/* Skills */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 6 }}>Skills</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {selectedCandidate.candidate_skills.map((s, i) => (
                    <span key={`skill-${i}`} className={`skill-pill ${selectedCandidate.matching_skills.includes(s) ? 'matched' : ''}`}>{s}</span>
                  ))}
                </div>
              </div>

              {/* Interest Breakdown */}
              {selectedCandidate.interest_breakdown && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 10 }}>Interest Breakdown</div>
                  {['enthusiasm', 'availability', 'cultural_fit', 'specificity'].map(key => {
                    const val = (selectedCandidate.interest_breakdown as unknown as Record<string, number>)[key] || 0;
                    return (
                      <div key={key} style={{ marginBottom: 8 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                          <span style={{ textTransform: 'capitalize', color: 'var(--text-secondary)' }}>{key.replace('_',' ')}</span>
                          <span style={{ fontWeight: 600 }}>{val}/25</span>
                        </div>
                        <div className="progress-bar"><div className="progress-fill" style={{ width: `${(val/25)*100}%` }} /></div>
                      </div>
                    );
                  })}
                  <p style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 8, fontStyle: 'italic' }}>
                    {selectedCandidate.interest_breakdown.explanation}
                  </p>
                </div>
              )}

              {/* Multi-Turn Chat Interface */}
              {selectedCandidate.conversation && (
                <div style={{ marginBottom: 20 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase' }}>💬 Outreach Conversation</div>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'rgba(34,197,94,0.1)', color: 'var(--success)' }}>
                      {selectedCandidate.conversation.length} messages · AI Simulated
                    </span>
                  </div>
                  <div style={{
                    background: 'var(--bg-secondary)', borderRadius: 16, overflow: 'hidden',
                    border: '1px solid var(--border)',
                  }}>
                    {/* Chat Header */}
                    <div style={{
                      padding: '10px 16px', borderBottom: '1px solid var(--border)',
                      display: 'flex', alignItems: 'center', gap: 10, background: 'rgba(99,102,241,0.05)',
                    }}>
                      {(selectedCandidate as any).avatar_url ? (
                        <img src={(selectedCandidate as any).avatar_url} alt="" style={{ width: 28, height: 28, borderRadius: '50%' }} />
                      ) : (
                        <div style={{ width: 28, height: 28, borderRadius: '50%', background: selectedCandidate.avatar_color, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 700 }}>
                          {selectedCandidate.candidate_name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{selectedCandidate.candidate_name}</div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Simulated outreach via AI agent</div>
                      </div>
                    </div>
                    {/* Messages */}
                    <div style={{ padding: '16px', maxHeight: 350, overflow: 'auto' }}>
                      {selectedCandidate.conversation.map((msg, i) => (
                        <div key={i} style={{
                          display: 'flex', justifyContent: msg.role === 'recruiter' ? 'flex-end' : 'flex-start',
                          marginBottom: 12,
                        }}>
                          <div style={{ maxWidth: '80%' }}>
                            <div style={{
                              padding: '10px 14px', borderRadius: 16, fontSize: 13, lineHeight: 1.5,
                              background: msg.role === 'recruiter' ? 'var(--accent)' : 'rgba(255,255,255,0.06)',
                              color: msg.role === 'recruiter' ? '#fff' : 'var(--text-primary)',
                              borderBottomRightRadius: msg.role === 'recruiter' ? 4 : 16,
                              borderBottomLeftRadius: msg.role === 'recruiter' ? 16 : 4,
                            }}>
                              {msg.content}
                            </div>
                            <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 4, textAlign: msg.role === 'recruiter' ? 'right' : 'left' }}>
                              {msg.role === 'recruiter' ? '🧑‍💼 Recruiter' : `💬 ${selectedCandidate.candidate_name}`} · Turn {Math.floor(i/2) + 1}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* Email Draft */}
              <div style={{ display: 'flex', gap: 8, marginTop: 20 }}>
                {selectedCandidate.interest_score === null && (
                  <button className="btn btn-primary" disabled={outreachLoading === selectedCandidate.candidate_id}
                    onClick={() => runOutreach(selectedCandidate)}>
                    {outreachLoading === selectedCandidate.candidate_id ? <><span className="spinner" /> Running...</> : '💬 Run Outreach'}
                  </button>
                )}
                <button className="btn btn-secondary"
                  disabled={emailLoading === selectedCandidate.candidate_id}
                  onClick={() => generateEmail(selectedCandidate)}>
                  {emailLoading === selectedCandidate.candidate_id ? <><span className="spinner" /> Generating...</> : '📧 Generate Email'}
                </button>
              </div>

              {emailDrafts[selectedCandidate.candidate_id] && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: 8 }}>Email Draft</div>
                  <div className="email-draft">{emailDrafts[selectedCandidate.candidate_id]}</div>
                  <button className="btn btn-ghost btn-sm" style={{ marginTop: 8 }}
                    onClick={() => navigator.clipboard.writeText(emailDrafts[selectedCandidate.candidate_id])}>
                    📋 Copy to Clipboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        {/* Comparison Modal */}
        {showCompare && compareCandidates.length >= 2 && (
          <div style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 24, animation: 'fadeIn 0.2s ease',
          }} onClick={() => setShowCompare(false)}>
            <div className="card" style={{
              maxWidth: 900, width: '100%', maxHeight: '85vh', overflow: 'auto',
              padding: 32, animation: 'slideUp 0.3s ease',
            }} onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
                <h2 style={{ fontSize: 20, fontWeight: 700 }}>⚖️ Candidate Comparison</h2>
                <button className="btn btn-ghost" onClick={() => setShowCompare(false)}>✕</button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: `repeat(${compareCandidates.length}, 1fr)`, gap: 16 }}>
                {compareCandidates.map((c) => (
                  <div key={c.candidate_id} style={{ textAlign: 'center' }}>
                    {/* Avatar & Name */}
                    <div style={{ marginBottom: 16 }}>
                      {(c as any).avatar_url ? (
                        <img src={(c as any).avatar_url} alt={c.candidate_name}
                          style={{ width: 56, height: 56, borderRadius: '50%', border: '2px solid var(--border)' }} />
                      ) : (
                        <div className="avatar" style={{ background: c.avatar_color, width: 56, height: 56, fontSize: 20, margin: '0 auto' }}>
                          {c.candidate_name.split(' ').map(n => n[0]).join('')}
                        </div>
                      )}
                      <div style={{ fontWeight: 700, fontSize: 15, marginTop: 8 }}>{c.candidate_name}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{c.candidate_title}</div>
                    </div>
                    {/* Scores */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: 12, marginBottom: 16 }}>
                      <div>
                        <ScoreCircle score={c.match_score} color={scoreColor(c.match_score)} size={52} />
                        <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Match</div>
                      </div>
                      {c.interest_score !== null && (
                        <div>
                          <ScoreCircle score={c.interest_score} color={scoreColor(c.interest_score)} size={52} />
                          <div style={{ fontSize: 10, color: 'var(--text-muted)' }}>Interest</div>
                        </div>
                      )}
                    </div>
                    {/* Details */}
                    {[
                      ['📍 Location', c.candidate_location],
                      ['💼 Experience', `${c.candidate_experience} years`],
                      ['📊 Availability', c.candidate_availability?.replace('_', ' ')],
                      ['✅ Skills Matched', `${c.matching_skills.length}/${parsedJD?.required_skills.length || 0}`],
                      ['❌ Skills Missing', c.missing_skills.length.toString()],
                      ['🔗 Source', c.source || dataSource],
                    ].map(([label, val]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 8px', fontSize: 12, borderBottom: '1px solid var(--border)' }}>
                        <span style={{ color: 'var(--text-muted)' }}>{label}</span>
                        <span style={{ fontWeight: 600, textTransform: 'capitalize' }}>{val}</span>
                      </div>
                    ))}
                    {/* Skills */}
                    <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 4, justifyContent: 'center' }}>
                      {c.candidate_skills.slice(0, 6).map((s, i) => (
                        <span key={i} className={`skill-pill ${c.matching_skills.includes(s) ? 'matched' : ''}`} style={{ fontSize: 10 }}>{s}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ textAlign: 'center', marginTop: 20 }}>
                <button className="btn btn-ghost btn-sm" onClick={() => { setCompareIds([]); setShowCompare(false); }}>
                  Clear Comparison
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
