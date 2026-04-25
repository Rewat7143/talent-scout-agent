/**
 * Mock/fallback implementations that work without Gemini API.
 * Used when GEMINI_API_KEY is missing or quota is exhausted.
 */

import type { ParsedJD, InterestBreakdown, ConversationMessage } from './types';

export function mockParseJD(jdText: string): ParsedJD {
  const text = jdText.toLowerCase();

  // Extract skills by keyword matching
  const skillKeywords = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Go', 'Rust', 'Java',
    'PostgreSQL', 'MongoDB', 'Redis', 'MySQL', 'SQL', 'GraphQL', 'REST',
    'Docker', 'Kubernetes', 'AWS', 'GCP', 'Azure', 'Terraform',
    'Next.js', 'Vue.js', 'Angular', 'Svelte', 'Express',
    'CI/CD', 'Git', 'Linux', 'Figma', 'Swift', 'Kotlin',
    'TensorFlow', 'PyTorch', 'Machine Learning', 'LLM', 'RAG',
    'HTML', 'CSS', 'Tailwind', 'Sass', 'FastAPI', 'Django', 'Spring Boot',
  ];

  const required: string[] = [];
  const preferred: string[] = [];
  skillKeywords.forEach((skill) => {
    if (text.includes(skill.toLowerCase())) {
      if (text.includes(`require`) || required.length < 5) {
        required.push(skill);
      } else {
        preferred.push(skill);
      }
    }
  });

  // If nothing matched, infer from common patterns
  if (required.length === 0) {
    required.push('JavaScript', 'HTML', 'CSS');
  }

  // Extract experience
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  const expMin = expMatch ? parseInt(expMatch[1]) : 3;

  // Extract location
  let location = 'Remote';
  if (text.includes('remote')) location = 'Remote';
  else if (text.includes('hybrid')) location = 'Hybrid';
  else if (text.includes('on-site') || text.includes('onsite')) location = 'On-site';

  // Culture keywords
  const cultureWords = ['autonomy', 'collaboration', 'fast-paced', 'innovation',
    'communication', 'teamwork', 'agile', 'ownership', 'growth', 'mentoring',
    'fast iteration', 'startup', 'inclusive'];
  const culture = cultureWords.filter((w) => text.includes(w));

  // Extract title
  const titlePatterns = [
    /(?:looking for|hiring|seeking)\s+(?:a|an)\s+(.+?)(?:\s+to\s+|\s+who\s+|\s+at\s+|\.|\n)/i,
    /(senior|junior|lead|staff|principal)?\s*([\w\s]+?engineer|[\w\s]+?developer|[\w\s]+?designer|[\w\s]+?manager)/i,
  ];
  let title = 'Software Engineer';
  for (const pattern of titlePatterns) {
    const match = jdText.match(pattern);
    if (match) {
      title = (match[1] || '').trim() || match[0].trim();
      title = title.replace(/^(a|an)\s+/i, '').substring(0, 50);
      break;
    }
  }

  return {
    title,
    required_skills: required.slice(0, 6),
    preferred_skills: preferred.slice(0, 4),
    experience_min: expMin,
    experience_max: expMin + 3,
    location,
    culture_keywords: culture.length > 0 ? culture : ['collaboration', 'growth'],
    role_summary: `${title} role requiring ${required.slice(0, 3).join(', ')} with ${expMin}+ years of experience. ${location}-friendly position.`,
  };
}

export function mockMatchExplanation(
  candidateName: string,
  candidateTitle: string,
  matchingSkills: string[],
  missingSkills: string[],
  experience: number,
  requiredCount: number
): string {
  const matchRatio = matchingSkills.length;
  if (matchRatio >= requiredCount * 0.8) {
    return `${candidateName} is a strong match with ${matchingSkills.length} of ${requiredCount} required skills including ${matchingSkills.slice(0, 2).join(' and ')}. Their ${experience} years of experience as a ${candidateTitle} aligns well with the role requirements.`;
  } else if (matchRatio >= requiredCount * 0.5) {
    return `${candidateName} covers ${matchingSkills.length} of ${requiredCount} required skills but is missing ${missingSkills.slice(0, 2).join(' and ')}. Their ${experience} years as a ${candidateTitle} partially align with the position.`;
  }
  return `${candidateName} matches ${matchingSkills.length} of ${requiredCount} required skills. While their ${candidateTitle} background provides some relevant experience, there are gaps in ${missingSkills.slice(0, 2).join(' and ')}.`;
}

const CANDIDATE_RESPONSES: Record<string, string[][]> = {
  actively_looking: [
    [
      "Thanks so much for reaching out! I've actually been keeping an eye out for opportunities like this. My current role has been great for growth, but I'm ready for my next challenge. I'd love to hear more about the team and what you're building.",
      "Great question! I'm really looking for a team that values autonomy and ships fast. I love working on problems where I can see direct impact. Tech stack-wise, I'm flexible but love working with modern tools. Small teams are definitely my sweet spot.",
      "This sounds like exactly what I've been looking for! I'm available for a deeper conversation anytime this week. Would a 30-minute call work? I'd love to learn more about the technical challenges and the team culture.",
    ],
    [
      "Hey! Really appreciate you reaching out. I just started exploring new opportunities and this caught my eye. The tech stack you mentioned is right in my wheelhouse. Tell me more!",
      "I'm passionate about building products that users actually love. I thrive in environments where I can take ownership and move quickly. Culture is huge for me — I want to be somewhere that invests in its people and ships quality work.",
      "I'm definitely interested! Let me know when works for you this week. I could do mornings or afternoons. Also curious — what's the team size and what stage is the product at?",
    ],
  ],
  open: [
    [
      "Hi, thanks for thinking of me! I'm not actively searching, but I'm always open to hearing about interesting opportunities. Can you share a bit more about the team and what makes this role unique?",
      "I enjoy working on technically challenging problems with smart people. Ideally, I'd want a role where I can grow into more senior responsibilities. A good work-life balance and supportive culture matter a lot to me.",
      "Sounds intriguing! I'd be open to a casual conversation. Maybe later this week or early next? No pressure, just want to learn more before making any decisions.",
    ],
    [
      "Hey, appreciate the message! I'm fairly happy where I am, but the role does sound interesting. What's the company's growth trajectory looking like?",
      "Honestly, I care a lot about the people I work with and the problems I'm solving. If the engineering culture is strong and there's room for impact, that's what excites me. Compensation is important too, of course.",
      "Sure, let's chat. I could do a quick call next week. I'd want to understand more about the day-to-day before committing to anything formal.",
    ],
  ],
  passive: [
    [
      "Hi, thanks for reaching out. I'm pretty settled in my current position, but I appreciate you thinking of me. What's the high-level pitch?",
      "My current role gives me a lot of what I need — good team, interesting problems, solid compensation. I'd need something really compelling to consider a move. Not ruling anything out though.",
      "Let me think about it. I'm not actively looking to make a move right now, but if you want to send over more details about the role and compensation range, I'd review them.",
    ],
    [
      "Thanks for the message. I'm not really looking to change roles at the moment. My team is working on some exciting projects and I'm committed to seeing them through.",
      "When I do eventually look for something new, I'd want a significant step up in scope or impact. I'd also want to ensure the company is well-funded and the culture is healthy.",
      "I'll pass for now, but feel free to circle back in a few months. You never know what the future holds. Best of luck with the search!",
    ],
  ],
  not_looking: [
    [
      "Thanks for reaching out, but I'm really not looking to make a change right now. I just started a new role that I'm excited about.",
      "I appreciate the interest, but I'm fully committed to my current team. We're in the middle of a big initiative that I want to see through.",
      "I'll have to pass, but thanks for thinking of me. Maybe reach out again in a year or so.",
    ],
    [
      "Hey, I appreciate it, but the timing isn't right for me. Happy where I am currently.",
      "Not really open to exploring anything right now. My focus is fully on my current projects.",
      "Thanks but no thanks for now. Feel free to keep me in mind for the future though!",
    ],
  ],
};

export function mockOutreach(
  candidateName: string,
  candidateTitle: string,
  candidateSkills: string[],
  candidateExperience: number,
  candidateBio: string,
  candidateAvailability: string,
  jobTitle: string,
  jobSummary: string,
): ConversationMessage[] {
  const now = new Date();
  const avail = candidateAvailability as keyof typeof CANDIDATE_RESPONSES;
  const responseSet = CANDIDATE_RESPONSES[avail] || CANDIDATE_RESPONSES.open;
  const variant = Math.floor(Math.random() * responseSet.length);
  const responses = responseSet[variant];

  return [
    {
      role: 'recruiter',
      content: `Hi ${candidateName}! I came across your profile and was really impressed by your background as a ${candidateTitle}. We have an exciting ${jobTitle} opportunity — ${jobSummary}. Would you be open to a quick chat about it?`,
      timestamp: new Date(now.getTime()).toISOString(),
    },
    {
      role: 'candidate',
      content: responses[0],
      timestamp: new Date(now.getTime() + 3600000).toISOString(),
    },
    {
      role: 'recruiter',
      content: `That's great to hear! I'd love to learn more about what you're looking for in your next role. What aspects of your current work are you most passionate about, and is there anything specific you'd want in a new opportunity — like team size, tech stack, or work culture?`,
      timestamp: new Date(now.getTime() + 7200000).toISOString(),
    },
    {
      role: 'candidate',
      content: responses[1],
      timestamp: new Date(now.getTime() + 10800000).toISOString(),
    },
    {
      role: 'recruiter',
      content: `Thanks for sharing that! Based on what you've told me, I think this could be a strong fit. The role involves working with ${candidateSkills.slice(0, 3).join(', ')} and the team values autonomy and fast iteration. Would you be available for a more detailed conversation this week?`,
      timestamp: new Date(now.getTime() + 14400000).toISOString(),
    },
    {
      role: 'candidate',
      content: responses[2],
      timestamp: new Date(now.getTime() + 18000000).toISOString(),
    },
  ];
}

export function mockInterestScore(availability: string): InterestBreakdown {
  const scores: Record<string, InterestBreakdown> = {
    actively_looking: {
      enthusiasm: Math.floor(Math.random() * 6) + 19,   // 19-24
      availability: Math.floor(Math.random() * 5) + 20,  // 20-24
      cultural_fit: Math.floor(Math.random() * 8) + 15,  // 15-22
      specificity: Math.floor(Math.random() * 7) + 17,   // 17-23
      explanation: 'Candidate is actively looking and showed strong enthusiasm. They asked specific questions and expressed clear interest in the opportunity.',
    },
    open: {
      enthusiasm: Math.floor(Math.random() * 8) + 14,   // 14-21
      availability: Math.floor(Math.random() * 8) + 13,  // 13-20
      cultural_fit: Math.floor(Math.random() * 8) + 13,  // 13-20
      specificity: Math.floor(Math.random() * 8) + 12,   // 12-19
      explanation: 'Candidate is open to opportunities and showed moderate interest. They engaged thoughtfully but want to learn more before committing.',
    },
    passive: {
      enthusiasm: Math.floor(Math.random() * 8) + 8,    // 8-15
      availability: Math.floor(Math.random() * 7) + 6,   // 6-12
      cultural_fit: Math.floor(Math.random() * 8) + 10,  // 10-17
      specificity: Math.floor(Math.random() * 7) + 7,    // 7-13
      explanation: 'Candidate is passive and not actively looking. They were polite but showed limited urgency. May need a compelling offer to move.',
    },
    not_looking: {
      enthusiasm: Math.floor(Math.random() * 6) + 3,    // 3-8
      availability: Math.floor(Math.random() * 5) + 2,   // 2-6
      cultural_fit: Math.floor(Math.random() * 6) + 5,   // 5-10
      specificity: Math.floor(Math.random() * 5) + 3,    // 3-7
      explanation: 'Candidate is not looking to move. They declined the opportunity politely. Not a viable lead at this time.',
    },
  };

  return scores[availability] || scores.open;
}

export function mockEmailDraft(
  candidateName: string,
  candidateTitle: string,
  jobTitle: string,
  matchingSkills: string[],
  matchExplanation: string
): string {
  return `Subject: ${candidateName}, your ${matchingSkills[0] || 'engineering'} background caught our eye

Hi ${candidateName},

I came across your work as a ${candidateTitle} and was genuinely impressed. ${matchExplanation}

We're building something exciting and looking for a ${jobTitle} to join the team. Given your experience with ${matchingSkills.slice(0, 3).join(', ')}, I think you'd be a great fit.

Would you be open to a 20-minute call this week to explore if there's mutual interest? No pressure at all — just a casual conversation.

Looking forward to hearing from you!

Best,
The Hiring Team`;
}
