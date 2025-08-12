import { z } from "zod"

// Core entities
export const PersonalSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  headline: z.string().optional(),
  links: z.array(z.string().url().or(z.string().min(1))).optional()
})

export const ExperienceEntrySchema = z.object({
  position: z.string().min(1),
  company: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  description: z.string().optional(),
  achievements: z.array(z.string()).optional()
})

export const EducationEntrySchema = z.object({
  degree: z.string().min(1),
  institution: z.string().min(1),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  gpa: z.string().optional()
})

export const SkillsSchema = z.object({
  hard: z.array(z.string()).default([]),
  soft: z.array(z.string()).default([])
})

export const CertificationSchema = z.object({
  name: z.string().min(1),
  issuer: z.string().optional(),
  date: z.string().optional(),
  url: z.string().url().optional()
})

export const ProjectSchema = z.object({
  name: z.string().min(1),
  summary: z.string().optional(),
  technologies: z.array(z.string()).optional(),
  link: z.string().url().optional()
})

export const LanguageSchema = z.object({
  language: z.string().min(1),
  proficiency: z.string().min(1) // e.g., A1–C2, Beginner/Intermediate/Advanced/Native
})

export const TargetSchema = z.object({
  role: z.string().optional(),
  seniority: z.string().optional(), // e.g., Intern/Junior/Mid/Senior/Lead
  sector: z.string().optional()
})

export const CvSchema = z.object({
  personal: PersonalSchema.default({}),
  summary: z.string().default(""),
  experience: z.array(ExperienceEntrySchema).default([]),
  education: z.array(EducationEntrySchema).default([]),
  skills: SkillsSchema.default({ hard: [], soft: [] }),
  certifications: z.array(CertificationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  languages: z.array(LanguageSchema).default([]),
  target: TargetSchema.default({})
})

export type Personal = z.infer<typeof PersonalSchema>
export type ExperienceEntry = z.infer<typeof ExperienceEntrySchema>
export type EducationEntry = z.infer<typeof EducationEntrySchema>
export type Skills = z.infer<typeof SkillsSchema>
export type Certification = z.infer<typeof CertificationSchema>
export type Project = z.infer<typeof ProjectSchema>
export type Language = z.infer<typeof LanguageSchema>
export type Target = z.infer<typeof TargetSchema>
export type Cv = z.infer<typeof CvSchema>

// Helper: deep-merge for CVs with sensible defaults
export function mergeCv(base: Cv, patch: Partial<Cv>): Cv {
  const merged: Cv = {
    personal: { ...(base.personal || {}), ...(patch.personal || {}) },
    summary: patch.summary ?? base.summary ?? "",
    experience: mergeArrayObjects(base.experience, patch.experience, [
      "position",
      "company"
    ]),
    education: mergeArrayObjects(base.education, patch.education, [
      "degree",
      "institution"
    ]),
    skills: {
      hard: mergeStringArrays(
        base.skills?.hard || [],
        patch.skills?.hard || []
      ),
      soft: mergeStringArrays(base.skills?.soft || [], patch.skills?.soft || [])
    },
    certifications: mergeArrayObjects(
      base.certifications,
      patch.certifications,
      ["name"]
    ),
    projects: mergeArrayObjects(base.projects, patch.projects, ["name"]),
    languages: mergeArrayObjects(base.languages, patch.languages, ["language"]),
    target: { ...(base.target || {}), ...(patch.target || {}) }
  }

  return CvSchema.parse(merged)
}

function mergeStringArrays(a?: string[], b?: string[]): string[] {
  const set = new Set<string>(
    [...(a || []), ...(b || [])].map((s) => s.trim()).filter(Boolean)
  )
  return Array.from(set)
}

type KeyTuple<T> = (keyof T)[]

function mergeArrayObjects<T extends Record<string, any>>(
  a?: T[],
  b?: T[],
  identityKeys: KeyTuple<T> = []
): T[] {
  const result: T[] = []
  const items = [...(a || []), ...(b || [])]
  const seen = new Set<string>()

  const makeKey = (item: T) =>
    identityKeys
      .map((k) =>
        String(item?.[k] ?? "")
          .toLowerCase()
          .trim()
      )
      .filter(Boolean)
      .join("::")

  for (const it of items) {
    const k = identityKeys.length ? makeKey(it) : JSON.stringify(it)
    if (!seen.has(k)) {
      seen.add(k)
      result.push(it)
    }
  }
  return result
}
