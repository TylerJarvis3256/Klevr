import { renderToBuffer } from '@react-pdf/renderer'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'
import { ClassicATSResume } from './templates/classic-ats'
import type { GeneratedResumeContent } from '@/lib/resume-generator'
import React from 'react'

export async function renderResumePDF(
  content: GeneratedResumeContent,
  userInfo: {
    name: string
    email: string
    phone?: string
    location?: string
  },
  _template: 'classic-ats' | 'modern-ats' = 'classic-ats'
): Promise<Buffer> {
  // Use ClassicATSResume for all templates for now
  const doc = <ClassicATSResume content={content} userInfo={userInfo} />
  const buffer = await renderToBuffer(doc)
  return Buffer.from(buffer)
}

export async function renderCoverLetterPDF(
  content: string,
  userInfo: {
    name: string
    email: string
    phone?: string
  },
  jobInfo: {
    title: string
    company: string
  }
): Promise<Buffer> {
  const styles = StyleSheet.create({
    page: { padding: 60, fontSize: 11, lineHeight: 1.6 },
    header: { marginBottom: 30 },
    name: { fontSize: 16, fontWeight: 'bold' },
    contact: { fontSize: 10, color: '#666666', marginTop: 5 },
    date: { marginBottom: 20, fontSize: 10 },
    body: { fontSize: 11, textAlign: 'justify' },
    signature: { marginTop: 20 },
  })

  const CoverLetterDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.name}>{userInfo.name}</Text>
          <Text style={styles.contact}>
            {userInfo.email}
            {userInfo.phone && ` • ${userInfo.phone}`}
          </Text>
        </View>

        {/* Date */}
        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>

        {/* Recipient */}
        <Text style={styles.body}>{`Hiring Manager\n${jobInfo.company}\n\n`}</Text>

        {/* Body content */}
        <Text style={styles.body}>{content}</Text>

        {/* Signature */}
        <Text style={{ ...styles.body, ...styles.signature }}>
          {`\n\nSincerely,\n${userInfo.name}`}
        </Text>
      </Page>
    </Document>
  )

  const buffer = await renderToBuffer(CoverLetterDoc)
  return Buffer.from(buffer)
}
