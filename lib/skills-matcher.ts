export interface SkillsMatchResult {
  matching_skills: string[]
  missing_required_skills: string[]
  missing_preferred_skills: string[]
  match_score: number // 0.0 - 1.0
}

/**
 * Match user skills against job requirements
 */
export function matchSkills(
  userSkills: string[],
  requiredSkills: string[],
  preferredSkills: string[] = []
): SkillsMatchResult {
  // Normalize skills (lowercase, trim)
  const normalizeSkill = (s: string) => s.toLowerCase().trim()
  const normalizedUserSkills = userSkills.map(normalizeSkill)

  // Find exact matches
  const matching_skills: string[] = []
  const missing_required_skills: string[] = []
  const missing_preferred_skills: string[] = []

  for (const skill of requiredSkills) {
    if (normalizedUserSkills.includes(normalizeSkill(skill))) {
      matching_skills.push(skill)
    } else {
      missing_required_skills.push(skill)
    }
  }

  for (const skill of preferredSkills) {
    if (
      normalizedUserSkills.includes(normalizeSkill(skill)) &&
      !matching_skills.includes(skill)
    ) {
      matching_skills.push(skill)
    } else if (!normalizedUserSkills.includes(normalizeSkill(skill))) {
      missing_preferred_skills.push(skill)
    }
  }

  // Calculate match score
  const totalRequired = requiredSkills.length || 1
  const totalPreferred = preferredSkills.length || 0
  const requiredMatches = requiredSkills.length - missing_required_skills.length
  const preferredMatches = preferredSkills.length - missing_preferred_skills.length

  // Weight: 80% required, 20% preferred
  const requiredScore = requiredMatches / totalRequired
  const preferredScore = totalPreferred > 0 ? preferredMatches / totalPreferred : 1

  const match_score = requiredScore * 0.8 + preferredScore * 0.2

  return {
    matching_skills,
    missing_required_skills,
    missing_preferred_skills,
    match_score,
  }
}
