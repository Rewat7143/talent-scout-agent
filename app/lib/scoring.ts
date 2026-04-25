import type { ParsedJD, MatchResult } from './types';
import type { GitHubCandidate } from './github';
import { CANDIDATES } from '../data/candidates';

/**
 * Compute skill overlap using fuzzy matching.
 */
function computeSkillOverlap(
  requiredSkills: string[],
  candidateSkills: string[]
): { score: number; matching: string[]; missing: string[] } {
  const normalize = (s: string) => s.toLowerCase().trim();
  const required = new Set(requiredSkills.map(normalize));
  const candidate = new Set(candidateSkills.map(normalize));

  const matching: string[] = [];
  const missing: string[] = [];

  for (const skill of required) {
    let found = false;
    for (const cs of candidate) {
      if (cs === skill || cs.includes(skill) || skill.includes(cs)) {
        found = true;
        const orig = candidateSkills.find(s => normalize(s) === cs);
        matching.push(orig || cs);
        break;
      }
    }
    if (!found) {
      const orig = requiredSkills.find(s => normalize(s) === skill);
      missing.push(orig || skill);
    }
  }

  const score = required.size > 0 ? matching.length / required.size : 0;
  return { score, matching, missing };
}

/**
 * Compute experience fit.
 */
function computeExperienceFit(expMin: number, expMax: number | null, candidateExp: number): number {
  const max = expMax ?? expMin + 5;
  if (candidateExp >= expMin && candidateExp <= max) return 1.0;
  const diff = candidateExp < expMin ? expMin - candidateExp : candidateExp - max;
  if (diff <= 1) return 0.7;
  if (diff <= 2) return 0.4;
  return 0.1;
}

/**
 * Compute text similarity.
 */
function computeTextSimilarity(jdText: string, candidateText: string): number {
  const tokenize = (text: string) =>
    text.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(t => t.length > 2);
  const jdTokens = new Set(tokenize(jdText));
  const candidateTokens = new Set(tokenize(candidateText));
  if (jdTokens.size === 0 || candidateTokens.size === 0) return 0;
  let overlap = 0;
  for (const token of jdTokens) {
    if (candidateTokens.has(token)) overlap++;
  }
  return overlap / new Set([...jdTokens, ...candidateTokens]).size;
}

interface CandidateInput {
  id: string;
  name: string;
  title: string;
  skills: string[];
  experience_years: number;
  location: string;
  bio: string;
  avatar_color: string;
  availability: string;
  avatar_url?: string;
  github_url?: string;
  followers?: number;
  repos_count?: number;
  top_repos?: { name: string; language: string; stars: number; url: string }[];
}

/**
 * Score a list of candidates against a parsed JD.
 */
function scoreCandidate(candidate: CandidateInput, parsedJD: ParsedJD, jdText: string): MatchResult {
  const allSkills = [...parsedJD.required_skills, ...parsedJD.preferred_skills];
  const requiredOverlap = computeSkillOverlap(parsedJD.required_skills, candidate.skills);
  const preferredOverlap = computeSkillOverlap(parsedJD.preferred_skills, candidate.skills);
  const expFit = computeExperienceFit(parsedJD.experience_min, parsedJD.experience_max, candidate.experience_years);
  const candidateText = `${candidate.title} ${candidate.skills.join(' ')} ${candidate.bio}`;
  const jdFullText = `${jdText} ${allSkills.join(' ')} ${parsedJD.culture_keywords.join(' ')}`;
  const textSim = computeTextSimilarity(jdFullText, candidateText);

  const match_score = Math.min(Math.round(
    (textSim * 40) + (requiredOverlap.score * 30) + (preferredOverlap.score * 10) + (expFit * 20)
  ), 100);

  return {
    candidate_id: candidate.id,
    candidate_name: candidate.name,
    candidate_title: candidate.title,
    candidate_skills: candidate.skills,
    candidate_experience: candidate.experience_years,
    candidate_location: candidate.location,
    candidate_bio: candidate.bio,
    candidate_availability: candidate.availability,
    avatar_color: candidate.avatar_color,
    avatar_url: candidate.avatar_url || null,
    github_url: candidate.github_url || null,
    followers: candidate.followers || null,
    repos_count: candidate.repos_count || null,
    top_repos: candidate.top_repos || null,
    match_score,
    interest_score: null,
    combined_score: null,
    rank: null,
    matching_skills: requiredOverlap.matching,
    missing_skills: requiredOverlap.missing,
    match_explanation: '',
    conversation: null,
    interest_breakdown: null,
    email_draft: null,
    source: candidate.github_url ? 'github' : 'synthetic',
  };
}

/**
 * Match GitHub candidates against a parsed JD.
 */
export function matchGitHubCandidates(
  candidates: GitHubCandidate[],
  parsedJD: ParsedJD,
  jdText: string
): MatchResult[] {
  const results = candidates.map(c => scoreCandidate(c, parsedJD, jdText));
  results.sort((a, b) => b.match_score - a.match_score);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/**
 * Match synthetic candidates against a parsed JD (fallback).
 */
export function matchSyntheticCandidates(parsedJD: ParsedJD, jdText: string): MatchResult[] {
  const results = CANDIDATES.map(c => scoreCandidate({
    ...c, avatar_url: undefined, github_url: undefined,
  }, parsedJD, jdText));
  results.sort((a, b) => b.match_score - a.match_score);
  results.forEach((r, i) => { r.rank = i + 1; });
  return results;
}

/**
 * Compute combined score.
 */
export function computeCombinedScore(matchScore: number, interestScore: number): number {
  return Math.round((matchScore * 0.6) + (interestScore * 0.4));
}
