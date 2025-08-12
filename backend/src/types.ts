// Backend Type Contracts and DTOs
// Mirrors the shared CV schema shape defined on the frontend (cv.schema.ts)

// Minimal type mirrors to avoid build tooling changes (plain TS interfaces)
export interface PersonalDto {
  name?: string
  email?: string
  phone?: string
  location?: string
  headline?: string
  links?: string[]
}

export interface ExperienceEntryDto {
  position: string
  company: string
  location?: string
  startDate?: string
  endDate?: string
  description?: string
  achievements?: string[]
}

export interface EducationEntryDto {
  degree: string
  institution: string
  location?: string
  startDate?: string
  endDate?: string
  gpa?: string
}

export interface SkillsDto {
  hard: string[]
  soft: string[]
}

export interface CertificationDto {
  name: string
  issuer?: string
  date?: string
  url?: string
}

export interface ProjectDto {
  name: string
  summary?: string
  technologies?: string[]
  link?: string
}

export interface LanguageDto {
  language: string
  proficiency: string
}

export interface TargetDto {
  role?: string
  seniority?: string
  sector?: string
}

export interface CvDto {
  personal: PersonalDto
  summary: string
  experience: ExperienceEntryDto[]
  education: EducationEntryDto[]
  skills: SkillsDto
  certifications: CertificationDto[]
  projects: ProjectDto[]
  languages: LanguageDto[]
  target: TargetDto
  // Optional runtime fields used by the app
  userAdditions?: Array<{ question: string; answer: string }>
}

// Endpoint DTOs

// /api/upload-parse
export interface UploadParseResponse {
  // Parsed CV JSON
  personal?: PersonalDto
  summary?: string
  experience?: ExperienceEntryDto[]
  education?: EducationEntryDto[]
  skills?: SkillsDto | string[] // legacy format support
  certifications?: CertificationDto[]
  projects?: ProjectDto[]
  languages?: LanguageDto[]
  target?: TargetDto
}

// /api/ai/questions
export interface AiQuestionsRequest {
  cvData: CvDto
  appLanguage?: string
  askedQuestions?: string[]
  maxQuestions?: number
  sessionId?: string
}

export interface AiQuestionItem {
  id?: string
  question: string
  category?: string
  hint?: string
  isMultipleChoice?: boolean
  choices?: string[]
}

export interface AiQuestionsResponse {
  questions: AiQuestionItem[]
}

// /api/ai/coverletter
export interface CoverLetterRequest {
  cvData: CvDto
  appLanguage?: string
  sessionId?: string
  companyName?: string
  positionName?: string
}

export interface CoverLetterResponse {
  coverLetter: string
}

// /api/ai/generate-skill-question
export interface SkillQuestionRequest {
  cvData: CvDto
  appLanguage?: string
}
export interface SkillQuestionResponse {
  question: string
}

// /api/ai/generate-skill-assessment
export interface SkillAssessmentRequest {
  cvData: CvDto
  appLanguage?: string
}
export interface SkillAssessmentItem {
  key: string
  question: string
  options: string[]
}
export interface SkillAssessmentResponse {
  questions: SkillAssessmentItem[]
}

// /api/finalize-and-create-pdf
export interface FinalizePdfRequest {
  cvData: CvDto
  cvLanguage?: string
  sessionId?: string
  revisionRequest?: string
}

// /api/ai/improve
export interface AiImproveRequest {
  cv: CvDto
  answers: Record<string, string>
}
