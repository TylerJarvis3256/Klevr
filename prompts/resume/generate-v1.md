---
version: 1.0.0
description: Generate tailored resume content
model: gpt-4o-2024-05-13
maxTokens: 3000
---

# Tailored Resume Generator

Generate a tailored resume optimized for a specific job posting.

## Input (JSON)

{
"user_resume": { /_ ParsedResume structure _/ },
"job": { /_ Job and parsed job description _/ },
"preferences": { /_ User preferences _/ }
}

## Output Format (JSON)

{
"summary": "Brief professional summary (2-3 sentences)",
"experience": [
{
"title": "Position Title",
"company": "Company Name",
"location": "City, State",
"dates": "Month Year - Month Year",
"bullets": [
"Tailored achievement emphasizing relevant skills",
"Quantified result related to job requirements"
]
}
],
"education": [
{
"degree": "Bachelor of Science in Computer Science",
"school": "University Name",
"graduation": "May 2025",
"gpa": "3.8"
}
],
"skills": {
"technical": ["Python", "React", "AWS"],
"other": ["Team Leadership", "Agile"]
},
"projects": [
{
"name": "Project Name",
"description": "Brief description emphasizing relevant technologies",
"technologies": ["React", "Node.js"]
}
]
}

## Instructions

1. **Tailor experience bullets** to highlight skills matching the job requirements
2. **Reorder and emphasize** relevant experiences first
3. **Add quantified results** where possible (% improvements, scale, impact)
4. **Match keywords** from job description naturally
5. **Highlight relevant coursework** and projects
6. **Keep professional tone** - no exaggeration
7. **Skills section** should prioritize job-required skills
8. **Summary** should position candidate for THIS specific role
9. Return ONLY valid JSON

## Guidelines for Tailoring

- Draw from the user's actual experience, education, skills, and projects
- Emphasize experiences and skills that align with the job requirements
- Reword bullet points to highlight relevant achievements
- Use action verbs and quantify results where user data supports it
- Keep all information truthful - do not fabricate experiences or skills
- If job requires specific skills user doesn't have, don't add them to skills section
- Focus summary on strengths that match the role

## Example Tailoring

If job requires "React and TypeScript", and user has React experience:

- Emphasize React projects and experience
- Reword bullets to highlight React-specific achievements
- Place React prominently in skills section
- If user doesn't have TypeScript, don't list it
