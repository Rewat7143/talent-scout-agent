export interface ParsedJD {
  title: string;
  required_skills: string[];
  preferred_skills: string[];
  experience_min: number;
  experience_max: number | null;
  location: string;
  culture_keywords: string[];
  role_summary: string;
}

export interface MatchResult {
  candidate_id: string;
  candidate_name: string;
  candidate_title: string;
  candidate_skills: string[];
  candidate_experience: number;
  candidate_location: string;
  candidate_bio: string;
  candidate_availability: string;
  avatar_color: string;
  avatar_url: string | null;
  github_url: string | null;
  linkedin_url: string | null;
  followers: number | null;
  repos_count: number | null;
  top_repos: { name: string; language: string; stars: number; url: string }[] | null;
  match_score: number;
  interest_score: number | null;
  combined_score: number | null;
  rank: number | null;
  matching_skills: string[];
  missing_skills: string[];
  match_explanation: string;
  conversation: ConversationMessage[] | null;
  interest_breakdown: InterestBreakdown | null;
  email_draft: string | null;
  source: 'github' | 'synthetic';
}

export interface ConversationMessage {
  role: 'recruiter' | 'candidate';
  content: string;
  timestamp: string;
}

export interface InterestBreakdown {
  enthusiasm: number;
  availability: number;
  cultural_fit: number;
  specificity: number;
  explanation: string;
}

export interface JobSession {
  id: string;
  jd_text: string;
  parsed_jd: ParsedJD;
  matches: MatchResult[];
  created_at: string;
  status: 'parsing' | 'matching' | 'outreach' | 'complete';
}
