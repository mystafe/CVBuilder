export type FlowState =
  | "PARSE"
  | "TYPE_DETECT"
  | "SECTOR_QS"
  | "SKILL_ASSESS"
  | "FINALIZE"

const ORDER: FlowState[] = [
  "PARSE",
  "TYPE_DETECT",
  "SECTOR_QS",
  "SKILL_ASSESS",
  "FINALIZE"
]

export interface FlowController {
  get(): FlowState
  next(): FlowState
  prev(): FlowState
  canProceed(): boolean
  reset(): FlowState
}

export function createFlow(initial: FlowState = "PARSE"): FlowController {
  let index = Math.max(0, ORDER.indexOf(initial))

  return {
    get: () => ORDER[index],
    next: () => {
      if (index < ORDER.length - 1) index += 1
      return ORDER[index]
    },
    prev: () => {
      if (index > 0) index -= 1
      return ORDER[index]
    },
    canProceed: () => index < ORDER.length - 1,
    reset: () => {
      index = 0
      return ORDER[index]
    }
  }
}

// Finite State Machine for CV Builder Wizard Flow

export enum WizardStep {
  UPLOAD_OR_SKIP = "UPLOAD_OR_SKIP",
  PARSE = "PARSE",
  REVIEW_FIELDS = "REVIEW_FIELDS",
  ASK_4 = "ASK_4",
  MERGE = "MERGE",
  SCORE = "SCORE",
  LOOP_2Q = "LOOP_2Q",
  PREVIEW = "PREVIEW"
}

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

export interface WizardState {
  currentStep: WizardStep
  completedSteps: WizardStep[]
  cvData: CVData
  uploadedFile?: File
  parsedData?: CVData
  questionsAnswered?: Record<
    string,
    { text?: string; skipped: boolean } | string
  >
  score?: {
    overall: number
    breakdown: Record<string, number>
    suggestions: string[]
  }
  hasImprovementLoop: boolean
  improvementRound: number
  maxImprovementRounds: number
}

// State machine transitions
const STEP_TRANSITIONS: Record<WizardStep, WizardStep[]> = {
  [WizardStep.UPLOAD_OR_SKIP]: [WizardStep.PARSE, WizardStep.REVIEW_FIELDS],
  [WizardStep.PARSE]: [WizardStep.REVIEW_FIELDS],
  [WizardStep.REVIEW_FIELDS]: [WizardStep.ASK_4],
  [WizardStep.ASK_4]: [WizardStep.MERGE],
  [WizardStep.MERGE]: [WizardStep.SCORE],
  [WizardStep.SCORE]: [WizardStep.LOOP_2Q, WizardStep.PREVIEW],
  [WizardStep.LOOP_2Q]: [WizardStep.MERGE, WizardStep.PREVIEW],
  [WizardStep.PREVIEW]: []
}

// Step order for progress calculation
export const STEP_ORDER: WizardStep[] = [
  WizardStep.UPLOAD_OR_SKIP,
  WizardStep.PARSE,
  WizardStep.REVIEW_FIELDS,
  WizardStep.ASK_4,
  WizardStep.MERGE,
  WizardStep.SCORE,
  WizardStep.LOOP_2Q,
  WizardStep.PREVIEW
]

// Default wizard state
export const getDefaultWizardState = (): WizardState => ({
  currentStep: WizardStep.UPLOAD_OR_SKIP,
  completedSteps: [],
  cvData: {
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
  },
  hasImprovementLoop: false,
  improvementRound: 0,
  maxImprovementRounds: 2
})

// Helper functions
export const nextStep = (
  current: WizardStep,
  hasImprovementLoop: boolean = false,
  skipParse: boolean = false
): WizardStep | null => {
  const possibleNext = STEP_TRANSITIONS[current]

  if (!possibleNext || possibleNext.length === 0) {
    return null
  }

  switch (current) {
    case WizardStep.UPLOAD_OR_SKIP:
      // Skip parse if no file uploaded
      return skipParse ? WizardStep.REVIEW_FIELDS : WizardStep.PARSE

    case WizardStep.SCORE:
      // Decide whether to loop for improvements or go to preview
      return hasImprovementLoop ? WizardStep.LOOP_2Q : WizardStep.PREVIEW

    case WizardStep.LOOP_2Q:
      // After improvement questions, merge again or finish
      return hasImprovementLoop ? WizardStep.MERGE : WizardStep.PREVIEW

    default:
      // Default to first valid transition
      return possibleNext[0]
  }
}

export const previousStep = (current: WizardStep): WizardStep | null => {
  const currentIndex = STEP_ORDER.indexOf(current)
  if (currentIndex <= 0) return null

  // Handle special cases for backwards navigation
  switch (current) {
    case WizardStep.PREVIEW:
      // Could come from SCORE or LOOP_2Q
      return WizardStep.SCORE
    default:
      return STEP_ORDER[currentIndex - 1]
  }
}

export const canGoNext = (current: WizardStep, state: WizardState): boolean => {
  switch (current) {
    case WizardStep.UPLOAD_OR_SKIP:
      return true // Always can proceed

    case WizardStep.PARSE:
      return !!state.parsedData

    case WizardStep.REVIEW_FIELDS:
      return !!state.cvData.personalInfo?.name

    case WizardStep.ASK_4:
      return Object.keys(state.questionsAnswered || {}).length >= 4

    case WizardStep.LOOP_2Q:
      return Object.keys(state.questionsAnswered || {}).length >= 2

    case WizardStep.MERGE:
    case WizardStep.SCORE:
      return true

    default:
      return false
  }
}

export const getStepProgress = (current: WizardStep): number => {
  const currentIndex = STEP_ORDER.indexOf(current)
  if (currentIndex === -1) return 0

  return Math.round(((currentIndex + 1) / STEP_ORDER.length) * 100)
}

export const getStepTitle = (step: WizardStep): string => {
  switch (step) {
    case WizardStep.UPLOAD_OR_SKIP:
      return "Upload or Start Fresh"
    case WizardStep.PARSE:
      return "Processing Document"
    case WizardStep.REVIEW_FIELDS:
      return "Review Information"
    case WizardStep.ASK_4:
      return "Profile Questions"
    case WizardStep.MERGE:
      return "Building CV"
    case WizardStep.SCORE:
      return "CV Analysis"
    case WizardStep.LOOP_2Q:
      return "Improvement Questions"
    case WizardStep.PREVIEW:
      return "Final Preview"
    default:
      return "Unknown Step"
  }
}

export const getStepDescription = (step: WizardStep): string => {
  switch (step) {
    case WizardStep.UPLOAD_OR_SKIP:
      return "Upload your existing CV or start building from scratch"
    case WizardStep.PARSE:
      return "We're analyzing your document and extracting information"
    case WizardStep.REVIEW_FIELDS:
      return "Review and edit the extracted information"
    case WizardStep.ASK_4:
      return "Answer a few questions to enhance your profile"
    case WizardStep.MERGE:
      return "Combining your information with AI enhancements"
    case WizardStep.SCORE:
      return "Analyzing your CV quality and providing suggestions"
    case WizardStep.LOOP_2Q:
      return "Quick questions to improve specific areas"
    case WizardStep.PREVIEW:
      return "Review your completed CV and download"
    default:
      return ""
  }
}

// LocalStorage persistence with versioning
const STORAGE_VERSION = "v1"
const STORAGE_KEY = "cvbuilder.state"
const CV_DATA_KEY = "cvbuilder.cvdata"
const SETTINGS_KEY = "cvbuilder.settings"

interface StoredState {
  version: string
  timestamp: number
  wizardState: WizardState
}

interface StoredCVData {
  version: string
  timestamp: number
  cvData: CVData
}

export const saveWizardState = (state: WizardState): void => {
  try {
    const storedState: StoredState = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      wizardState: {
        ...state,
        // Don't serialize File objects - they can't be stored in localStorage
        uploadedFile: state.uploadedFile
          ? ({
              name: state.uploadedFile.name,
              size: state.uploadedFile.size,
              type: state.uploadedFile.type
            } as any)
          : undefined
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(storedState))
  } catch (error) {
    console.error("Failed to save wizard state:", error)
  }
}

export const loadWizardState = (): WizardState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (!stored) return null

    const parsedState: StoredState = JSON.parse(stored)

    // Check version compatibility
    if (parsedState.version !== STORAGE_VERSION) {
      console.warn(
        `Stored state version ${parsedState.version} doesn't match current version ${STORAGE_VERSION}. Clearing old state.`
      )
      clearWizardState()
      return null
    }

    const state = parsedState.wizardState

    // Validate the loaded state has required properties
    if (!state.currentStep || !STEP_ORDER.includes(state.currentStep)) {
      return null
    }

    return {
      ...getDefaultWizardState(),
      ...state,
      // File objects can't be restored from localStorage
      uploadedFile: undefined
    }
  } catch (error) {
    console.error("Failed to load wizard state:", error)
    return null
  }
}

export const saveCVData = (cvData: CVData): void => {
  try {
    const storedCVData: StoredCVData = {
      version: STORAGE_VERSION,
      timestamp: Date.now(),
      cvData
    }
    localStorage.setItem(CV_DATA_KEY, JSON.stringify(storedCVData))
  } catch (error) {
    console.error("Failed to save CV data:", error)
  }
}

export const loadCVData = (): CVData | null => {
  try {
    const stored = localStorage.getItem(CV_DATA_KEY)
    if (!stored) return null

    const parsedData: StoredCVData = JSON.parse(stored)

    // Check version compatibility
    if (parsedData.version !== STORAGE_VERSION) {
      console.warn(
        `Stored CV data version ${parsedData.version} doesn't match current version ${STORAGE_VERSION}. Clearing old data.`
      )
      clearCVData()
      return null
    }

    return parsedData.cvData
  } catch (error) {
    console.error("Failed to load CV data:", error)
    return null
  }
}

export const clearWizardState = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch (error) {
    console.error("Failed to clear wizard state:", error)
  }
}

export const clearCVData = (): void => {
  try {
    localStorage.removeItem(CV_DATA_KEY)
  } catch (error) {
    console.error("Failed to clear CV data:", error)
  }
}

export const clearAllData = (): void => {
  try {
    // Clear all CV Builder related data
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(CV_DATA_KEY)
    localStorage.removeItem(SETTINGS_KEY)

    // Clear any other potential CV Builder keys
    const keysToRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key !== null && key.startsWith("cvbuilder")) {
        keysToRemove.push(key)
      }
    }

    keysToRemove.forEach((key) => localStorage.removeItem(key))

    console.log("All CV Builder data cleared from localStorage")
  } catch (error) {
    console.error("Failed to clear all data:", error)
  }
}

export const getStorageInfo = (): {
  hasWizardState: boolean
  hasCVData: boolean
  hasSettings: boolean
  lastSaved?: Date
} => {
  try {
    const wizardState = localStorage.getItem(STORAGE_KEY)
    const cvData = localStorage.getItem(CV_DATA_KEY)
    const settings = localStorage.getItem(SETTINGS_KEY)

    let lastSaved: Date | undefined

    if (wizardState) {
      try {
        const parsed = JSON.parse(wizardState) as StoredState
        lastSaved = new Date(parsed.timestamp)
      } catch (e) {
        // Ignore parsing errors
      }
    }

    return {
      hasWizardState: !!wizardState,
      hasCVData: !!cvData,
      hasSettings: !!settings,
      lastSaved
    }
  } catch (error) {
    console.error("Failed to get storage info:", error)
    return {
      hasWizardState: false,
      hasCVData: false,
      hasSettings: false
    }
  }
}

// Utility to check if we're in an improvement loop
export const shouldShowImprovementLoop = (
  state: WizardState,
  score?: { overall: number }
): boolean => {
  if (state.improvementRound >= state.maxImprovementRounds) {
    return false
  }

  if (!score) return false

  // Show improvement loop if score is below threshold (e.g., 80%)
  return score.overall < 80
}

// Step validation helpers
export const validateStepData = (
  step: WizardStep,
  state: WizardState
): { isValid: boolean; errors: string[] } => {
  const errors: string[] = []

  switch (step) {
    case WizardStep.REVIEW_FIELDS:
      if (!state.cvData.personalInfo?.name) {
        errors.push("Name is required")
      }
      if (!state.cvData.personalInfo?.email) {
        errors.push("Email is required")
      }
      break

    case WizardStep.ASK_4:
      const answered = Object.keys(state.questionsAnswered || {}).length
      if (answered < 4) {
        errors.push(`Please answer all 4 questions (${answered}/4 completed)`)
      }
      break

    case WizardStep.LOOP_2Q:
      const loopAnswered = Object.keys(state.questionsAnswered || {}).length
      if (loopAnswered < 2) {
        errors.push(
          `Please answer both improvement questions (${loopAnswered}/2 completed)`
        )
      }
      break
  }

  return {
    isValid: errors.length === 0,
    errors
  }
}
