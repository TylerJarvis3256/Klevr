import { prisma } from '@/lib/prisma'

interface ParsedResume {
  personal?: {
    name?: string | null
    email?: string | null
    phone?: string | null
    location?: string | null
    linkedin?: string | null
    github?: string | null
    website?: string | null
  }
  education?: Array<{
    school: string
    degree?: string | null
    major?: string | null
    graduationDate?: string | null
    gpa?: string | null
  }>
  experience?: Array<{
    title: string
    company: string
    location?: string | null
    startDate?: string | null
    endDate?: string | null
    current: boolean
    bullets: string[]
  }>
  projects?: Array<{
    name: string
    description?: string | null
    technologies: string[]
    url?: string | null
    github_link?: string | null
  }>
  skills?: {
    languages: string[]
    frameworks: string[]
    tools: string[]
    other: string[]
  }
  certifications?: Array<{
    name: string
    issuer?: string | null
    date?: string | null
  }>
}

/**
 * Migrates a user's parsed_resume data into structured Education, JobExperience, and Bullet tables
 * @param userId - The user's ID
 * @returns Object containing counts of migrated records
 */
export async function migrateUserProfile(userId: string) {
  const profile = await prisma.profile.findUnique({
    where: { user_id: userId },
    select: {
      parsed_resume: true,
      migrated_to_structured: true,
    },
  })

  if (!profile) {
    throw new Error('Profile not found')
  }

  // Skip if already migrated
  if (profile.migrated_to_structured) {
    return {
      alreadyMigrated: true,
      education: 0,
      experiences: 0,
      bullets: 0,
    }
  }

  // Skip if no parsed_resume data
  if (!profile.parsed_resume) {
    // Mark as migrated even if no data (to avoid repeated attempts)
    await prisma.profile.update({
      where: { user_id: userId },
      data: { migrated_to_structured: true },
    })

    return {
      noParsedResume: true,
      education: 0,
      experiences: 0,
      bullets: 0,
    }
  }

  const parsedResume = profile.parsed_resume as ParsedResume

  let educationCount = 0
  let experienceCount = 0
  let bulletCount = 0

  // Use transaction to ensure all-or-nothing migration
  await prisma.$transaction(async (tx) => {
    // 1. Migrate Education
    if (parsedResume.education && parsedResume.education.length > 0) {
      for (let i = 0; i < parsedResume.education.length; i++) {
        const edu = parsedResume.education[i]

        await tx.education.create({
          data: {
            user_id: userId,
            school: edu.school,
            degree: edu.degree || 'Not specified',
            major: edu.major || null,
            graduation_date: edu.graduationDate || 'Not specified',
            gpa: edu.gpa || null,
            location: null, // Not in parsed_resume
            display_order: i,
          },
        })

        educationCount++
      }
    }

    // 2. Migrate Work Experience with Bullets
    if (parsedResume.experience && parsedResume.experience.length > 0) {
      for (let i = 0; i < parsedResume.experience.length; i++) {
        const exp = parsedResume.experience[i]

        const jobExperience = await tx.jobExperience.create({
          data: {
            user_id: userId,
            title: exp.title,
            company: exp.company,
            location: exp.location || null,
            start_date: exp.startDate || 'Not specified',
            end_date: exp.current ? null : (exp.endDate || null),
            is_current: exp.current,
            display_order: i,
          },
        })

        experienceCount++

        // Create bullets for this experience
        if (exp.bullets && exp.bullets.length > 0) {
          for (const bulletText of exp.bullets) {
            if (bulletText.trim()) {
              await tx.bullet.create({
                data: {
                  user_id: userId,
                  experience_id: jobExperience.id,
                  text: bulletText.trim(),
                  tags: [],
                  priority: 0,
                  is_favorite: false,
                },
              })

              bulletCount++
            }
          }
        }
      }
    }

    // 3. Mark profile as migrated
    await tx.profile.update({
      where: { user_id: userId },
      data: { migrated_to_structured: true },
    })
  })

  return {
    success: true,
    education: educationCount,
    experiences: experienceCount,
    bullets: bulletCount,
  }
}

/**
 * Populates structured data from a parsed_resume object (used during resume confirmation)
 * This REPLACES existing structured data to ensure sync with parsed_resume
 * @param userId - The user's ID
 * @param parsedResume - The parsed resume data
 */
export async function populateStructuredDataFromParsedResume(
  userId: string,
  parsedResume: ParsedResume
) {
  let educationCount = 0
  let experienceCount = 0
  let bulletCount = 0

  await prisma.$transaction(async (tx) => {
    // Delete existing structured data to avoid duplicates/conflicts
    await tx.bullet.deleteMany({ where: { user_id: userId, experience_id: { not: null } } })
    await tx.jobExperience.deleteMany({ where: { user_id: userId } })
    await tx.education.deleteMany({ where: { user_id: userId } })

    // 1. Populate Education
    if (parsedResume.education && parsedResume.education.length > 0) {
      for (let i = 0; i < parsedResume.education.length; i++) {
        const edu = parsedResume.education[i]

        await tx.education.create({
          data: {
            user_id: userId,
            school: edu.school,
            degree: edu.degree || 'Not specified',
            major: edu.major || null,
            graduation_date: edu.graduationDate || 'Not specified',
            gpa: edu.gpa || null,
            location: null,
            display_order: i,
          },
        })

        educationCount++
      }
    }

    // 2. Populate Work Experience with Bullets
    if (parsedResume.experience && parsedResume.experience.length > 0) {
      for (let i = 0; i < parsedResume.experience.length; i++) {
        const exp = parsedResume.experience[i]

        const jobExperience = await tx.jobExperience.create({
          data: {
            user_id: userId,
            title: exp.title,
            company: exp.company,
            location: exp.location || null,
            start_date: exp.startDate || 'Not specified',
            end_date: exp.current ? null : (exp.endDate || null),
            is_current: exp.current,
            display_order: i,
          },
        })

        experienceCount++

        // Create bullets
        if (exp.bullets && exp.bullets.length > 0) {
          for (const bulletText of exp.bullets) {
            if (bulletText.trim()) {
              await tx.bullet.create({
                data: {
                  user_id: userId,
                  experience_id: jobExperience.id,
                  text: bulletText.trim(),
                  tags: [],
                  priority: 0,
                  is_favorite: false,
                },
              })

              bulletCount++
            }
          }
        }
      }
    }

    // 3. Mark profile as migrated
    await tx.profile.update({
      where: { user_id: userId },
      data: { migrated_to_structured: true },
    })
  })

  return {
    success: true,
    education: educationCount,
    experiences: experienceCount,
    bullets: bulletCount,
  }
}

/**
 * Merges new resume data with existing structured data (ADDITIVE approach)
 * Used for post-onboarding resume updates to add new entries without deleting existing ones
 * @param userId - The user's ID
 * @param parsedResume - The new parsed resume data to merge
 */
export async function mergeStructuredDataFromParsedResume(
  userId: string,
  parsedResume: ParsedResume
) {
  let educationAdded = 0
  let experienceAdded = 0
  let projectsAdded = 0
  let bulletsAdded = 0

  await prisma.$transaction(async (tx) => {
    // Load existing data for duplicate detection
    const existingEducation = await tx.education.findMany({ where: { user_id: userId } })
    const existingExperiences = await tx.jobExperience.findMany({ where: { user_id: userId } })
    const existingProjects = await tx.project.findMany({ where: { user_id: userId } })

    // 1. Merge Education (avoid duplicates based on school + degree)
    if (parsedResume.education && parsedResume.education.length > 0) {
      const maxOrder = existingEducation.length > 0
        ? Math.max(...existingEducation.map(e => e.display_order))
        : -1

      for (const edu of parsedResume.education) {
        const isDuplicate = existingEducation.some(
          (existing) =>
            existing.school.toLowerCase() === edu.school.toLowerCase() &&
            existing.degree?.toLowerCase() === edu.degree?.toLowerCase()
        )

        if (!isDuplicate) {
          await tx.education.create({
            data: {
              user_id: userId,
              school: edu.school,
              degree: edu.degree || 'Not specified',
              major: edu.major || null,
              graduation_date: edu.graduationDate || 'Not specified',
              gpa: edu.gpa || null,
              location: null,
              display_order: maxOrder + educationAdded + 1,
            },
          })
          educationAdded++
        }
      }
    }

    // 2. Merge Work Experience (avoid duplicates based on company + title)
    if (parsedResume.experience && parsedResume.experience.length > 0) {
      const maxOrder = existingExperiences.length > 0
        ? Math.max(...existingExperiences.map(e => e.display_order))
        : -1

      for (const exp of parsedResume.experience) {
        const isDuplicate = existingExperiences.some(
          (existing) =>
            existing.company.toLowerCase() === exp.company.toLowerCase() &&
            existing.title.toLowerCase() === exp.title.toLowerCase()
        )

        if (!isDuplicate) {
          const jobExperience = await tx.jobExperience.create({
            data: {
              user_id: userId,
              title: exp.title,
              company: exp.company,
              location: exp.location || null,
              start_date: exp.startDate || 'Not specified',
              end_date: exp.current ? null : (exp.endDate || null),
              is_current: exp.current,
              display_order: maxOrder + experienceAdded + 1,
            },
          })
          experienceAdded++

          // Add bullets for new experience (with deduplication)
          if (exp.bullets && exp.bullets.length > 0) {
            for (const bulletText of exp.bullets) {
              if (bulletText.trim()) {
                // Check if this exact bullet text already exists for this user
                const existingBullet = await tx.bullet.findFirst({
                  where: {
                    user_id: userId,
                    text: bulletText.trim(),
                  },
                })

                // Only create if bullet doesn't already exist
                if (!existingBullet) {
                  await tx.bullet.create({
                    data: {
                      user_id: userId,
                      experience_id: jobExperience.id,
                      text: bulletText.trim(),
                      tags: [],
                      priority: 0,
                      is_favorite: false,
                    },
                  })
                  bulletsAdded++
                }
              }
            }
          }
        }
      }
    }

    // 3. Merge Projects (avoid duplicates based on name)
    if (parsedResume.projects && parsedResume.projects.length > 0) {
      const maxOrder = existingProjects.length > 0
        ? Math.max(...existingProjects.map(p => p.display_order))
        : -1

      for (const proj of parsedResume.projects) {
        const isDuplicate = existingProjects.some(
          (existing) => existing.name.toLowerCase() === proj.name.toLowerCase()
        )

        if (!isDuplicate) {
          await tx.project.create({
            data: {
              user_id: userId,
              name: proj.name,
              description: proj.description || null,
              technologies: proj.technologies || [],
              url: proj.url || null,
              github_link: proj.github_link || null,
              display_order: maxOrder + projectsAdded + 1,
            },
          })
          projectsAdded++
        }
      }
    }

    // 4. Merge parsed_resume JSON in Profile (keep both old and new)
    const profile = await tx.profile.findUnique({
      where: { user_id: userId },
      select: { parsed_resume: true, skills: true },
    })

    const existingParsedResume = (profile?.parsed_resume as ParsedResume) || {}

    // Merge education arrays
    const mergedEducation = [
      ...(existingParsedResume.education || []),
      ...(parsedResume.education || []),
    ].filter((edu, index, self) =>
      index === self.findIndex(e =>
        e.school.toLowerCase() === edu.school.toLowerCase() &&
        e.degree?.toLowerCase() === edu.degree?.toLowerCase()
      )
    )

    // Merge experience arrays
    const mergedExperience = [
      ...(existingParsedResume.experience || []),
      ...(parsedResume.experience || []),
    ].filter((exp, index, self) =>
      index === self.findIndex(e =>
        e.company.toLowerCase() === exp.company.toLowerCase() &&
        e.title.toLowerCase() === exp.title.toLowerCase()
      )
    )

    // Merge projects arrays
    const mergedProjects = [
      ...(existingParsedResume.projects || []),
      ...(parsedResume.projects || []),
    ].filter((proj, index, self) =>
      index === self.findIndex(p => p.name.toLowerCase() === proj.name.toLowerCase())
    )

    // Merge and deduplicate skills
    const existingSkills = profile?.skills || []
    const newSkills = [
      ...(parsedResume.skills?.languages || []),
      ...(parsedResume.skills?.frameworks || []),
      ...(parsedResume.skills?.tools || []),
      ...(parsedResume.skills?.other || []),
    ]

    const mergedSkills = [...new Set([...existingSkills, ...newSkills])].sort()

    // Merge skills object in parsed_resume
    const mergedSkillsObj = {
      languages: [
        ...new Set([
          ...(existingParsedResume.skills?.languages || []),
          ...(parsedResume.skills?.languages || []),
        ]),
      ],
      frameworks: [
        ...new Set([
          ...(existingParsedResume.skills?.frameworks || []),
          ...(parsedResume.skills?.frameworks || []),
        ]),
      ],
      tools: [
        ...new Set([
          ...(existingParsedResume.skills?.tools || []),
          ...(parsedResume.skills?.tools || []),
        ]),
      ],
      other: [
        ...new Set([
          ...(existingParsedResume.skills?.other || []),
          ...(parsedResume.skills?.other || []),
        ]),
      ],
    }

    // Update profile with merged data
    await tx.profile.update({
      where: { user_id: userId },
      data: {
        parsed_resume: {
          personal: parsedResume.personal || existingParsedResume.personal,
          education: mergedEducation,
          experience: mergedExperience,
          projects: mergedProjects,
          skills: mergedSkillsObj,
          certifications: [
            ...(existingParsedResume.certifications || []),
            ...(parsedResume.certifications || []),
          ],
        },
        skills: mergedSkills,
        parsed_resume_confirmed_at: new Date(),
        migrated_to_structured: true,
      },
    })
  })

  return {
    success: true,
    educationAdded,
    experienceAdded,
    projectsAdded,
    bulletsAdded,
  }
}
