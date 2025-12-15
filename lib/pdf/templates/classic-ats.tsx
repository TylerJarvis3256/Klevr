import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import type { GeneratedResumeContent } from '@/lib/resume-generator'

// Classic ATS-friendly resume template with clean, single-column layout
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: 'Helvetica',
    lineHeight: 1.4,
    color: '#000000',
  },
  header: {
    marginBottom: 20,
  },
  name: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 5,
  },
  contact: {
    fontSize: 10,
    color: '#444444',
    marginBottom: 10,
  },
  summary: {
    fontSize: 11,
    marginBottom: 15,
    lineHeight: 1.5,
  },
  section: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    marginBottom: 8,
    borderBottom: '1pt solid #000000',
    paddingBottom: 3,
  },
  experienceItem: {
    marginBottom: 10,
  },
  jobTitle: {
    fontSize: 11,
    fontWeight: 'bold',
  },
  company: {
    fontSize: 10,
    fontStyle: 'italic',
  },
  dates: {
    fontSize: 9,
    color: '#666666',
  },
  bullet: {
    fontSize: 10,
    marginLeft: 15,
    marginTop: 2,
  },
  skillsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  skill: {
    fontSize: 10,
    marginRight: 10,
    marginBottom: 3,
  },
})

interface ClassicATSResumeProps {
  content: GeneratedResumeContent
  userInfo: {
    name: string
    email: string
    phone?: string
    location?: string
  }
}

export function ClassicATSResume({ content, userInfo }: ClassicATSResumeProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{userInfo.name}</Text>
          <Text style={styles.contact}>
            {userInfo.email}
            {userInfo.phone && ` • ${userInfo.phone}`}
            {userInfo.location && ` • ${userInfo.location}`}
          </Text>
        </View>

        {/* Summary */}
        {content.summary && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROFESSIONAL SUMMARY</Text>
            <Text style={styles.summary}>{content.summary}</Text>
          </View>
        )}

        {/* Education */}
        {content.education && content.education.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EDUCATION</Text>
            {content.education.map((edu, i) => (
              <View key={i} style={styles.experienceItem}>
                <Text style={styles.jobTitle}>{edu.degree}</Text>
                <Text style={styles.company}>
                  {edu.school} • {edu.graduation}
                  {edu.gpa && ` • GPA: ${edu.gpa}`}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Experience */}
        {content.experience && content.experience.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>EXPERIENCE</Text>
            {content.experience.map((exp, i) => (
              <View key={i} style={styles.experienceItem}>
                <Text style={styles.jobTitle}>{exp.title}</Text>
                <Text style={styles.company}>
                  {exp.company}
                  {exp.location && ` • ${exp.location}`}
                </Text>
                <Text style={styles.dates}>{exp.dates}</Text>
                {exp.bullets.map((bullet, j) => (
                  <Text key={j} style={styles.bullet}>
                    • {bullet}
                  </Text>
                ))}
              </View>
            ))}
          </View>
        )}

        {/* Projects */}
        {content.projects && content.projects.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>PROJECTS</Text>
            {content.projects.map((project, i) => (
              <View key={i} style={styles.experienceItem}>
                <Text style={styles.jobTitle}>{project.name}</Text>
                <Text style={styles.bullet}>• {project.description}</Text>
                {project.technologies && project.technologies.length > 0 && (
                  <Text style={styles.bullet}>
                    • Technologies: {project.technologies.join(', ')}
                  </Text>
                )}
              </View>
            ))}
          </View>
        )}

        {/* Skills */}
        {content.skills && (content.skills.technical.length > 0 || content.skills.other.length > 0) && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>SKILLS</Text>
            <View style={styles.skillsGrid}>
              {content.skills.technical.map((skill, i) => (
                <Text key={i} style={styles.skill}>
                  {skill}
                </Text>
              ))}
              {content.skills.other.map((skill, i) => (
                <Text key={i} style={styles.skill}>
                  {skill}
                </Text>
              ))}
            </View>
          </View>
        )}
      </Page>
    </Document>
  )
}
