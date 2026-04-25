import { NextRequest, NextResponse } from 'next/server';
import { matchGitHubCandidates, matchSyntheticCandidates } from '../../../lib/scoring';
import { searchGitHubCandidates } from '../../../lib/github';
import { generateMatchExplanation } from '../../../lib/gemini';
import type { ParsedJD } from '../../../lib/types';

export async function POST(request: NextRequest) {
  try {
    const { parsed_jd, jd_text, source = 'github', top_n = 15 } = await request.json();

    if (!parsed_jd || !jd_text) {
      return NextResponse.json({ error: 'parsed_jd and jd_text are required.' }, { status: 400 });
    }

    const typedJD = parsed_jd as ParsedJD;
    let matches;

    if (source === 'github') {
      try {
        // Search GitHub for real candidates
        console.log('Searching GitHub for candidates...');
        const githubCandidates = await searchGitHubCandidates(
          [...typedJD.required_skills, ...typedJD.preferred_skills],
          typedJD.location,
          typedJD.experience_min,
          top_n
        );

        if (githubCandidates.length > 0) {
          matches = matchGitHubCandidates(githubCandidates, typedJD, jd_text);
          console.log(`Matched ${matches.length} GitHub candidates`);
        } else {
          // Fallback to synthetic if no GitHub results
          console.log('No GitHub results, falling back to synthetic candidates');
          matches = matchSyntheticCandidates(typedJD, jd_text).slice(0, top_n);
        }
      } catch (err) {
        console.error('GitHub search failed, falling back to synthetic:', err);
        matches = matchSyntheticCandidates(typedJD, jd_text).slice(0, top_n);
      }
    } else {
      matches = matchSyntheticCandidates(typedJD, jd_text).slice(0, top_n);
    }

    // Generate AI explanations for top candidates
    const explanationPromises = matches.slice(0, 10).map(async (m) => {
      try {
        const explanation = await generateMatchExplanation(
          typedJD.role_summary, m.candidate_name, m.candidate_title,
          m.candidate_skills, m.candidate_experience, m.candidate_bio,
          m.matching_skills, m.missing_skills, m.match_score
        );
        m.match_explanation = explanation;
      } catch {
        m.match_explanation = `${m.candidate_name} matches ${m.matching_skills.length} of ${typedJD.required_skills.length} required skills with ${m.candidate_experience} years of experience.`;
      }
    });

    await Promise.all(explanationPromises);

    matches.forEach((m) => {
      if (!m.match_explanation) {
        m.match_explanation = `${m.candidate_name} has ${m.matching_skills.length} of ${typedJD.required_skills.length} required skills and ${m.candidate_experience} years of experience.`;
      }
    });

    return NextResponse.json({ matches, source: matches[0]?.source || source });
  } catch (error) {
    console.error('Candidate match error:', error);
    return NextResponse.json({ error: 'Failed to match candidates.' }, { status: 500 });
  }
}
