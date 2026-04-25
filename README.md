# 🎯 TalentScout AI — Intelligent Candidate Discovery & Engagement

> AI-powered talent scouting agent that takes a Job Description, discovers matching real GitHub developers, simulates conversational outreach, and outputs a ranked shortlist scored on Match + Interest.

![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue?logo=typescript)
![Groq](https://img.shields.io/badge/Groq-Llama_3.3-orange)
![GitHub API](https://img.shields.io/badge/GitHub-API-white?logo=github)

---

## ⚡ What It Does

1. **JD Parsing** — Paste any job description → AI extracts skills, experience, location, culture keywords
2. **Real Candidate Discovery** — Searches 100K+ real GitHub developer profiles by language, activity, and repos
3. **AI Scoring** — Ranks candidates using skill overlap (30%), text similarity (40%), experience fit (20%), preferred skills (10%)
4. **Simulated Outreach** — 6-turn AI conversations assess genuine candidate interest (enthusiasm, availability, cultural fit, specificity)
5. **Combined Ranking** — Final score = Match × 60% + Interest × 40% — the recruiter gets an actionable shortlist

## 🏆 Key Differentiators

| Feature | TalentScout AI |
|---------|---------------|
| **Data Source** | Real GitHub developer profiles (not synthetic) |
| **Scoring** | Two-dimensional: Match Score + Interest Score |
| **Outreach** | Multi-turn AI conversations (6 messages) |
| **Explainability** | Skill-by-skill breakdown, experience fit, availability signals |
| **Bulk Actions** | One-click outreach for top 5 candidates |
| **Email Generation** | AI-crafted recruiter emails with match context |
| **Pipeline Visibility** | Live step-by-step AI agent progress UI |

---

## 🚀 Quick Start

```bash
# 1. Clone
git clone https://github.com/Rewat7143/talent-scout-agent.git
cd talent-scout-agent

# 2. Install
npm install

# 3. Configure (copy and edit with your keys)
cp .env.example .env.local
# Edit .env.local with at least GROQ_API_KEY

# 4. Run
npm run dev
# Open http://localhost:3000
```

### Environment Variables

| Variable | Required | Source |
|----------|----------|--------|
| `GROQ_API_KEY` | ✅ Yes | [console.groq.com/keys](https://console.groq.com/keys) (Free) |
| `GEMINI_API_KEY` | Optional | [aistudio.google.com](https://aistudio.google.com/apikey) (Fallback) |
| `GITHUB_TOKEN` | Recommended | [github.com/settings/tokens](https://github.com/settings/tokens) (5000 req/hr) |

---

## 📐 Architecture

```
JD Input → AI Parser (Groq/Gemini) → GitHub API Search → Scoring Engine → AI Explanations
                                                                              ↓
Email Generator ← Interest Scorer ← Outreach Agent ← Recruiter selects candidate
                                                                              ↓
                                              Dashboard: Table + Scatter Plot + Chat
```

### Scoring Formula

```
Match Score = text_similarity × 40 + skill_overlap × 30 + preferred_skills × 10 + experience_fit × 20
Interest Score = enthusiasm(25) + availability(25) + cultural_fit(25) + specificity(25)
Combined Score = Match × 0.6 + Interest × 0.4
```

---

## 🛠️ Tech Stack

- **Frontend**: Next.js 16 (App Router) + React 19 + TypeScript
- **AI/LLM**: Groq Llama 3.3 70B (primary) / Google Gemini 2.0 Flash (fallback)
- **Candidate Data**: GitHub REST API (real developer profiles)
- **Styling**: Custom CSS Design System (dark mode, glassmorphism)
- **Deployment**: Vercel (serverless)

---

## 📸 Sample Input & Output

### Sample JD Input
```
Senior Full Stack Engineer — Remote

We're looking for a senior full stack engineer with 5+ years of experience.
Required: React, TypeScript, Node.js, PostgreSQL
Preferred: GraphQL, Docker, CI/CD
Culture: autonomy, communication, fast iteration
```

### Sample Output
- 15 real GitHub developers matched and ranked
- Top candidate: Match Score 78, Interest Score 85, Combined 81
- AI-generated match explanation + 6-turn simulated conversation
- Recruiter email draft ready to send

---

## 📁 Project Structure

```
app/
├── page.tsx                    # Landing page (JD input)
├── dashboard/page.tsx          # Results dashboard (table, scatter, modal)
├── architecture/page.tsx       # Architecture & scoring docs
├── api/
│   ├── jd/parse/route.ts       # AI JD parser
│   ├── candidates/match/route.ts  # GitHub search + scoring
│   ├── outreach/run/route.ts   # Simulated conversation
│   └── outreach/email-draft/route.ts  # Email generator
├── lib/
│   ├── gemini.ts               # Multi-provider AI service (Groq + Gemini)
│   ├── github.ts               # GitHub API integration
│   ├── scoring.ts              # Match scoring engine
│   └── types.ts                # TypeScript interfaces
└── data/
    └── candidates.ts           # Synthetic fallback dataset (50 profiles)
```

---

## 🌐 Live Demo

**Demo URL:** `https://talent-scout-agent-rho.vercel.app`

**Demo Video:** `YOUR_VIDEO_URL_HERE`

---

## 📝 License

MIT
