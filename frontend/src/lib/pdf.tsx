import React from "react"
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  pdf,
  Font
} from "@react-pdf/renderer"
import { CVData } from "./flow"

// Register a font for better text rendering
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOmCnqEu92Fr1Mu4mxK.woff2",
      fontWeight: "normal"
    },
    {
      src: "https://fonts.gstatic.com/s/roboto/v30/KFOlCnqEu92Fr1MmWUlfBBc4.woff2",
      fontWeight: "bold"
    }
  ]
})

// Styles for PDF documents
const styles = StyleSheet.create({
  page: {
    flexDirection: "column",
    backgroundColor: "white",
    padding: 40,
    fontFamily: "Roboto",
    fontSize: 11,
    lineHeight: 1.4
  },
  header: {
    marginBottom: 20,
    paddingBottom: 15,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb"
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8
  },
  contactInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    fontSize: 10,
    color: "#6b7280"
  },
  contactItem: {
    marginRight: 15
  },
  section: {
    marginBottom: 16
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#d1d5db",
    textTransform: "uppercase",
    letterSpacing: 0.5
  },
  sectionContent: {
    marginBottom: 6
  },
  experienceItem: {
    marginBottom: 12
  },
  jobTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2
  },
  company: {
    fontSize: 11,
    color: "#2563eb",
    fontWeight: "bold",
    marginBottom: 2
  },
  dateLocation: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    color: "#6b7280",
    marginBottom: 4
  },
  bulletPoints: {
    marginLeft: 12
  },
  bulletPoint: {
    flexDirection: "row",
    marginBottom: 2
  },
  bullet: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#6b7280",
    marginRight: 8,
    marginTop: 4
  },
  bulletText: {
    flex: 1,
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.3
  },
  educationItem: {
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between"
  },
  educationLeft: {
    flex: 1
  },
  educationRight: {
    width: 80,
    textAlign: "right"
  },
  degree: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2
  },
  institution: {
    fontSize: 10,
    color: "#2563eb",
    marginBottom: 1
  },
  location: {
    fontSize: 9,
    color: "#6b7280"
  },
  skillsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8
  },
  skillCategory: {
    marginBottom: 8,
    minWidth: "45%"
  },
  skillCategoryTitle: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 4
  },
  skillTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4
  },
  skillTag: {
    backgroundColor: "#eff6ff",
    color: "#1d4ed8",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 12,
    fontSize: 9,
    fontWeight: "normal"
  },
  projectItem: {
    marginBottom: 10
  },
  projectName: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 2
  },
  projectDescription: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 3,
    lineHeight: 1.3
  },
  projectTech: {
    fontSize: 9,
    color: "#6b7280",
    fontStyle: "italic"
  },
  twoColumn: {
    flexDirection: "row",
    gap: 20
  },
  leftColumn: {
    flex: 1
  },
  rightColumn: {
    flex: 1
  },
  summary: {
    fontSize: 10,
    color: "#374151",
    lineHeight: 1.4,
    textAlign: "justify"
  },
  listItem: {
    fontSize: 10,
    color: "#374151",
    marginBottom: 2
  },
  languageItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 3
  },
  languageName: {
    fontSize: 10,
    color: "#1f2937"
  },
  languageLevel: {
    fontSize: 10,
    color: "#6b7280"
  },

  // Cover Letter Styles
  coverLetterPage: {
    flexDirection: "column",
    backgroundColor: "white",
    padding: 40,
    fontFamily: "Roboto",
    fontSize: 12,
    lineHeight: 1.6
  },
  coverLetterHeader: {
    marginBottom: 30,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb"
  },
  coverLetterTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    textAlign: "center",
    marginBottom: 15
  },
  coverLetterContent: {
    fontSize: 11,
    color: "#374151",
    lineHeight: 1.6,
    textAlign: "justify"
  },
  coverLetterParagraph: {
    marginBottom: 12
  }
})

// Helper function to format dates
const formatDate = (start: string, end: string): string => {
  if (!start && !end) return ""
  if (end === "Present" || end === "Current") return `${start} - Present`
  return `${start} - ${end}`
}

// CV PDF Document Component
const CVPDFDocument: React.FC<{ cvData: CVData }> = ({ cvData }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{cvData.personalInfo.name}</Text>
        <View style={styles.contactInfo}>
          {cvData.personalInfo.email && (
            <Text style={styles.contactItem}>{cvData.personalInfo.email}</Text>
          )}
          {cvData.personalInfo.phone && (
            <Text style={styles.contactItem}>{cvData.personalInfo.phone}</Text>
          )}
          {cvData.personalInfo.location && (
            <Text style={styles.contactItem}>
              {cvData.personalInfo.location}
            </Text>
          )}
        </View>
      </View>

      {/* Professional Summary */}
      {cvData.summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.summary}>{cvData.summary}</Text>
        </View>
      )}

      {/* Professional Experience */}
      {cvData.experience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
          {cvData.experience.map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <Text style={styles.jobTitle}>{exp.title}</Text>
              <Text style={styles.company}>{exp.company}</Text>
              <View style={styles.dateLocation}>
                <Text>{exp.location}</Text>
                <Text>{formatDate(exp.start, exp.end)}</Text>
              </View>
              {exp.bullets && exp.bullets.length > 0 && (
                <View style={styles.bulletPoints}>
                  {exp.bullets.map((bullet, bulletIndex) => (
                    <View key={bulletIndex} style={styles.bulletPoint}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Education */}
      {cvData.education.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {cvData.education.map((edu, index) => (
            <View key={index} style={styles.educationItem}>
              <View style={styles.educationLeft}>
                <Text style={styles.degree}>{edu.degree}</Text>
                <Text style={styles.institution}>{edu.institution}</Text>
                {edu.location && (
                  <Text style={styles.location}>{edu.location}</Text>
                )}
                {edu.gpa && <Text style={styles.location}>GPA: {edu.gpa}</Text>}
              </View>
              <View style={styles.educationRight}>
                <Text style={styles.location}>
                  {formatDate(edu.start, edu.end)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Skills */}
      {cvData.skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsGrid}>
            {Object.entries(
              cvData.skills.reduce((acc, skill) => {
                if (!acc[skill.category]) acc[skill.category] = []
                acc[skill.category].push(skill.name)
                return acc
              }, {} as Record<string, string[]>)
            ).map(([category, skills]) => (
              <View key={category} style={styles.skillCategory}>
                <Text style={styles.skillCategoryTitle}>{category}</Text>
                <View style={styles.skillTags}>
                  {skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Projects */}
      {cvData.projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {cvData.projects.map((project, index) => (
            <View key={index} style={styles.projectItem}>
              <Text style={styles.projectName}>{project.name}</Text>
              <Text style={styles.projectDescription}>
                {project.description}
              </Text>
              {project.technologies && project.technologies.length > 0 && (
                <Text style={styles.projectTech}>
                  Technologies: {project.technologies.join(", ")}
                </Text>
              )}
              {project.url && (
                <Text style={styles.projectTech}>URL: {project.url}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Additional Information - Two Column Layout */}
      <View style={styles.twoColumn}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          {/* Certificates */}
          {cvData.certificates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certificates</Text>
              {cvData.certificates.map((cert, index) => (
                <Text key={index} style={styles.listItem}>
                  • {cert}
                </Text>
              ))}
            </View>
          )}

          {/* Links */}
          {cvData.links.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Links</Text>
              {cvData.links.map((link, index) => (
                <Text key={index} style={styles.listItem}>
                  {link.label}: {link.url}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          {/* Languages */}
          {cvData.languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages</Text>
              {cvData.languages.map((lang, index) => (
                <View key={index} style={styles.languageItem}>
                  <Text style={styles.languageName}>{lang.language}</Text>
                  <Text style={styles.languageLevel}>{lang.proficiency}</Text>
                </View>
              ))}
            </View>
          )}

          {/* References */}
          {cvData.references.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>References</Text>
              {cvData.references.map((ref, index) => (
                <View key={index} style={styles.sectionContent}>
                  <Text style={styles.listItem}>{ref.name}</Text>
                  <Text style={styles.projectTech}>
                    {ref.relationship} - {ref.contact}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Page>
  </Document>
)

// Cover Letter PDF Document Component
const CoverLetterPDFDocument: React.FC<{
  cvData: CVData
  coverLetter: string
}> = ({ cvData, coverLetter }) => (
  <Document>
    <Page size="A4" style={styles.coverLetterPage}>
      {/* Header */}
      <View style={styles.coverLetterHeader}>
        <Text style={styles.name}>{cvData.personalInfo.name}</Text>
        <View style={styles.contactInfo}>
          {cvData.personalInfo.email && (
            <Text style={styles.contactItem}>{cvData.personalInfo.email}</Text>
          )}
          {cvData.personalInfo.phone && (
            <Text style={styles.contactItem}>{cvData.personalInfo.phone}</Text>
          )}
          {cvData.personalInfo.location && (
            <Text style={styles.contactItem}>
              {cvData.personalInfo.location}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.coverLetterTitle}>Cover Letter</Text>

      {/* Cover Letter Content */}
      <View>
        {coverLetter.split("\n\n").map((paragraph, index) => (
          <Text
            key={index}
            style={[styles.coverLetterContent, styles.coverLetterParagraph]}
          >
            {paragraph.trim()}
          </Text>
        ))}
      </View>
    </Page>
  </Document>
)

// Combined Document Component
const CombinedPDFDocument: React.FC<{
  cvData: CVData
  coverLetter: string
}> = ({ cvData, coverLetter }) => (
  <Document>
    {/* Cover Letter Page */}
    <Page size="A4" style={styles.coverLetterPage}>
      {/* Header */}
      <View style={styles.coverLetterHeader}>
        <Text style={styles.name}>{cvData.personalInfo.name}</Text>
        <View style={styles.contactInfo}>
          {cvData.personalInfo.email && (
            <Text style={styles.contactItem}>{cvData.personalInfo.email}</Text>
          )}
          {cvData.personalInfo.phone && (
            <Text style={styles.contactItem}>{cvData.personalInfo.phone}</Text>
          )}
          {cvData.personalInfo.location && (
            <Text style={styles.contactItem}>
              {cvData.personalInfo.location}
            </Text>
          )}
        </View>
      </View>

      <Text style={styles.coverLetterTitle}>Cover Letter</Text>

      {/* Cover Letter Content */}
      <View>
        {coverLetter.split("\n\n").map((paragraph, index) => (
          <Text
            key={index}
            style={[styles.coverLetterContent, styles.coverLetterParagraph]}
          >
            {paragraph.trim()}
          </Text>
        ))}
      </View>
    </Page>

    {/* CV Pages */}
    <Page size="A4" style={styles.page}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.name}>{cvData.personalInfo.name}</Text>
        <View style={styles.contactInfo}>
          {cvData.personalInfo.email && (
            <Text style={styles.contactItem}>{cvData.personalInfo.email}</Text>
          )}
          {cvData.personalInfo.phone && (
            <Text style={styles.contactItem}>{cvData.personalInfo.phone}</Text>
          )}
          {cvData.personalInfo.location && (
            <Text style={styles.contactItem}>
              {cvData.personalInfo.location}
            </Text>
          )}
        </View>
      </View>

      {/* Professional Summary */}
      {cvData.summary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Summary</Text>
          <Text style={styles.summary}>{cvData.summary}</Text>
        </View>
      )}

      {/* Professional Experience */}
      {cvData.experience.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Professional Experience</Text>
          {cvData.experience.map((exp, index) => (
            <View key={index} style={styles.experienceItem}>
              <Text style={styles.jobTitle}>{exp.title}</Text>
              <Text style={styles.company}>{exp.company}</Text>
              <View style={styles.dateLocation}>
                <Text>{exp.location}</Text>
                <Text>{formatDate(exp.start, exp.end)}</Text>
              </View>
              {exp.bullets && exp.bullets.length > 0 && (
                <View style={styles.bulletPoints}>
                  {exp.bullets.map((bullet, bulletIndex) => (
                    <View key={bulletIndex} style={styles.bulletPoint}>
                      <View style={styles.bullet} />
                      <Text style={styles.bulletText}>{bullet}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Education */}
      {cvData.education.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Education</Text>
          {cvData.education.map((edu, index) => (
            <View key={index} style={styles.educationItem}>
              <View style={styles.educationLeft}>
                <Text style={styles.degree}>{edu.degree}</Text>
                <Text style={styles.institution}>{edu.institution}</Text>
                {edu.location && (
                  <Text style={styles.location}>{edu.location}</Text>
                )}
                {edu.gpa && <Text style={styles.location}>GPA: {edu.gpa}</Text>}
              </View>
              <View style={styles.educationRight}>
                <Text style={styles.location}>
                  {formatDate(edu.start, edu.end)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}

      {/* Skills */}
      {cvData.skills.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Skills</Text>
          <View style={styles.skillsGrid}>
            {Object.entries(
              cvData.skills.reduce((acc, skill) => {
                if (!acc[skill.category]) acc[skill.category] = []
                acc[skill.category].push(skill.name)
                return acc
              }, {} as Record<string, string[]>)
            ).map(([category, skills]) => (
              <View key={category} style={styles.skillCategory}>
                <Text style={styles.skillCategoryTitle}>{category}</Text>
                <View style={styles.skillTags}>
                  {skills.map((skill, index) => (
                    <View key={index} style={styles.skillTag}>
                      <Text>{skill}</Text>
                    </View>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Projects */}
      {cvData.projects.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Projects</Text>
          {cvData.projects.map((project, index) => (
            <View key={index} style={styles.projectItem}>
              <Text style={styles.projectName}>{project.name}</Text>
              <Text style={styles.projectDescription}>
                {project.description}
              </Text>
              {project.technologies && project.technologies.length > 0 && (
                <Text style={styles.projectTech}>
                  Technologies: {project.technologies.join(", ")}
                </Text>
              )}
              {project.url && (
                <Text style={styles.projectTech}>URL: {project.url}</Text>
              )}
            </View>
          ))}
        </View>
      )}

      {/* Additional Information - Two Column Layout */}
      <View style={styles.twoColumn}>
        {/* Left Column */}
        <View style={styles.leftColumn}>
          {/* Certificates */}
          {cvData.certificates.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Certificates</Text>
              {cvData.certificates.map((cert, index) => (
                <Text key={index} style={styles.listItem}>
                  • {cert}
                </Text>
              ))}
            </View>
          )}

          {/* Links */}
          {cvData.links.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Links</Text>
              {cvData.links.map((link, index) => (
                <Text key={index} style={styles.listItem}>
                  {link.label}: {link.url}
                </Text>
              ))}
            </View>
          )}
        </View>

        {/* Right Column */}
        <View style={styles.rightColumn}>
          {/* Languages */}
          {cvData.languages.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Languages</Text>
              {cvData.languages.map((lang, index) => (
                <View key={index} style={styles.languageItem}>
                  <Text style={styles.languageName}>{lang.language}</Text>
                  <Text style={styles.languageLevel}>{lang.proficiency}</Text>
                </View>
              ))}
            </View>
          )}

          {/* References */}
          {cvData.references.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>References</Text>
              {cvData.references.map((ref, index) => (
                <View key={index} style={styles.sectionContent}>
                  <Text style={styles.listItem}>{ref.name}</Text>
                  <Text style={styles.projectTech}>
                    {ref.relationship} - {ref.contact}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </Page>
  </Document>
)

// Export functions
export const generateCVPDF = async (cvData: CVData): Promise<void> => {
  try {
    const blob = await pdf(<CVPDFDocument cvData={cvData} />).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${cvData.personalInfo.name.replace(/\s+/g, "_")}_CV.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error generating CV PDF:", error)
    throw new Error("Failed to generate CV PDF")
  }
}

export const generateCoverLetterPDF = async (
  cvData: CVData,
  coverLetter: string
): Promise<void> => {
  try {
    const blob = await pdf(
      <CoverLetterPDFDocument cvData={cvData} coverLetter={coverLetter} />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${cvData.personalInfo.name.replace(
      /\s+/g,
      "_"
    )}_Cover_Letter.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error generating cover letter PDF:", error)
    throw new Error("Failed to generate cover letter PDF")
  }
}

export const generateCombinedPDF = async (
  cvData: CVData,
  coverLetter: string
): Promise<void> => {
  try {
    const blob = await pdf(
      <CombinedPDFDocument cvData={cvData} coverLetter={coverLetter} />
    ).toBlob()
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `${cvData.personalInfo.name.replace(
      /\s+/g,
      "_"
    )}_Complete_Application.pdf`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    console.error("Error generating combined PDF:", error)
    throw new Error("Failed to generate combined PDF")
  }
}

// Utility function to get PDF blob without downloading
export const getCVPDFBlob = async (cvData: CVData): Promise<Blob> => {
  return await pdf(<CVPDFDocument cvData={cvData} />).toBlob()
}

export const getCoverLetterPDFBlob = async (
  cvData: CVData,
  coverLetter: string
): Promise<Blob> => {
  return await pdf(
    <CoverLetterPDFDocument cvData={cvData} coverLetter={coverLetter} />
  ).toBlob()
}

export const getCombinedPDFBlob = async (
  cvData: CVData,
  coverLetter: string
): Promise<Blob> => {
  return await pdf(
    <CombinedPDFDocument cvData={cvData} coverLetter={coverLetter} />
  ).toBlob()
}
