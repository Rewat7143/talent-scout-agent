import { NextRequest, NextResponse } from 'next/server';
import { simulateOutreach, scoreInterest } from '../../../lib/gemini';
import { computeCombinedScore } from '../../../lib/scoring';
import type { MatchResult, ParsedJD } from '../../../lib/types';

// Local fallback when both AI APIs are rate-limited
function localOutreach(c: MatchResult, jdTitle: string) {
  const name = c.candidate_name.split(' ')[0];
  const isActive = c.candidate_availability === 'actively_looking';
  const isOpen = c.candidate_availability === 'open';

  const conversation = [
    { role: 'recruiter' as const, content: `Hi ${name}, I came across your profile and was impressed by your work in ${c.candidate_skills.slice(0,2).join(' and ')}. We have a ${jdTitle} role that seems like a great fit. Would you be open to learning more?` },
    { role: 'candidate' as const, content: isActive
      ? `Hi! Thanks for reaching out. I'm actively looking for new opportunities and ${jdTitle} sounds really interesting. I have ${c.candidate_experience} years of experience with ${c.matching_skills.slice(0,2).join(' and ')}. I'd love to hear more details.`
      : isOpen
        ? `Thanks for the message! I'm not actively searching but I'm always open to interesting opportunities. The ${jdTitle} role sounds intriguing — could you share more about the team and tech stack?`
        : `Hi, appreciate you reaching out. I'm fairly content in my current role, but I'm curious about what makes this opportunity unique. What's the team like?` },
    { role: 'recruiter' as const, content: `Great to hear! The role involves ${c.matching_skills.slice(0,3).join(', ')} and we're looking for someone with ${c.candidate_experience}+ years of experience. The team values autonomy and fast iteration. What aspects of your current work do you enjoy most?` },
    { role: 'candidate' as const, content: isActive
      ? `I really enjoy building scalable systems and working with ${c.candidate_skills[0]}. The autonomy aspect appeals to me a lot. I'm available to start soon and would be excited to discuss compensation and team structure.`
      : isOpen
        ? `I enjoy problem-solving and working with ${c.candidate_skills[0]}. The autonomy and iteration speed sound appealing. I'd want to understand the growth trajectory and how this compares to my current situation.`
        : `I do enjoy ${c.candidate_skills[0]} work. However, I'd need to see a compelling reason to make a move. What's the compensation range and remote policy?` },
    { role: 'recruiter' as const, content: `Those are great qualities! We offer competitive compensation, flexible remote work, and strong growth paths. Would you be interested in a 30-minute call to discuss the details?` },
    { role: 'candidate' as const, content: isActive
      ? `Absolutely! I'm very interested and available for a call this week. Please send me some time slots and I'll make it work. Looking forward to it!`
      : isOpen
        ? `Sure, I'd be open to a quick call to learn more. Let me know some options and I'll see what works with my schedule.`
        : `I appreciate the offer. Let me think about it and I'll get back to you. If you could send over a job description and compensation details, that would help me decide.` },
  ];

  // Score based on availability
  const breakdown = {
    enthusiasm: isActive ? 22 : isOpen ? 15 : 8,
    availability: isActive ? 23 : isOpen ? 14 : 6,
    cultural_fit: isActive ? 20 : isOpen ? 16 : 12,
    specificity: isActive ? 19 : isOpen ? 13 : 9,
  };

  const interestScore = breakdown.enthusiasm + breakdown.availability + breakdown.cultural_fit + breakdown.specificity;
  const combinedScore = computeCombinedScore(c.match_score, interestScore);

  return { conversation, interest_breakdown: breakdown, interest_score: interestScore, combined_score: combinedScore };
}

export async function POST(request: NextRequest) {
  try {
    const { candidate, parsed_jd } = await request.json();

    if (!candidate || !parsed_jd) {
      return NextResponse.json(
        { error: 'candidate and parsed_jd are required.' },
        { status: 400 }
      );
    }

    const typedJD = parsed_jd as ParsedJD;
    const c = candidate as MatchResult;

    // Try AI outreach, fall back to local
    try {
      const conversation = await simulateOutreach(
        typedJD.title, typedJD.role_summary,
        c.candidate_name, c.candidate_title,
        c.candidate_skills, c.candidate_experience,
        c.candidate_bio, c.candidate_availability
      );

      const candidateResponses = conversation
        .filter((msg) => msg.role === 'candidate')
        .map((msg) => msg.content);

      const interestBreakdown = await scoreInterest(
        candidateResponses, c.candidate_availability
      );

      const interestScore =
        interestBreakdown.enthusiasm + interestBreakdown.availability +
        interestBreakdown.cultural_fit + interestBreakdown.specificity;

      const combinedScore = computeCombinedScore(c.match_score, interestScore);

      return NextResponse.json({
        conversation, interest_breakdown: interestBreakdown,
        interest_score: interestScore, combined_score: combinedScore,
      });
    } catch (aiError) {
      console.warn('AI outreach failed, using local fallback:', (aiError as Error).message?.slice(0, 80));
      const fallback = localOutreach(c, typedJD.title);
      return NextResponse.json(fallback);
    }
  } catch (error) {
    console.error('Outreach error:', error);
    return NextResponse.json(
      { error: 'Failed to run outreach simulation.' },
      { status: 500 }
    );
  }
}
