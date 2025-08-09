import React, { useState, useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { useMutation } from "@tanstack/react-query"
import { useImproveCVMutation } from "../lib/api"
import { ArrowLeft, ArrowRight, Save, AlertCircle } from "lucide-react"

import { Container, Button, Card } from "../components/ui"
import { ProgressBar } from "../components/ProgressBar"
import StepUploadOrSkip from "../components/StepUploadOrSkip"
import StepAskQuestions from "../components/StepAskQuestions"
import StepScore from "../components/StepScore"
import DiffModal from "../components/DiffModal"
import { theme } from "../theme"

import {
  WizardStep,
  WizardState,
  CVData,
  getDefaultWizardState,
  nextStep,
  previousStep,
  canGoNext,
  getStepTitle,
  getStepDescription,
  saveWizardState,
  loadWizardState,
  clearWizardState,
  validateStepData,
  shouldShowImprovementLoop,
  STEP_ORDER
} from "../lib/flow"

// Environment configuration - hardcoded for now, will be replaced by proper env vars
const API_BASE = "http://localhost:4000"

// API service functions (using existing apiService pattern)
const apiService = {
  // Parse uploaded CV
  parseCV: async (rawText: string): Promise<CVData> => {
    const response = await fetch(`${API_BASE}/api/ai/parse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rawText })
    })

    if (!response.ok) {
      throw new Error("Failed to parse CV")
    }

    return response.json()
  },

  // Get profile questions
  getQuestions: async (
    count: number,
    cvData: CVData
  ): Promise<Array<{ id: string; question: string; type: string }>> => {
    const response = await fetch(`${API_BASE}/api/ai/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: cvData, count })
    })

    if (!response.ok) {
      throw new Error("Failed to get questions")
    }

    const result = await response.json()
    return result.questions || result
  },

  // Merge CV with answers
  mergeCV: async (
    cvData: CVData,
    answers: Record<string, string>
  ): Promise<CVData> => {
    const response = await fetch(`${API_BASE}/api/ai/improve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: cvData, answers })
    })

    if (!response.ok) {
      throw new Error("Failed to merge CV data")
    }

    return response.json()
  },

  // Score CV
  scoreCV: async (
    cvData: CVData
  ): Promise<{
    overall: number
    breakdown: Record<string, number>
    suggestions: string[]
  }> => {
    const response = await fetch(`${API_BASE}/api/ai/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: cvData })
    })

    if (!response.ok) {
      throw new Error("Failed to score CV")
    }

    return response.json()
  },

  // Improve CV
  improveCV: async (
    cvData: CVData,
    answers: Record<string, string>
  ): Promise<CVData> => {
    const response = await fetch(`${API_BASE}/api/ai/improve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: cvData, answers })
    })

    if (!response.ok) {
      throw new Error("Failed to improve CV")
    }

    return response.json()
  },

  // Generate cover letter
  generateCoverLetter: async (
    cvData: CVData,
    jobDescription?: string
  ): Promise<string> => {
    const response = await fetch(`${API_BASE}/api/ai/coverletter`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cv: cvData, roleHint: jobDescription })
    })

    if (!response.ok) {
      throw new Error("Failed to generate cover letter")
    }

    const result = await response.json()
    return result.coverLetter || result
  }
}

// Step Components (Placeholders)
interface StepProps {
  state: WizardState
  onUpdateState: (updates: Partial<WizardState>) => void
  onNext: () => void
}

const StepReviewFields: React.FC<StepProps> = ({ state, onUpdateState }) => {
  const [formData, setFormData] = useState({
    name: state.cvData.personalInfo?.name || "",
    email: state.cvData.personalInfo?.email || "",
    phone: state.cvData.personalInfo?.phone || "",
    location: state.cvData.personalInfo?.location || "",
    summary: state.cvData.summary || ""
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onUpdateState({
      cvData: {
        ...state.cvData,
        personalInfo: {
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          location: formData.location
        },
        summary: formData.summary
      }
    })
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label
            className={`block text-sm font-medium mb-2 ${theme.colors.text.primary}`}
          >
            Full Name *
          </label>
          <input
            type="text"
            value={formData.name || ""}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className={`w-full p-3 border rounded-lg ${theme.colors.subtle.border} focus:ring-2 focus:ring-blue-500`}
            required
          />
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 ${theme.colors.text.primary}`}
          >
            Email *
          </label>
          <input
            type="email"
            value={formData.email || ""}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className={`w-full p-3 border rounded-lg ${theme.colors.subtle.border} focus:ring-2 focus:ring-blue-500`}
            required
          />
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 ${theme.colors.text.primary}`}
          >
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone || ""}
            onChange={(e) =>
              setFormData({ ...formData, phone: e.target.value })
            }
            className={`w-full p-3 border rounded-lg ${theme.colors.subtle.border} focus:ring-2 focus:ring-blue-500`}
          />
        </div>

        <div>
          <label
            className={`block text-sm font-medium mb-2 ${theme.colors.text.primary}`}
          >
            Professional Summary
          </label>
          <textarea
            value={formData.summary || ""}
            onChange={(e) =>
              setFormData({ ...formData, summary: e.target.value })
            }
            rows={4}
            className={`w-full p-3 border rounded-lg ${theme.colors.subtle.border} focus:ring-2 focus:ring-blue-500`}
            placeholder="Brief summary of your professional background..."
          />
        </div>
      </form>
    </motion.div>
  )
}

const StepPreview: React.FC<StepProps> = ({ state }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.05 }}
      className="space-y-6"
    >
      <Card padding="lg">
        <h3 className={`text-xl font-bold mb-4 ${theme.colors.text.primary}`}>
          Your CV is Ready!
        </h3>
        <p className={`mb-6 ${theme.colors.text.secondary}`}>
          Review your completed CV and download when ready.
        </p>

        {/* CV Preview Placeholder */}
        <div
          className={`${theme.colors.background.tertiary} rounded-lg p-8 text-center`}
        >
          <p className={`${theme.colors.text.tertiary}`}>
            CV Preview will be rendered here
          </p>
        </div>

        <div className="flex gap-4 mt-6">
          <Button className="flex-1">Download PDF</Button>
          <Button variant="secondary" className="flex-1">
            Download DOCX
          </Button>
        </div>
      </Card>
    </motion.div>
  )
}

// Main Wizard Component
export const Wizard: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [wizardState, setWizardState] = useState<WizardState>(() => {
    const loaded = loadWizardState()
    return loaded || getDefaultWizardState()
  })

  const [errors, setErrors] = useState<string[]>([])
  const [isDiffModalOpen, setIsDiffModalOpen] = useState(false)
  const [originalCV, setOriginalCV] = useState<CVData | null>(null)
  const [improvedCV, setImprovedCV] = useState<CVData | null>(null)

  // Auto-save state changes
  useEffect(() => {
    saveWizardState(wizardState)
  }, [wizardState])

  // Handle URL params (e.g., ?upload=true)
  useEffect(() => {
    const shouldUpload = searchParams.get("upload") === "true"
    if (shouldUpload && wizardState.currentStep === WizardStep.UPLOAD_OR_SKIP) {
      // Already on upload step, no action needed
    }
  }, [searchParams, wizardState.currentStep])

  // Parse CV mutation
  const parseMutation = useMutation({
    mutationFn: apiService.parseCV,
    onSuccess: (data) => {
      updateWizardState({
        parsedData: data,
        cvData: { ...wizardState.cvData, ...data }
      })
      handleNext()
    },
    onError: (error) => {
      setErrors([`Failed to parse CV: ${error}`])
    }
  })

  // Score CV mutation
  const scoreMutation = useMutation({
    mutationFn: apiService.scoreCV,
    onSuccess: (score) => {
      const hasImprovementLoop = shouldShowImprovementLoop(wizardState, score)
      updateWizardState({
        score,
        hasImprovementLoop
      })
      handleNext()
    },
    onError: (error) => {
      setErrors([`Failed to score CV: ${error}`])
    }
  })

  // Improve CV mutation
  const improveCVMutation = useImproveCVMutation()

  // Update wizard state helper
  const updateWizardState = (updates: Partial<WizardState>) => {
    setWizardState((prev) => ({ ...prev, ...updates }))
    setErrors([]) // Clear errors on state update
  }

  // Navigation handlers
  const handleNext = () => {
    const validation = validateStepData(wizardState.currentStep, wizardState)

    if (!validation.isValid) {
      setErrors(validation.errors)
      return
    }

    const next = nextStep(
      wizardState.currentStep,
      wizardState.hasImprovementLoop,
      !wizardState.uploadedFile
    )

    if (!next) {
      // Wizard complete, go to preview page
      navigate("/preview")
      return
    }

    // Handle special step logic
    if (next === WizardStep.PARSE && wizardState.uploadedFile) {
      // Get rawText from localStorage (saved by StepUploadOrSkip)
      const fileDataStr = localStorage.getItem("cvbuilder.fileData")
      if (fileDataStr) {
        const fileData = JSON.parse(fileDataStr)
        parseMutation.mutate(fileData.rawText)
      }
      return
    }

    if (next === WizardStep.SCORE) {
      scoreMutation.mutate(wizardState.cvData)
      return
    }

    updateWizardState({
      currentStep: next,
      completedSteps: [...wizardState.completedSteps, wizardState.currentStep]
    })
  }

  const handlePrevious = () => {
    const prev = previousStep(wizardState.currentStep)
    if (prev) {
      updateWizardState({ currentStep: prev })
    }
  }

  const handleRestart = () => {
    clearWizardState()
    setWizardState(getDefaultWizardState())
    setErrors([])
  }

  // Render current step
  const renderCurrentStep = () => {
    const stepProps: StepProps = {
      state: wizardState,
      onUpdateState: updateWizardState,
      onNext: handleNext
    }

    switch (wizardState.currentStep) {
      case WizardStep.UPLOAD_OR_SKIP:
        return (
          <StepUploadOrSkip
            onContinue={(fileData) => {
              if (fileData) {
                // File was uploaded, go to PARSE step
                updateWizardState({
                  uploadedFile: new File(
                    [fileData.rawText],
                    fileData.filename,
                    { type: fileData.type }
                  ),
                  parsedData: {
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
                })
                const next = nextStep(wizardState.currentStep, false, false)
                if (next) {
                  updateWizardState({ currentStep: next })
                }
              } else {
                // Skip upload, go directly to REVIEW_FIELDS
                const next = nextStep(wizardState.currentStep, false, true)
                if (next) {
                  updateWizardState({ currentStep: next })
                }
              }
            }}
          />
        )
      case WizardStep.REVIEW_FIELDS:
        return <StepReviewFields {...stepProps} />
      case WizardStep.ASK_4:
        return (
          <StepAskQuestions
            count={4}
            cv={wizardState.cvData}
            onContinue={(answers) => {
              updateWizardState({ questionsAnswered: answers })

              // Convert answers to format expected by improve API
              const formattedAnswers: Record<string, any> = {}
              Object.entries(answers).forEach(([questionId, answer]) => {
                if (answer.text && !answer.skipped) {
                  formattedAnswers[questionId] = answer.text
                }
              })

              // Only improve if we have actual answers
              if (Object.keys(formattedAnswers).length > 0) {
                setOriginalCV(wizardState.cvData)
                improveCVMutation.mutate(
                  { cv: wizardState.cvData, answers: formattedAnswers },
                  {
                    onSuccess: (improvedData) => {
                      setImprovedCV(improvedData)
                      setIsDiffModalOpen(true)
                    },
                    onError: (error) => {
                      console.error("CV improvement failed:", error)
                      setErrors([`Failed to improve CV: ${error}`])
                      handleNext() // Continue without improvement
                    }
                  }
                )
              } else {
                handleNext() // No answers to process, continue
              }
            }}
            onBack={handlePrevious}
            isLoading={isLoading || improveCVMutation.isPending}
          />
        )
      case WizardStep.LOOP_2Q:
        return (
          <StepAskQuestions
            count={2}
            cv={wizardState.cvData}
            onContinue={(answers) => {
              updateWizardState({ questionsAnswered: answers })

              // Convert answers to format expected by improve API
              const formattedAnswers: Record<string, any> = {}
              Object.entries(answers).forEach(([questionId, answer]) => {
                if (answer.text && !answer.skipped) {
                  formattedAnswers[questionId] = answer.text
                }
              })

              // Only improve if we have actual answers
              if (Object.keys(formattedAnswers).length > 0) {
                setOriginalCV(wizardState.cvData)
                improveCVMutation.mutate(
                  { cv: wizardState.cvData, answers: formattedAnswers },
                  {
                    onSuccess: (improvedData) => {
                      setImprovedCV(improvedData)
                      setIsDiffModalOpen(true)
                    },
                    onError: (error) => {
                      console.error("CV improvement failed:", error)
                      setErrors([`Failed to improve CV: ${error}`])
                      handleNext() // Continue without improvement
                    }
                  }
                )
              } else {
                handleNext() // No answers to process, continue
              }
            }}
            onBack={handlePrevious}
            isLoading={isLoading || improveCVMutation.isPending}
          />
        )
      case WizardStep.SCORE:
        return (
          <StepScore
            cv={wizardState.cvData}
            onImproveMore={() => {
              // Go to LOOP_2Q step for improvement
              updateWizardState({ currentStep: WizardStep.LOOP_2Q })
            }}
            onGoToPreview={() => {
              handleNext() // Go to preview step
            }}
            isLoading={isLoading}
          />
        )
      case WizardStep.PREVIEW:
        return <StepPreview {...stepProps} />
      case WizardStep.PARSE:
      case WizardStep.MERGE:
        return (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-12"
          >
            <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className={`text-lg ${theme.colors.text.primary}`}>
              {getStepDescription(wizardState.currentStep)}
            </p>
          </motion.div>
        )
      default:
        return (
          <div className="text-center py-12">
            <p className={`${theme.colors.text.tertiary}`}>
              Step component not implemented yet
            </p>
          </div>
        )
    }
  }

  const currentStepIndex = STEP_ORDER.indexOf(wizardState.currentStep)
  const canGoBack = currentStepIndex > 0
  const canContinue = canGoNext(wizardState.currentStep, wizardState)
  const isLoading =
    parseMutation.isPending ||
    scoreMutation.isPending ||
    improveCVMutation.isPending

  return (
    <>
      <Container size="md" className="py-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <ProgressBar
            step={currentStepIndex + 1}
            totalSteps={STEP_ORDER.length}
            steps={STEP_ORDER.map(getStepTitle)}
            showPercentage={false}
          />
        </div>

        {/* Step Header */}
        <div className="text-center mb-8">
          <h1
            className={`text-3xl font-bold mb-2 ${theme.colors.text.primary}`}
          >
            {getStepTitle(wizardState.currentStep)}
          </h1>
          <p className={`text-lg ${theme.colors.text.secondary}`}>
            {getStepDescription(wizardState.currentStep)}
          </p>
        </div>

        {/* Error Messages */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <Card className="border-red-200 bg-red-50">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-red-500 mr-3 mt-0.5" />
                <div>
                  <h4 className="text-red-800 font-medium mb-1">
                    Please fix the following issues:
                  </h4>
                  <ul className="text-red-700 text-sm space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>• {error}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Step Content */}
        <div className="min-h-[400px] mb-8">
          <AnimatePresence mode="wait">
            <div key={wizardState.currentStep}>{renderCurrentStep()}</div>
          </AnimatePresence>
        </div>

        {/* Navigation - Hide for steps that handle their own navigation */}
        {wizardState.currentStep !== WizardStep.ASK_4 &&
          wizardState.currentStep !== WizardStep.LOOP_2Q &&
          wizardState.currentStep !== WizardStep.UPLOAD_OR_SKIP &&
          wizardState.currentStep !== WizardStep.SCORE && (
            <div className="flex items-center justify-between">
              <div className="flex gap-3">
                {canGoBack && (
                  <Button
                    variant="ghost"
                    onClick={handlePrevious}
                    disabled={isLoading}
                  >
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Previous
                  </Button>
                )}

                <Button
                  variant="ghost"
                  onClick={handleRestart}
                  disabled={isLoading}
                >
                  <Save className="w-4 h-4 mr-2" />
                  Start Over
                </Button>
              </div>

              <Button
                onClick={handleNext}
                disabled={!canContinue || isLoading}
                loading={isLoading}
              >
                {wizardState.currentStep === WizardStep.PREVIEW
                  ? "Complete"
                  : "Next"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          )}
      </Container>

      {/* Diff Modal */}
      <DiffModal
        isOpen={isDiffModalOpen}
        onClose={() => setIsDiffModalOpen(false)}
        oldCV={originalCV || wizardState.cvData}
        newCV={improvedCV || wizardState.cvData}
        onAccept={(newCV) => {
          updateWizardState({ cvData: newCV })
          setIsDiffModalOpen(false)
          setOriginalCV(null)
          setImprovedCV(null)
          handleNext()
        }}
        onReject={() => {
          setIsDiffModalOpen(false)
          setOriginalCV(null)
          setImprovedCV(null)
          handleNext()
        }}
      />
    </>
  )
}

export default Wizard
