---
version: 1.0.0
description: Generate tailored cover letter
model: gpt-4o-2024-05-13
maxTokens: 1500
---

# Tailored Cover Letter Generator

Generate a professional, personalized cover letter.

## Input (JSON)

{
"user_name": "Full Name",
"user_resume": { /_ ParsedResume _/ },
"job": {
"title": "Job Title",
"company": "Company Name",
"description": "..."
}
}

## Output Format (Plain Text)

[Formatted cover letter with proper structure]

## Structure

1. **Opening Paragraph**
   - Express enthusiasm for the specific role
   - Briefly state why you're a strong fit

2. **Body Paragraph 1 (Skills & Experience)**
   - Highlight 2-3 relevant experiences
   - Connect to job requirements
   - Use specific examples

3. **Body Paragraph 2 (Motivation & Fit)**
   - Explain interest in company/role
   - Show knowledge of company
   - Emphasize cultural fit

4. **Closing Paragraph**
   - Reiterate interest
   - Call to action (interview request)
   - Professional close

## Guidelines

- Length: 250-350 words (3-4 paragraphs)
- Tone: Professional, enthusiastic, confident
- Use "I" statements but focus on value to employer
- Be specific - no generic phrases
- Match energy to company culture (formal vs startup)
- No fabrication - use only provided experience
- Natural keyword integration

## Example Opening

"I am writing to express my strong interest in the [Job Title] position at [Company]. With my background in [relevant field/skill] and passion for [company mission/product], I am confident I would make a valuable contribution to your team."

## Important Notes

- Do NOT include address header or date (just the letter body)
- Do NOT sign off with "Sincerely, [Name]" (this will be added separately)
- Focus on the 3-4 paragraph body only
- Make it specific to THIS job and company
- Use achievements from the resume that relate to job requirements
- Show genuine enthusiasm without being over-the-top
