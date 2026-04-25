import { NextRequest, NextResponse } from 'next/server';
import { parseJobDescription } from '../../../lib/gemini';
import type { ParsedJD } from '../../../lib/types';

// Local regex-based fallback parser when AI APIs are unavailable
function parseJDLocally(jdText: string): ParsedJD {
  const text = jdText.toLowerCase();

  // Extract title from first line
  const lines = jdText.trim().split('\n').filter(l => l.trim());
  let title = lines[0]?.replace(/^#+\s*/, '').trim() || 'Software Engineer';
  if (title.length > 60) title = title.slice(0, 60);

  // Known skills to search for
  const KNOWN_SKILLS = [
    'React', 'TypeScript', 'JavaScript', 'Node.js', 'Python', 'Java', 'Go', 'Rust',
    'Ruby', 'C++', 'C#', 'PHP', 'Swift', 'Kotlin', 'SQL', 'PostgreSQL', 'MySQL',
    'MongoDB', 'Redis', 'GraphQL', 'REST', 'Docker', 'Kubernetes', 'AWS', 'GCP',
    'Azure', 'Terraform', 'CI/CD', 'Git', 'Linux', 'Next.js', 'Vue.js', 'Angular',
    'Django', 'Flask', 'FastAPI', 'Spring Boot', 'Express', 'TailwindCSS',
    'Machine Learning', 'Deep Learning', 'PyTorch', 'TensorFlow', 'NLP',
    'LangChain', 'OpenAI', 'Prisma', 'Supabase', 'Firebase',
  ];

  const foundSkills = KNOWN_SKILLS.filter(s => text.includes(s.toLowerCase()));

  // Split into required vs preferred
  const requiredSection = text.includes('required') || text.includes('must have') || text.includes('requirements');
  const preferredSection = text.includes('nice to have') || text.includes('preferred') || text.includes('bonus');

  let required_skills = foundSkills.slice(0, 6);
  let preferred_skills = foundSkills.slice(6, 10);

  if (requiredSection && preferredSection) {
    const reqIdx = Math.max(text.indexOf('required'), text.indexOf('must have'), text.indexOf('requirements'));
    const prefIdx = Math.max(text.indexOf('nice to have'), text.indexOf('preferred'), text.indexOf('bonus'));
    required_skills = foundSkills.filter(s => {
      const pos = text.indexOf(s.toLowerCase());
      return pos < prefIdx || pos < reqIdx + 500;
    }).slice(0, 6);
    preferred_skills = foundSkills.filter(s => !required_skills.includes(s)).slice(0, 4);
  }

  if (required_skills.length === 0) required_skills = ['JavaScript', 'Python'];

  // Extract experience
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)/);
  const experience_min = expMatch ? parseInt(expMatch[1]) : 3;
  const expMaxMatch = text.match(/(\d+)\s*[-–]\s*(\d+)\s*(?:years?|yrs?)/);
  const experience_max = expMaxMatch ? parseInt(expMaxMatch[2]) : null;

  // Location
  let location = 'Remote';
  if (text.includes('remote')) location = 'Remote';
  else if (text.includes('new york') || text.includes('nyc')) location = 'New York';
  else if (text.includes('san francisco') || text.includes('sf')) location = 'San Francisco';
  else if (text.includes('london')) location = 'London';
  else if (text.includes('bangalore') || text.includes('bengaluru')) location = 'Bangalore';

  // Culture keywords
  const CULTURE_WORDS = ['autonomy', 'communication', 'fast-paced', 'collaborative', 'innovation',
    'remote', 'agile', 'ownership', 'growth', 'mentorship', 'diversity', 'iteration'];
  const culture_keywords = CULTURE_WORDS.filter(w => text.includes(w)).slice(0, 4);
  if (culture_keywords.length === 0) culture_keywords.push('collaboration', 'growth');

  // Summary
  const role_summary = `${title} role requiring ${required_skills.slice(0,3).join(', ')} with ${experience_min}+ years of experience. ${location} position.`;

  return { title, required_skills, preferred_skills, experience_min, experience_max, location, culture_keywords, role_summary };
}

export async function POST(request: NextRequest) {
  try {
    const { jd_text } = await request.json();

    if (!jd_text || typeof jd_text !== 'string' || jd_text.trim().length < 20) {
      return NextResponse.json(
        { error: 'Please provide a valid job description (at least 20 characters).' },
        { status: 400 }
      );
    }

    // Try AI parsing first, fall back to local parser
    let parsed: ParsedJD;
    let parseMethod = 'ai';
    try {
      parsed = await parseJobDescription(jd_text.trim());
    } catch (aiError) {
      console.warn('AI parsing failed, using local fallback parser:', (aiError as Error).message?.slice(0, 100));
      parsed = parseJDLocally(jd_text.trim());
      parseMethod = 'local';
    }

    return NextResponse.json({ parsed_jd: parsed, parse_method: parseMethod });
  } catch (error) {
    console.error('JD Parse error:', error);
    return NextResponse.json(
      { error: 'Failed to parse job description.' },
      { status: 500 }
    );
  }
}
