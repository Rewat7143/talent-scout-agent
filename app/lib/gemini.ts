import { GoogleGenerativeAI } from '@google/generative-ai';
import Groq from 'groq-sdk';
import type { ParsedJD, InterestBreakdown, ConversationMessage } from './types';

// ============================================================
// MULTI-PROVIDER AI LAYER
// Tries: 1) Gemini  2) Groq  — whichever key is available
// ============================================================

type Provider = 'gemini' | 'groq';

function getAvailableProvider(): Provider {
  if (process.env.GROQ_API_KEY) return 'groq';
  if (process.env.GEMINI_API_KEY) return 'gemini';
  throw new Error('No AI API key found. Set GEMINI_API_KEY or GROQ_API_KEY in .env.local');
}

async function callGemini(prompt: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
  const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  const result = await model.generateContent(prompt);
  return result.response.text();
}

async function callGroq(prompt: string): Promise<string> {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.7,
    max_tokens: 1024,
  });
  return completion.choices[0]?.message?.content || '';
}

const MAX_RETRIES = 2;

async function callAI(prompt: string): Promise<string> {
  const provider = getAvailableProvider();

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      if (provider === 'groq') {
        return await callGroq(prompt);
      } else {
        return await callGemini(prompt);
      }
    } catch (error: unknown) {
      const err = error as { status?: number; message?: string };
      console.error(`AI call failed (${provider}, attempt ${attempt + 1}):`, err.message || error);

      // On rate limit, try fallback provider
      if (err.status === 429) {
        // Try the other provider if available
        const fallback: Provider = provider === 'gemini' ? 'groq' : 'gemini';
        const fallbackKey = fallback === 'gemini' ? process.env.GEMINI_API_KEY : process.env.GROQ_API_KEY;
        if (fallbackKey) {
          console.log(`Falling back to ${fallback}...`);
          try {
            return fallback === 'groq' ? await callGroq(prompt) : await callGemini(prompt);
          } catch (fallbackErr) {
            console.error(`Fallback ${fallback} also failed:`, fallbackErr);
          }
        }

        // If no fallback, retry with delay
        if (attempt < MAX_RETRIES) {
          const delay = Math.pow(2, attempt + 1) * 3000;
          console.log(`Retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }

      if (attempt === MAX_RETRIES) throw error;
    }
  }
  throw new Error('AI call failed after all retries');
}

// ============================================================
// JD PARSING
// ============================================================
export async function parseJobDescription(jdText: string): Promise<ParsedJD> {
  const prompt = `You are a senior technical recruiter. Parse the following Job Description and extract structured information.

Return ONLY valid JSON with exactly these fields:
{
  "title": "Job title",
  "required_skills": ["skill1", "skill2"],
  "preferred_skills": ["skill1", "skill2"],
  "experience_min": 5,
  "experience_max": null,
  "location": "Location or Remote",
  "culture_keywords": ["keyword1", "keyword2"],
  "role_summary": "2-sentence plain summary of the role"
}

Rules:
- required_skills: Technical skills explicitly required
- preferred_skills: Nice-to-have skills mentioned
- experience_min/max: Extract years; use null if not specified
- culture_keywords: Soft skills, values, work style mentioned
- Keep skill names concise and standardized (e.g., "React" not "React.js framework")

Job Description:
${jdText}`;

  const text = await callAI(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('Failed to parse JD: No valid JSON in response');
  }
  return JSON.parse(jsonMatch[0]) as ParsedJD;
}

// ============================================================
// MATCH EXPLANATION
// ============================================================
export async function generateMatchExplanation(
  jdSummary: string,
  candidateName: string,
  candidateTitle: string,
  candidateSkills: string[],
  candidateExperience: number,
  candidateBio: string,
  matchingSkills: string[],
  missingSkills: string[],
  matchScore: number
): Promise<string> {
  const prompt = `Write a concise 2-sentence explanation of why this candidate matches (or doesn't match) the job.

Job: ${jdSummary}

Candidate: ${candidateName}, ${candidateTitle}
Skills: ${candidateSkills.join(', ')}
Experience: ${candidateExperience} years
Bio: ${candidateBio}
Matching Skills: ${matchingSkills.join(', ')}
Missing Skills: ${missingSkills.join(', ')}
Match Score: ${matchScore}/100

Write in a professional, direct tone. Focus on the strongest match signals and any gaps. Do not mention the score number.`;

  return (await callAI(prompt)).trim();
}

// ============================================================
// SIMULATED OUTREACH CONVERSATION
// ============================================================
export async function simulateOutreach(
  jobTitle: string,
  jobSummary: string,
  candidateName: string,
  candidateTitle: string,
  candidateSkills: string[],
  candidateExperience: number,
  candidateBio: string,
  candidateAvailability: string
): Promise<ConversationMessage[]> {
  const messages: ConversationMessage[] = [];
  const now = new Date();

  const recruiterMsg1 = `Hi ${candidateName}! I came across your profile and was really impressed by your background as a ${candidateTitle}. We have an exciting ${jobTitle} opportunity — ${jobSummary}. Would you be open to a quick chat about it?`;
  messages.push({ role: 'recruiter', content: recruiterMsg1, timestamp: new Date(now.getTime()).toISOString() });

  const resp1 = await callAI(
    `You are roleplaying as ${candidateName}, a ${candidateTitle} with ${candidateExperience} years of experience.
Skills: ${candidateSkills.join(', ')}
Bio: ${candidateBio}
Current job search status: ${candidateAvailability}

Respond naturally and realistically to this recruiter message. If you're "actively_looking", be more enthusiastic. If "passive", be polite but cautious. If "not_looking", be brief and less interested.
Keep response under 80 words. Be conversational, not formal.

Recruiter message: "${recruiterMsg1}"`
  );
  messages.push({ role: 'candidate', content: resp1.trim(), timestamp: new Date(now.getTime() + 3600000).toISOString() });

  const recruiterMsg2 = `That's great to hear! I'd love to learn more about what you're looking for in your next role. What aspects of your current work are you most passionate about, and is there anything specific you'd want in a new opportunity — like team size, tech stack, or work culture?`;
  messages.push({ role: 'recruiter', content: recruiterMsg2, timestamp: new Date(now.getTime() + 7200000).toISOString() });

  const resp2 = await callAI(
    `You are continuing a conversation as ${candidateName}, a ${candidateTitle} with ${candidateExperience} years of experience.
Skills: ${candidateSkills.join(', ')}
Bio: ${candidateBio}
Current job search status: ${candidateAvailability}

Previous conversation:
Recruiter: "${recruiterMsg1}"
You: "${resp1.trim()}"

Now respond to this follow-up naturally. Share what you're looking for — be specific about preferences based on your bio and skills. Keep under 100 words.

Recruiter message: "${recruiterMsg2}"`
  );
  messages.push({ role: 'candidate', content: resp2.trim(), timestamp: new Date(now.getTime() + 10800000).toISOString() });

  const recruiterMsg3 = `Thanks for sharing that! Based on what you've told me, I think this could be a strong fit. The role involves working with ${candidateSkills.slice(0, 3).join(', ')} and the team values autonomy and fast iteration. Would you be available for a more detailed conversation this week?`;
  messages.push({ role: 'recruiter', content: recruiterMsg3, timestamp: new Date(now.getTime() + 14400000).toISOString() });

  const resp3 = await callAI(
    `You are continuing a conversation as ${candidateName}, a ${candidateTitle} with ${candidateExperience} years of experience.
Skills: ${candidateSkills.join(', ')}
Bio: ${candidateBio}
Current job search status: ${candidateAvailability}

Previous conversation:
Recruiter: "${recruiterMsg1}"
You: "${resp1.trim()}"
Recruiter: "${recruiterMsg2}"
You: "${resp2.trim()}"

Now give your final response. If interested, suggest times or ask specific questions about the role. If not interested, politely decline. Keep under 80 words.

Recruiter message: "${recruiterMsg3}"`
  );
  messages.push({ role: 'candidate', content: resp3.trim(), timestamp: new Date(now.getTime() + 18000000).toISOString() });

  return messages;
}

// ============================================================
// INTEREST SCORING
// ============================================================
export async function scoreInterest(
  candidateResponses: string[],
  candidateAvailability: string
): Promise<InterestBreakdown> {
  const prompt = `Analyze this candidate's responses in a recruiter outreach conversation.
Score their interest level on 4 dimensions (0-25 each, total 0-100):

1. enthusiasm: How excited are they about this specific opportunity?
2. availability: Are they actively looking / open to move? Do they suggest next steps?
3. cultural_fit: Do they mention values, team dynamics, or culture alignment?
4. specificity: Do they ask specific questions or engage with role details?

Candidate's current status: ${candidateAvailability}

Candidate responses:
${candidateResponses.map((r, i) => `Response ${i + 1}: "${r}"`).join('\n')}

Return ONLY valid JSON:
{"enthusiasm": N, "availability": N, "cultural_fit": N, "specificity": N, "explanation": "1-2 sentence summary of interest level"}`;

  const text = await callAI(prompt);
  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    const base = candidateAvailability === 'actively_looking' ? 18 : candidateAvailability === 'open' ? 14 : 8;
    return { enthusiasm: base, availability: base, cultural_fit: base, specificity: base, explanation: 'Auto-scored based on availability status.' };
  }
  return JSON.parse(jsonMatch[0]) as InterestBreakdown;
}

// ============================================================
// EMAIL DRAFT GENERATION
// ============================================================
export async function generateEmailDraft(
  recruiterName: string,
  companyName: string,
  jobTitle: string,
  jobSummary: string,
  candidateName: string,
  candidateTitle: string,
  matchingSkills: string[],
  matchExplanation: string
): Promise<string> {
  const prompt = `Write a personalized recruiter outreach email that sounds human and warm — not templated.

From: ${recruiterName || 'The Hiring Team'} at ${companyName || 'Our Company'}
To: ${candidateName} (${candidateTitle})
Role: ${jobTitle}
About the role: ${jobSummary}
Why they match: ${matchExplanation}
Their matching skills: ${matchingSkills.join(', ')}

Guidelines:
- Subject line should be catchy and specific (not "Exciting opportunity!")
- Open with something personal about their background
- Keep it under 150 words
- End with a clear, low-pressure CTA
- Sound like a real person, not a template
- Format as: Subject: [subject]\n\n[body]`;

  return (await callAI(prompt)).trim();
}
