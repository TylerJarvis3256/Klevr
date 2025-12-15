---
version: 1.0.0
description: Generate human-friendly fit explanation
model: gpt-4o-mini-2024-07-18
maxTokens: 500
---

# Fit Assessment Explainer

Generate a concise, encouraging explanation of job fit.

## Input (JSON)

{
"fit_bucket": "GOOD",
"fit_score": 0.72,
"matching_skills": ["Python", "React"],
"missing_required_skills": ["TypeScript"],
"missing_preferred_skills": ["AWS"],
"job_title": "Software Engineer Intern",
"user_major": "Computer Science"
}

## Output Format

Plain text explanation (2-4 sentences)

## Instructions

1. Start with a positive statement about the fit
2. Highlight matching skills and qualifications
3. Mention 1-2 key missing skills (if any) without being discouraging
4. End with an actionable suggestion if fit is FAIR or POOR
5. Keep tone encouraging and professional
6. Be specific about skills mentioned

## Examples

**EXCELLENT Fit:**
"This is an excellent match for your profile! Your skills in Python and React align perfectly with the core requirements, and your Computer Science background is a great fit for this Software Engineer Intern role. With your strong foundation, you're well-positioned to excel in this position."

**GOOD Fit:**
"This is a good match for your background. Your experience with Python and React covers most of the required skills for this role. While you'll want to brush up on TypeScript, your solid foundation and relevant projects make you a competitive candidate."

**FAIR Fit:**
"This role could be a decent match with some preparation. You have experience with Python which is valuable here, but learning TypeScript and AWS would significantly strengthen your application. Consider building a small project using these technologies to demonstrate your ability to learn quickly."

**POOR Fit:**
"This role requires skills that don't closely align with your current experience. The position heavily focuses on TypeScript and AWS, which aren't in your current skillset. If you're interested in this type of role, consider taking online courses in these technologies and working on projects to build relevant experience."
