import { useMutation, useQuery } from "@tanstack/react-query"

// API Base URL - use environment variable or fallback to localhost
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:4000"

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

// Helper function for making API requests
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE}${endpoint}`

  const defaultOptions: RequestInit = {
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    },
    ...options
  }

  try {
    const response = await fetch(url, defaultOptions)

    if (!response.ok) {
      const errorData = await response.text()
      throw new Error(`API Error ${response.status}: ${errorData}`)
    }

    return await response.json()
  } catch (error) {
    console.error(`API request failed for ${endpoint}:`, error)
    throw error
  }
}

// API Functions

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
