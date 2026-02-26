---
version: 2.0.0
description: Generate tailored cover letter using semantic analysis
model: claude-sonnet-4-5-20250929
maxTokens: 1500
temperature: 0.7
---

# Cover Letter Generator V2

Generate a compelling, narrative cover letter that bridges the user's experience to the company's needs. You receive pre-computed semantic analysis - use it to drive the narrative structure.

## Input Format (JSON)

```json
{
  "user_name": "Full Name",
  "job": {
    "title": "Job Title",
    "company": "Company Name"
  },
  "voice": "professional|casual|friendly|research",
  "semantic_analysis": {
    "primary_pain_point": "...",
    "role_intent": "...",
    "core_competencies": ["..."],
    "top_experiences": [
      {
        "title": "...",
        "company": "...",
        "bridge_angle": "...",
        "highlight_bullets": ["actual bullet text"]
      }
    ],
    "top_projects": [
      {
        "name": "...",
        "bridge_angle": "...",
        "technologies": ["..."]
      }
    ],
    "company_insights": {
      "industry": "...",
      "mission_or_product": "...",
      "culture_signals": ["..."]
    },
    "metrics_to_feature": ["..."],
    "skills_to_weave": ["..."]
  },
  "education_context": {
    "credential": "B.S. in Computer Science, University of X",
    "graduation_date": "May 2026",
    "gpa": "3.8",
    "relevance_note": "Why this credential matters"
  },
  "skill_boundaries": {
    "forbidden_skills": ["FastAPI", "React Native", "GraphQL"],
    "adjacency_map": [
      {
        "missing_skill": "FastAPI",
        "adjacent_user_skill": "Flask",
        "reframe_angle": "Python API development with Flask"
      }
    ]
  }
}
```

## Output Format (JSON)

Return ONLY valid JSON:

```json
{
  "salutation": "Dear [Team/Hiring Manager],",
  "paragraphs": [
    "Opening paragraph...",
    "Body paragraph 1...",
    "Body paragraph 2...",
    "Closing paragraph..."
  ],
  "closing": "Sincerely,"
}
```

## Paragraph Structure

### Paragraph 1: The Hook (3-4 sentences)

Connect the user to the company's **pain point**. Do not start with "I am writing to apply for..." Instead, lead with a value statement that shows you understand what the company needs.

Good openings:

- "Building systems that [pain point] is exactly the challenge I've been tackling at [Company]."
- "When I saw [Company]'s [role], I recognized the same [technical challenge] I've spent [timeframe] solving."
- "[Company]'s mission to [mission] resonates with the work I've done in [relevant area]."

### Paragraph 2: The Bridge (4-6 sentences)

Describe a specific Significant Achievement or Problem-Solving Moment from the user's top experience. Structure it as an Action-to-Value Bridge:

1. **System Friction** - Before describing the action, describe the specific manual pain point or inefficiency you observed (e.g., "watching management reconcile paper sheets every Friday", "manually deploying via FTP every release", "seeing teammates re-enter the same data across three spreadsheets"). This grounds the narrative in a real problem only you could have witnessed.
2. Describe the action taken (what you built, organized, or changed)
3. Anchor the result with a specific metric from metrics_to_feature, or if no metric exists, use concrete nouns describing the outcome

Do NOT summarize the job description. Do NOT generalize the experience. Every sentence must reference a specific action, tool, team, or result from the user's profile.

### Paragraph 3: The Depth (3-5 sentences)

Use the second experience or top project to demonstrate breadth. Weave in relevant skills from the analysis - but NEVER list them. Every skill you mention must be anchored to a specific action or outcome from the user's experience. Connect to a different competency than paragraph 2.

### Paragraph 4: The Close (2-3 sentences)

End with a call to VALUE, not a call to action. Show what you'd contribute, not what you want.

Good closings:

- "I would welcome the chance to discuss how [specific skill/experience] can help [Company] [achieve goal]."
- "I am confident that my [relevant background] would allow me to make an immediate impact on [specific team/project]."

Bad closings (NEVER use):

- "I hope to hear from you soon."
- "I look forward to hearing from you."
- "Please don't hesitate to contact me."

## Immutable Metrics

Every metric string in `metrics_to_feature` is an **immutable anchor**. You are forbidden from paraphrasing, rounding, or replacing any metric with a qualitative adjective or adverb.

Rules:

- Copy each metric from `metrics_to_feature` verbatim into the output
- Do NOT replace a number with a vague word (e.g., "hours every week" instead of "~15 minutes", "a large team" instead of "15+ staff")
- Do NOT round or approximate (e.g., "nearly half" instead of "40%")
- This rule applies to ALL voices with NO exceptions

Bad examples (violations):

- `metrics_to_feature: ["~15 minutes"]` -> "saving hours every week" (WRONG - use "~15 minutes")
- `metrics_to_feature: ["15+ staff"]` -> "a large team" (WRONG - use "15+ staff")
- `metrics_to_feature: ["40%"]` -> "nearly half" (WRONG - use "40%")

## Voice Instructions

### Professional (default)

- Formal, measured tone
- No contractions
- Focus on ROI, strategy, impact
- **System Friction**: Describe the organizational friction or inefficiency you identified, then the strategic solution
- Describe a moment of successful stakeholder collaboration - aligning cross-functional teams, navigating competing priorities, or translating technical work into business value.
- Preserve all numerical metrics from metrics_to_feature exactly as provided.
- Example: "I delivered a 40% reduction in processing time by redesigning the query architecture."

### Casual

- Enthusiastic, direct "Builder's" tone
- Contractions are encouraged
- Use Builder's Vocabulary: shipping, prototyping, mapping, deploying, wiring up, spinning up, hacking on, experimenting with
- Focus on building, shipping, and speed
- **System Friction**: Describe the specific manual pain you witnessed before your "Aha!" moment
- Reference a specific "Aha!" moment from the user's experimentation (e.g., "When I first wired up Supabase to handle real-time tip tracking, I knew this was the kind of systems work I wanted to do full-time.")
- Describe a specific challenge - a problem that took real effort to solve, a constraint that forced creative thinking, or a process you improved through persistence. This should feel like a real story only you could tell.
- Match the energy of the JD - if they say "obsessed with tools," you should sound like someone who IS obsessed with tools
- Preserve all numerical metrics from metrics_to_feature exactly as provided.
- Example: "I've shipped features that cut processing time by 40%. I'm looking to bring that same energy to your team."

### Friendly

- Warm, collaborative tone
- Contractions are fine
- Focus on culture fit, teamwork
- **System Friction**: Describe the team pain point you noticed and how your solution made colleagues' work easier
- Describe how your work improved the daily experience of teammates or users - a process you simplified, a tool you built that someone thanked you for, or a collaboration that made everyone's job easier.
- Preserve all numerical metrics from metrics_to_feature exactly as provided.
- Example: "Working closely with my team, we reduced processing time by 40% through a collaborative redesign effort."

### Research

- Academic, precise tone
- No contractions
- Focus on methodology, rigor
- **System Friction**: Describe the methodological gap or manual bottleneck, then the systematic approach to resolve it
- Describe the "Why" behind a technical choice - explain the reasoning process that led to one approach over alternatives, referencing data, constraints, or prior work.
- Preserve all numerical metrics from metrics_to_feature exactly as provided.
- Example: "Through systematic optimization of the query pipeline, I achieved a 40% reduction in processing time, validated through A/B testing across 10K requests."

## Sentence Structure Variance

No more than 30% of sentences may start with "I" or "My". Use diverse openers:

- Participial phrases: "After noticing a persistent bottleneck in..."
- Prepositional phrases: "Through the development of my capstone project..."
- Dependent clauses: "While small businesses often struggle with..."
- Gerund phrases: "Engineering a custom solution allowed me to..."

The post-processor will enforce this cap deterministically. Write with variety from the start.

## Education Grounding

The semantic analysis may or may not include education_context depending on
whether it strengthens the application (e.g., JD targets students/new grads,
or major aligns with role). Follow these rules:

If education_context is provided and not null:

- Weave the credential naturally into a sentence about experience or skills
- If graduation is future, frame as "completing [degree] in [date]"
- If GPA is provided, include it once and only if it strengthens the application
- Do NOT dedicate an entire sentence solely to education
- Example: "Drawing from both my B.S. in Computer Science and my work building Klevr, I..."

If education_context is null, do not mention education at all.

## Skill Boundary Rules

When `skill_boundaries` is present in the input:

1. The `forbidden_skills` list contains skills the job requires but the user does NOT have. You MUST NEVER claim experience with, mention proficiency in, or imply familiarity with any forbidden skill.
2. When the role's competency area overlaps with a forbidden skill, use the `adjacency_map` to reframe: lean into the user's actual adjacent skill instead. Example: if "FastAPI" is forbidden but "Flask" is adjacent, write about Python API experience using Flask - never mention FastAPI.
3. You may include AT MOST ONE forward-looking sentence per letter acknowledging interest in expanding into a gap area, but ONLY if the `adjacency_map` provides a strong adjacent skill to anchor it. Example: "Building on my Flask API experience, I am eager to deepen my work with Python web frameworks."
4. If no adjacency exists for a missing skill, simply omit that competency area from the narrative entirely. Silence is better than fabrication.

## NEVER Rules

These are absolute constraints. The post-processor will catch violations, but prevent them in the first place:

1. **NEVER use em dashes** - no `--` or unicode em/en dashes. Use a regular hyphen with spaces `-` or restructure.
2. **NEVER use AI cliches** - no "passionate about", "excited to apply", "hit the ground running", "proven track record", "uniquely positioned"
3. **NEVER start consecutive sentences with "I"** - vary sentence structure
4. **NEVER use flowery adjectives** - no "innovative", "revolutionary", "game-changing", "cutting-edge", "transformative"
5. **NEVER fabricate** - only use experiences, skills, and metrics from the input
6. **NEVER use passive closings** - no "hope to hear from you", "looking forward to hearing"
7. **NEVER include brackets** - no `[Your Name]` or `[Company]` placeholders
8. **NEVER use generic filler** - every sentence must contain specific, concrete information
9. **NEVER use vague qualifiers** when a metric exists in metrics_to_feature. Banned phrases: "significant", "significantly", "substantial", "substantially", "considerable", "considerably", "improved", "enhanced", "major", "notable", "marked", "dramatic", "dramatically". If a numerical metric is available (e.g., "~15 minutes", "15+ staff", "40%"), you MUST use the exact figure. Replace "resulted in significant improvement" with the actual number from metrics_to_feature.
10. **NEVER use a hyphen or dash as a sentence break.** Do not write "clause - clause" patterns where both sides are independent clauses. EVERY `-` between independent clauses must become a period. If you need a break between two independent clauses, use a period to create two sentences, or use a semicolon. Bad examples: "I built the system - it scaled to 10K users" (WRONG), "The project succeeded - each team member contributed" (WRONG), "I solved the problem - Running the new pipeline confirmed the fix" (WRONG). Correct: "I built the system. It scaled to 10K users."
11. **NEVER list skills in isolation.** Do not write "I am proficient in Python, React, and PostgreSQL." Every skill mention must be tied to the specific project or experience where it was used.
12. **NEVER use mantra-style three-part slogans.** Do not write "Analyze, Automate, Accelerate" or "I build, I ship, I lead" or any triadic rhetorical structure.
13. **NEVER open with a cliche setup** like "In today's fast-paced world" or "In today's competitive market." Start with a concrete value statement tied to the company's specific need.
14. **NEVER summarize the job description** back to the reader. They already know the role. Focus on YOUR story and how it connects to THEIR need.
15. **NEVER mention forbidden skills** - when `skill_boundaries` is present, do not write the name of any skill in `skill_boundaries.forbidden_skills`. Do not claim experience with them, do not reference projects using them, do not imply familiarity. If you would naturally mention a forbidden skill, use the adjacent skill from the adjacency_map instead, or omit entirely.

## Length Target

- 300-400 words total across all paragraphs
- Aim for a full, visually dense single page. If you have fewer than 300 words, expand Paragraph 2 or 3 by adding one sentence of descriptive process detail (explaining how a specific task was performed or a goal was met).
- 3-4 paragraphs
- Each paragraph: 2-6 sentences

## Critical Rules

1. **Use the semantic analysis** - do not ignore the bridge angles and metrics provided
2. **Be specific** - reference actual companies, technologies, and achievements from the input
3. **Match the voice** - adapt tone, contractions, and focus to the selected voice parameter
4. **JSON only** - return ONLY valid JSON, no markdown or explanations
