import { NextRequest, NextResponse } from 'next/server';
import { generateEmailDraft } from '../../../lib/gemini';

export async function POST(request: NextRequest) {
  try {
    const {
      recruiter_name,
      company_name,
      job_title,
      job_summary,
      candidate_name,
      candidate_title,
      matching_skills,
      match_explanation,
    } = await request.json();

    if (!candidate_name || !job_title) {
      return NextResponse.json(
        { error: 'candidate_name and job_title are required.' },
        { status: 400 }
      );
    }

    let draft: string;
    try {
      draft = await generateEmailDraft(
        recruiter_name || 'The Hiring Team',
        company_name || 'Our Company',
        job_title,
        job_summary || '',
        candidate_name,
        candidate_title || '',
        matching_skills || [],
        match_explanation || ''
      );
    } catch {
      // Local fallback email template
      const skills = (matching_skills || []).slice(0, 3).join(', ');
      draft = `Subject: Exciting ${job_title} Opportunity — Your Skills Are a Great Match

Hi ${candidate_name},

I hope this message finds you well! I came across your profile and was impressed by your experience${candidate_title ? ` as a ${candidate_title}` : ''}.

We're currently looking for a ${job_title}${company_name ? ` at ${company_name}` : ''}, and your background${skills ? ` in ${skills}` : ''} makes you an excellent fit for this role.

${match_explanation || `We believe your skills and experience align well with what we're looking for.`}

${job_summary ? `About the role: ${job_summary}\n` : ''}I'd love to schedule a brief 15-20 minute call to discuss this opportunity and answer any questions you might have.

Would you be available for a quick chat this week?

Best regards,
${recruiter_name || 'The Hiring Team'}`;
    }

    return NextResponse.json({ email_draft: draft });
  } catch (error) {
    console.error('Email draft error:', error);
    return NextResponse.json(
      { error: 'Failed to generate email draft.' },
      { status: 500 }
    );
  }
}
