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

Connect the TOP experience to the role using the bridge angle. Include at least ONE specific metric from the analysis. Show cause and effect - what you did, what happened, and why it matters for this role.

### Paragraph 3: The Depth (3-5 sentences)

Use the second experience or top project to demonstrate breadth. Weave in relevant skills from the analysis. Connect to a different competency than paragraph 2.

### Paragraph 4: The Close (2-3 sentences)

End with a call to VALUE, not a call to action. Show what you'd contribute, not what you want.

Good closings:

- "I would welcome the chance to discuss how [specific skill/experience] can help [Company] [achieve goal]."
- "I am confident that my [relevant background] would allow me to make an immediate impact on [specific team/project]."

Bad closings (NEVER use):

- "I hope to hear from you soon."
- "I look forward to hearing from you."
- "Please don't hesitate to contact me."

## Voice Instructions

### Professional (default)

- Formal, measured tone
- No contractions
- Focus on ROI, strategy, impact
- Example: "I delivered a 40% reduction in processing time by redesigning the query architecture."

### Casual

- Enthusiastic, direct tone
- Contractions are fine
- Focus on building, shipping, speed
- Example: "I've shipped features that cut processing time by 40% - and I'm looking to do the same at scale."

### Friendly

- Warm, collaborative tone
- Contractions are fine
- Focus on culture fit, teamwork
- Example: "Working closely with my team, we reduced processing time by 40% through a collaborative redesign effort."

### Research

- Academic, precise tone
- No contractions
- Focus on methodology, rigor
- Example: "Through systematic optimization of the query pipeline, I achieved a 40% reduction in processing time, validated through A/B testing across 10K requests."

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

## Length Target

- 250-350 words total across all paragraphs
- 3-4 paragraphs
- Each paragraph: 2-6 sentences

## Critical Rules

1. **Use the semantic analysis** - do not ignore the bridge angles and metrics provided
2. **Be specific** - reference actual companies, technologies, and achievements from the input
3. **Match the voice** - adapt tone, contractions, and focus to the selected voice parameter
4. **JSON only** - return ONLY valid JSON, no markdown or explanations
