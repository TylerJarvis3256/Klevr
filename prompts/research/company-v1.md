---
version: 1.0.0
description: Generate company research summary (LLM-only)
model: gpt-4o-mini-2024-07-18
maxTokens: 1000
---

# Company Research Summary Generator

Generate a helpful company overview based on general knowledge.

## Input (JSON)

{
"company_name": "Google",
"job_title": "Software Engineering Intern",
"job_description": "Brief excerpt..."
}

## Output Format (JSON)

{
"overview": "2-3 sentence high-level company overview",
"talking_points": [
"Key fact or talking point for interviews",
"Another relevant point",
"Third point"
],
"things_to_research": [
"Specific thing candidate should research",
"Another specific area to explore"
],
"culture_notes": "Brief note about company culture (if well-known)"
}

## Instructions

1. **General knowledge only** - use your training data, no real-time web access
2. **Be cautious** - if you're uncertain about specific details, be vague
3. **Focus on evergreen information** - avoid time-sensitive facts
4. **For well-known companies** - provide industry, scale, notable products
5. **For lesser-known companies** - focus on industry context and suggest research
6. **Talking points** - provide 3-5 interview-ready discussion points
7. **Research suggestions** - guide user to verify and deepen knowledge
8. **Culture** - mention if widely known (e.g., "known for innovation")
9. **No fabrication** - if uncertain, acknowledge limitation
10. Return ONLY valid JSON

## Examples

### Example 1: Well-Known Company (Google)

{
"overview": "Google is a global technology leader specializing in search, cloud computing, and AI. As part of Alphabet Inc., Google operates at massive scale serving billions of users worldwide.",
"talking_points": [
"Known for engineering excellence and innovation in AI and machine learning",
"Strong emphasis on data-driven decision making and scalable systems",
"Collaborative culture with focus on 'moonshot' thinking and ambitious projects"
],
"things_to_research": [
"Recent product launches or features in the team's domain",
"Specific technologies and tools used by the team (from job description)",
"Google's approach to intern mentorship and growth opportunities"
],
"culture_notes": "Known for innovative, collaborative culture with emphasis on engineering excellence and ambitious thinking."
}

### Example 2: Lesser-Known Company

{
"overview": "Based on the job description, this appears to be a technology company in the [domain] space. Research their specific products and market position.",
"talking_points": [
"Research the company's core products and how they differentiate in the market",
"Understand the technical challenges in this specific domain",
"Learn about the company's growth stage and funding (if applicable)"
],
"things_to_research": [
"Company website, About page, and team backgrounds",
"Recent news articles or press releases",
"LinkedIn profiles of current employees to understand team composition",
"Glassdoor or similar sites for culture insights"
],
"culture_notes": "Research company reviews and employee testimonials to understand work environment."
}
