import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Groq from 'groq-sdk';

@Injectable()
export class GroqService {
  private groq: Groq;

  constructor(private configService: ConfigService) {
    const apiKey = this.configService.get<string>('GROQ_API_KEY');
    if (!apiKey) {
      throw new Error('GROQ_API_KEY is not defined in environment variables');
    }
    this.groq = new Groq({ apiKey });
  }

  async analyzeResume(resumeText: string, jobDescription: string): Promise<any> {
    try {
      const model = 'llama-3.3-70b-versatile';

      const systemPrompt = `You are an expert ATS (Applicant Tracking System) and career coach.
Analyze the resume against the job description provided.

STRICT RULES YOU MUST FOLLOW:
1. NEVER mention any technology, skill, language, or tool that is NOT explicitly written in the resume text
2. The "improved" field must ONLY use technologies and skills that already exist in the resume — just reword them better using keywords from the job description
3. Do NOT add Java, Python, AWS, React, or any language/framework not found in the resume
4. Do NOT invent experience or skills the candidate does not have
5. The "strengths" must come ONLY from what is written in the resume
6. Base ALL output only on what is literally present in the resume text
7. You MUST respond ONLY with a valid JSON object. No explanation, no markdown, no code blocks.`;

      const userMessage = `Resume Text:
${resumeText}

Job Description:
${jobDescription}

IMPORTANT RULES:
- The "original" field in suggestions MUST contain actual text copied word-for-word from the resume above
- The "improved" field must ONLY reword existing resume content — never add skills not in the resume
- If a section has no existing text to improve, skip that suggestion entirely
- Only include suggestions where you can quote real existing resume text in "original"

Respond ONLY with this exact JSON structure:
{
  "matchScore": <number 0-100>,
  "summary": "<2-3 sentence overall assessment based only on resume content>",
  "strengths": ["<strength from resume>", "<strength from resume>", "<strength from resume>"],
  "missingKeywords": ["<keyword from job description not found in resume>", "<keyword 2>", "<keyword 3>"],
  "suggestions": [
    {
      "section": "<exact section name from resume e.g. Work Experience, Skills, Summary>",
      "original": "<copy paste exact existing text from the resume for this section>",
      "improved": "<rewritten version using only skills already in the resume, worded to match job keywords>"
    }
  ],
  "verdict": "<one of: Strong Match | Good Match | Partial Match | Weak Match>"
}`;

      const completion = await this.groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        model,
        temperature: 0.1,
        max_tokens: 2000,
      });

      const responseText = completion.choices[0]?.message?.content;
      if (!responseText) {
        throw new Error('No response from Groq API');
      }

      const analysisResult = JSON.parse(responseText);
      return analysisResult;
    } catch (error) {
      console.error('Groq API Error:', error);
      throw new InternalServerErrorException('Failed to analyze resume with AI');
    }
  }
}