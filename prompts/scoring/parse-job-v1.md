---
version: 1.0.0
description: Extract structured data from job descriptions
model: gpt-4o-mini-2024-07-18
maxTokens: 1500
---

# Job Description Parser

Extract structured information from the job posting.

## Input

Raw job description text

## Output Format (JSON)

{
"required_skills": ["Python", "JavaScript", "React"],
"preferred_skills": ["TypeScript", "AWS", "Docker"],
"education_required": "Bachelor's degree in Computer Science or related field",
"experience_required": "2+ years of software development experience",
"responsibilities": [
"Design and implement features",
"Collaborate with cross-functional teams"
],
"qualifications": [
"Strong problem-solving skills",
"Excellent communication"
],
"job_type": "FULL_TIME",
"level": "ENTRY_LEVEL",
"domain": "Software Engineering"
}

## Instructions

1. Extract technical skills (languages, frameworks, tools)
2. Separate required vs preferred skills
3. Identify education requirements
4. Extract experience requirements
5. Categorize job level: ENTRY_LEVEL, MID_LEVEL, SENIOR
6. Determine job type: INTERNSHIP, FULL_TIME, PART_TIME, CONTRACT
7. Return only valid JSON

## Job Type Classification

- INTERNSHIP: Explicitly mentions "intern", "internship", "co-op", or summer/temporary positions
- FULL_TIME: Standard full-time employment, permanent positions
- PART_TIME: Explicitly part-time or flexible hour positions
- CONTRACT: Contract, temporary, or freelance positions

## Level Classification

- ENTRY_LEVEL: 0-2 years experience, recent graduates, junior positions
- MID_LEVEL: 3-5 years experience, intermediate positions
- SENIOR: 5+ years experience, senior/lead/principal positions

## Domain Classification

Identify the primary domain (e.g., "Software Engineering", "Data Science", "Product Management", "Marketing", "Sales", etc.)
