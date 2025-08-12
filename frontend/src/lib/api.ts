const API_BASE = process.env.NEXT_PUBLIC_API_BASE || ""

async function postJson<T = any>(path: string, body: any): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {})
  })
  const text = await res.text()
  let json: any = {}
  try {
    json = text ? JSON.parse(text) : {}
  } catch {
    json = { error: "invalid_json", raw: text }
  }
  if (!res.ok) {
    const err = (json && (json.error || json.message)) || "request_failed"
    throw new Error(typeof err === "string" ? err : JSON.stringify(json))
  }
  return json as T
}

export type ApiParseRequest = { text?: string; filePath?: string }
export type ApiParseResponse = { cv: any }
export function apiParse(input: ApiParseRequest): Promise<ApiParseResponse> {
  return postJson("/api/parse", input)
}

export type ApiTypeDetectRequest = { cv: any }
export type ApiTypeDetectResponse = {
  target: {
    role?: string
    seniority?: string
    sector?: string
    confidence?: number
  }
  cv: any
}
export function apiTypeDetect(
  input: ApiTypeDetectRequest
): Promise<ApiTypeDetectResponse> {
  return postJson("/api/type-detect", input)
}

export type ApiFollowupsRequest = {
  cv: any
  target?: { role?: string; seniority?: string; sector?: string }
}
export type ApiFollowupsResponse = {
  questions: Array<{ id: string; question: string }>
}
export function apiFollowups(
  input: ApiFollowupsRequest
): Promise<ApiFollowupsResponse> {
  return postJson("/api/followups", input)
}

// New aliases as requested (post* helpers)
export const postParse = apiParse
export const postTypeDetect = apiTypeDetect

export type SectorQuestionsReq = {
  cv: any
  target: { role?: string; seniority?: string; sector?: string }
}
export type SectorQuestionsRes = {
  questions: Array<{ id: string; question: string; key: string }>
}
export function postSectorQuestions(
  input: SectorQuestionsReq
): Promise<SectorQuestionsRes> {
  return postJson("/api/sector-questions", input)
}

export type SkillAssessGenReq = {
  cv: any
  target: { role?: string; seniority?: string; sector?: string }
}
export type SkillAssessGenRes = {
  questions: Array<{
    id: string
    topic: string
    question: string
    options: string[]
  }>
}
export function postSkillAssessmentGenerate(
  input: SkillAssessGenReq,
  sessionId?: string
): Promise<SkillAssessGenRes> {
  const headers: Record<string, string> = { "Content-Type": "application/json" }
  if (sessionId) headers["X-Session-Id"] = sessionId
  return fetch(`${API_BASE}/api/skill-assessment/generate`, {
    method: "POST",
    headers,
    body: JSON.stringify(input)
  }).then(async (res) => {
    const text = await res.text()
    let json: any = {}
    try {
      json = text ? JSON.parse(text) : {}
    } catch {
      json = { error: "invalid_json", raw: text }
    }
    if (!res.ok)
      throw new Error(json?.error || json?.message || "request_failed")
    return json as SkillAssessGenRes
  })
}

export type SkillAssessGradeReq = {
  sessionId: string
  answers: Array<{ id: string; choice: string }>
}
export type SkillAssessGradeRes = {
  score: { correct: number; total: number; pct: number }
  breakdown: Array<{ id: string; correct: boolean }>
}
export function postSkillAssessmentGrade(
  input: SkillAssessGradeReq
): Promise<SkillAssessGradeRes> {
  return postJson("/api/skill-assessment/grade", input)
}

// Finalize-stage client helpers
export function postPolish(input: {
  cv: any
  target: any
}): Promise<{ cv: any; notes: string[] }> {
  return postJson("/api/polish", input)
}
export function postAtsKeywords(input: {
  cv: any
  jobText: string
}): Promise<{ missing: string[]; suggested: string[]; score: number }> {
  return postJson("/api/ats/keywords", input)
}
export function postRenderPdf(input: {
  cv: any
  template: "modern" | "compact" | "classic"
}): Promise<{ filename: string; mime: string; base64: string }> {
  return postJson("/api/render/pdf", input)
}
export function postRenderDocx(input: {
  cv: any
  template: "modern" | "compact" | "classic"
}): Promise<{ filename: string; mime: string; base64: string }> {
  return postJson("/api/render/docx", input)
}
export function postCoverLetter(input: {
  cv: any
  target: any
  jobText?: string
}): Promise<{ letter: string }> {
  return postJson("/api/cover-letter", input)
}

// Drafts & sharing & analytics
export function postDraftSave(input: {
  draftId?: string
  cv: any
  target?: any
  extras?: any
}): Promise<{ draftId: string; savedAt: string; size: number }> {
  return postJson("/api/drafts/save", input)
}
export function getDraft(draftId: string): Promise<{
  draftId: string
  cv: any
  target: any
  extras: any
  savedAt: string
}> {
  return fetch(`${API_BASE}/api/drafts/${draftId}`).then((res) => res.json())
}
export function postShareCreate(input: {
  draftId: string
  ttlDays?: number
}): Promise<{ shareId: string; shareUrl: string; expiresAt: string }> {
  return postJson("/api/share/create", input)
}
export function postAnalytics(input: {
  type: string
  payload?: any
}): Promise<{ ok: true }> {
  return postJson("/api/analytics/event", input)
}

import { useMutation, useQuery } from "@tanstack/react-query"

// API Base URL - use environment variable or fallback to production
const getApiBase = () => {
  // Öncelik: Environment variable (REACT_APP_API_BASE)
  // @ts-ignore - React injects environment variables at build time
  const envApiBase = process.env.REACT_APP_API_BASE
  if (envApiBase) {
    return envApiBase
  }

  // İkinci öncelik: Local development otomatik tespit
  if (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
  ) {
    return "http://localhost:4000"
  }

  // Son çare: Production URL
  return "https://cvbuilder-451v.onrender.com"
}

const API_BASE = getApiBase()

// Debug: API URL'yi ve kaynağını console'da göster
console.log("API Service Configuration:")
// @ts-ignore - React injects environment variables at build time
console.log("- Environment REACT_APP_API_BASE:", process.env.REACT_APP_API_BASE)
console.log("- Window hostname:", window.location.hostname)
console.log("- Final API Base URL:", API_BASE)

// Types for API responses
export interface CVData {
  personalInfo: {
    name: string
    email: string
    phone: string
    location: string
  }
  summary: string
  experience: Array<{
    title: string
    company: string
    location: string
    start: string
    end: string
    bullets: string[]
  }>
  education: Array<{
    degree: string
    institution: string
    location: string
    start: string
    end: string
    gpa?: string
  }>
  skills: Array<{
    name: string
    category: string
    level: string
  }>
  projects: Array<{
    name: string
    description: string
    technologies: string[]
    url?: string
    start?: string
    end?: string
  }>
  links: Array<{
    type: string
    url: string
    label: string
  }>
  certificates: string[]
  languages: Array<{
    language: string
    proficiency: string
  }>
  references: Array<{
    name: string
    contact: string
    relationship: string
  }>
}

export interface Question {
  id: string
  question: string
  type: "text" | "select" | "multiselect"
  options?: string[]
  category: string
}

export interface ScoreResult {
  score: number
  strengths: string[]
  weaknesses: string[]
  suggestions: string[]
}

// Helper function for making API requests with retry logic
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {},
  retryCount: number = 0
): Promise<T> {
  const url = `${API_BASE}${endpoint}`
  const maxRetries = 2

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    credentials: "omit", // Don't send credentials for CORS
    mode: "cors",
    // Add timeout to prevent hanging requests
    signal: AbortSignal.timeout(30000), // 30 second timeout
    ...options
  }

  try {
    console.log(`Making API request to: ${url} (attempt ${retryCount + 1})`)
    const response = await fetch(url, defaultOptions)

    console.log(`Response status: ${response.status}`)

    if (!response.ok) {
      const errorData = await response.text()
      console.error(`API Error Response:`, errorData)
      throw new Error(`API Error ${response.status}: ${errorData}`)
    }

    const data = await response.json()
    console.log(`API Response received successfully`)
    return data
  } catch (error) {
    console.error(
      `API request failed for ${endpoint} (attempt ${retryCount + 1}):`,
      error
    )

    // Handle QUIC protocol errors with retry
    if (
      error.message &&
      (error.message.includes("QUIC_PROTOCOL_ERROR") ||
        error.message.includes("ERR_QUIC_PROTOCOL_ERROR"))
    ) {
      if (retryCount < maxRetries) {
        console.warn(
          `QUIC protocol error detected, retrying in 1 second... (${
            retryCount + 1
          }/${maxRetries})`
        )
        await new Promise((resolve) => setTimeout(resolve, 1000))
        return apiRequest<T>(endpoint, options, retryCount + 1)
      } else {
        console.error("Max retries reached for QUIC protocol error")
        throw new Error(
          "Network protocol error: Unable to establish stable connection after multiple attempts."
        )
      }
    }

    // Handle network errors specifically
    if (
      error instanceof TypeError &&
      error.message.includes("Failed to fetch")
    ) {
      throw new Error(
        "Network error: Unable to connect to server. Please check your internet connection."
      )
    }

    // Handle timeout errors
    if (error.name === "AbortError") {
      throw new Error("Request timeout: The server took too long to respond.")
    }

    throw error
  }
}

// API Functions

/**
 * Extract raw text from CV (alias for parseCV)
 */
export async function extractRaw(rawText: string): Promise<CVData> {
  return apiRequest<CVData>("/api/extract-raw", {
    method: "POST",
    body: JSON.stringify({ rawText })
  })
}

/**
 * Parse raw CV text into structured data
 */
export async function parseCV(rawText: string): Promise<CVData> {
  return apiRequest<CVData>("/api/ai/parse", {
    method: "POST",
    body: JSON.stringify({ rawText })
  })
}

/**
 * Generate questions based on CV data
 */
export async function generateQuestions(
  cv: CVData,
  count: number = 4
): Promise<Question[]> {
  const response = await apiRequest<{ questions?: Question[] } | Question[]>(
    "/api/ai/questions",
    {
      method: "POST",
      body: JSON.stringify({ cv, count })
    }
  )

  // Handle both direct array response and wrapped response
  return Array.isArray(response) ? response : response.questions || []
}

/**
 * Improve CV based on answers to questions
 */
export async function improveCV(
  cv: CVData,
  answers: Record<string, any>
): Promise<CVData> {
  return apiRequest<CVData>("/api/ai/improve", {
    method: "POST",
    body: JSON.stringify({ cv, answers })
  })
}

/**
 * Score CV and get improvement suggestions
 */
export async function scoreCV(cv: CVData): Promise<ScoreResult> {
  return apiRequest<ScoreResult>("/api/ai/score", {
    method: "POST",
    body: JSON.stringify({ cv })
  })
}

/**
 * Generate cover letter based on CV and role hint
 */
export async function writeCoverLetter(
  cv: CVData,
  roleHint?: string
): Promise<string> {
  const response = await apiRequest<{ coverLetter?: string } | string>(
    "/api/ai/coverletter",
    {
      method: "POST",
      body: JSON.stringify({ cv, roleHint })
    }
  )

  // Handle both direct string response and wrapped response
  return typeof response === "string" ? response : response.coverLetter || ""
}

// React Query Mutation Hooks

/**
 * Hook for extracting raw CV data
 */
export function useExtractRawMutation() {
  return useMutation({
    mutationFn: extractRaw,
    onError: (error) => {
      console.error("CV extraction failed:", error)
    }
  })
}

/**
 * Hook for parsing CV text
 */
export function useParseCVMutation() {
  return useMutation({
    mutationFn: parseCV,
    onError: (error) => {
      console.error("CV parsing failed:", error)
    }
  })
}

/**
 * Hook for generating questions
 */
export function useGenerateQuestionsMutation() {
  return useMutation({
    mutationFn: ({ cv, count }: { cv: CVData; count?: number }) =>
      generateQuestions(cv, count),
    onError: (error) => {
      console.error("Question generation failed:", error)
    }
  })
}

/**
 * Hook for improving CV
 */
export function useImproveCVMutation() {
  return useMutation({
    mutationFn: ({
      cv,
      answers
    }: {
      cv: CVData
      answers: Record<string, any>
    }) => improveCV(cv, answers),
    onError: (error) => {
      console.error("CV improvement failed:", error)
    }
  })
}

/**
 * Hook for scoring CV
 */
export function useScoreCVMutation() {
  return useMutation({
    mutationFn: scoreCV,
    onError: (error) => {
      console.error("CV scoring failed:", error)
    }
  })
}

/**
 * Hook for generating cover letter
 */
export function useWriteCoverLetterMutation() {
  return useMutation({
    mutationFn: ({ cv, roleHint }: { cv: CVData; roleHint?: string }) =>
      writeCoverLetter(cv, roleHint),
    onError: (error) => {
      console.error("Cover letter generation failed:", error)
    }
  })
}

// Query hooks for data fetching (if needed)

/**
 * Hook for fetching CV data (if stored on server)
 */
export function useCVQuery(cvId?: string) {
  return useQuery({
    queryKey: ["cv", cvId],
    queryFn: () => apiRequest<CVData>(`/api/cv/${cvId}`),
    enabled: !!cvId
  })
}

// Utility functions

/**
 * Validate CV data structure
 */
export function validateCVData(data: any): data is CVData {
  return (
    data &&
    typeof data === "object" &&
    data.personalInfo &&
    typeof data.personalInfo === "object" &&
    Array.isArray(data.experience) &&
    Array.isArray(data.education) &&
    Array.isArray(data.skills) &&
    Array.isArray(data.projects) &&
    Array.isArray(data.links) &&
    Array.isArray(data.certificates) &&
    Array.isArray(data.languages) &&
    Array.isArray(data.references)
  )
}

/**
 * Create empty CV skeleton
 */
export function createEmptyCVData(): CVData {
  return {
    personalInfo: {
      name: "",
      email: "",
      phone: "",
      location: ""
    },
    summary: "",
    experience: [],
    education: [],
    skills: [],
    projects: [],
    links: [],
    certificates: [],
    languages: [],
    references: []
  }
}

/**
 * Check if CV has any meaningful data
 */
export function isCVEmpty(cv: CVData): boolean {
  return (
    !cv.personalInfo.name &&
    !cv.personalInfo.email &&
    !cv.summary &&
    cv.experience.length === 0 &&
    cv.education.length === 0 &&
    cv.skills.length === 0 &&
    cv.projects.length === 0
  )
}
