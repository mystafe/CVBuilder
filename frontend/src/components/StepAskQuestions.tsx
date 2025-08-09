import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Skip,
  ArrowLeft,
  ArrowRight,
  Clock
} from "lucide-react"
import { Button, Card, Container } from "./ui"
import { theme } from "../theme"
import { useGenerateQuestionsMutation, CVData, Question } from "../lib/api"

interface StepAskQuestionsProps {
  count: number
  cv: CVData
  onContinue: (
    answers: Record<string, { text?: string; skipped: boolean }>
  ) => void
  onBack: () => void
  isLoading?: boolean
}

interface Answer {
  text?: string
  skipped: boolean
}

const StepAskQuestions: React.FC<StepAskQuestionsProps> = ({
  count,
  cv,
  onContinue,
  onBack,
  isLoading = false
}) => {
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [expandedQuestions, setExpandedQuestions] = useState<Set<string>>(
    new Set()
  )
  const [focusedQuestion, setFocusedQuestion] = useState<string | null>(null)

  const generateQuestionsMutation = useGenerateQuestionsMutation()
  const textareaRefs = useRef<Record<string, HTMLTextAreaElement>>({})

  // Auto-resize textarea
  const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = "auto"
    textarea.style.height = `${Math.max(120, textarea.scrollHeight)}px`
  }

  // Load questions on mount
  useEffect(() => {
    if (cv && !generateQuestionsMutation.isPending) {
      generateQuestionsMutation.mutate(
        { cv, count },
        {
          onSuccess: (data) => {
            setQuestions(data)
            // Initialize answers state
            const initialAnswers: Record<string, Answer> = {}
            data.forEach((q) => {
              initialAnswers[q.id] = { skipped: false }
            })
            setAnswers(initialAnswers)
            // Auto-expand first question
            if (data.length > 0) {
              setExpandedQuestions(new Set([data[0].id]))
            }
          }
        }
      )
    }
  }, [cv, count])

  // Update answer text
  const updateAnswerText = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text: text.trim() || undefined,
        skipped: false
      }
    }))
  }

  // Toggle skip status
  const toggleSkip = (questionId: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text: prev[questionId]?.skipped ? prev[questionId]?.text : undefined,
        skipped: !prev[questionId]?.skipped
      }
    }))
  }

  // Toggle question expansion
  const toggleQuestion = (questionId: string) => {
    setExpandedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(questionId)) {
        next.delete(questionId)
      } else {
        next.add(questionId)
      }
      return next
    })
  }

  // Check if we can continue
  const canContinue = () => {
    if (Object.keys(answers).length === 0) return false

    return Object.values(answers).some(
      (answer) => answer.skipped || (answer.text && answer.text.length > 0)
    )
  }

  // Get word count for text
  const getWordCount = (text: string) => {
    return text
      .trim()
      .split(/\s+/)
      .filter((word) => word.length > 0).length
  }

  // Handle continue
  const handleContinue = () => {
    onContinue(answers)
  }

  // Loading state
  if (generateQuestionsMutation.isPending || isLoading) {
    return (
      <Container className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-12 h-12 mx-auto mb-4"
          >
            <Clock className="w-12 h-12 text-indigo-600" />
          </motion.div>
          <h2
            className={`text-2xl ${theme.typography.heading.large} ${theme.colors.text.primary} mb-2`}
          >
            Generating Questions
          </h2>
          <p className={theme.colors.text.secondary}>
            AI is preparing {count} personalized questions for your CV...
          </p>
        </motion.div>
      </Container>
    )
  }

  // Error state
  if (generateQuestionsMutation.isError) {
    return (
      <Container className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <MessageSquare className="w-8 h-8 text-red-600" />
          </div>
          <h2
            className={`text-2xl ${theme.typography.heading.large} ${theme.colors.text.primary} mb-2`}
          >
            Failed to Generate Questions
          </h2>
          <p className={`${theme.colors.text.secondary} mb-6`}>
            We couldn't generate questions for your CV. Please try again.
          </p>
          <Button
            onClick={() => generateQuestionsMutation.mutate({ cv, count })}
            loading={generateQuestionsMutation.isPending}
          >
            Try Again
          </Button>
        </motion.div>
      </Container>
    )
  }

  return (
    <Container className="py-8">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1
          className={`text-3xl md:text-4xl ${theme.typography.heading.large} ${theme.colors.text.primary} mb-4`}
        >
          {count === 4 ? "Enhance Your CV" : "Final Improvements"}
        </h1>
        <p
          className={`text-lg ${theme.colors.text.secondary} max-w-2xl mx-auto`}
        >
          {count === 4
            ? "Answer these questions to help AI improve your CV content and structure."
            : "A few more questions to perfect your CV before finalizing."}
        </p>
        <div className="flex items-center justify-center gap-2 mt-4">
          <div
            className={`px-3 py-1 ${theme.colors.surface.card} ${theme.radius.full} text-sm ${theme.colors.text.secondary}`}
          >
            {Object.values(answers).filter((a) => a.text || a.skipped).length}{" "}
            of {questions.length} completed
          </div>
        </div>
      </motion.div>

      {/* Questions */}
      <div className="space-y-6 mb-8">
        <AnimatePresence>
          {questions.map((question, index) => {
            const isExpanded = expandedQuestions.has(question.id)
            const answer = answers[question.id]
            const isFocused = focusedQuestion === question.id
            const wordCount = answer?.text ? getWordCount(answer.text) : 0
            const isCompleted =
              answer?.skipped || (answer?.text && answer.text.length > 0)

            return (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="w-full"
              >
                <Card
                  variant={isCompleted ? "elevated" : "default"}
                  className={`
                    transition-all duration-300
                    ${isFocused ? "ring-2 ring-indigo-500/50" : ""}
                    ${
                      isCompleted
                        ? "border-green-200 dark:border-green-800"
                        : ""
                    }
                  `}
                >
                  {/* Question Header */}
                  <button
                    onClick={() => toggleQuestion(question.id)}
                    className="w-full flex items-center justify-between p-4 text-left hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex-1 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`
                          w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold
                          ${
                            isCompleted
                              ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400"
                              : "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400"
                          }
                        `}
                        >
                          {index + 1}
                        </div>
                        <h3
                          className={`${theme.typography.heading.medium} ${theme.colors.text.primary}`}
                        >
                          {question.question}
                        </h3>
                      </div>
                      {question.category && (
                        <div className="mt-2 ml-11">
                          <span
                            className={`text-xs px-2 py-1 ${theme.colors.surface.card} ${theme.radius.full} ${theme.colors.text.subtle}`}
                          >
                            {question.category}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3">
                      {/* Status indicators */}
                      {answer?.skipped && (
                        <span className="text-xs px-2 py-1 bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                          Skipped
                        </span>
                      )}
                      {wordCount > 0 && (
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full">
                          {wordCount} words
                        </span>
                      )}

                      <motion.div
                        animate={{ rotate: isExpanded ? 90 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronRight className="w-5 h-5 text-slate-400" />
                      </motion.div>
                    </div>
                  </button>

                  {/* Question Content */}
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4">
                          <div className="ml-11 space-y-4">
                            {/* Skip Toggle */}
                            <div className="flex items-center gap-3">
                              <button
                                onClick={() => toggleSkip(question.id)}
                                className={`
                                  flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                                  ${
                                    answer?.skipped
                                      ? "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400"
                                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                                  }
                                `}
                              >
                                <Skip className="w-4 h-4" />
                                {answer?.skipped
                                  ? "Skipped"
                                  : "Skip this question"}
                              </button>
                            </div>

                            {/* Answer Input */}
                            {!answer?.skipped && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.1 }}
                              >
                                <textarea
                                  ref={(el) => {
                                    if (el)
                                      textareaRefs.current[question.id] = el
                                  }}
                                  value={answer?.text || ""}
                                  onChange={(e) => {
                                    updateAnswerText(
                                      question.id,
                                      e.target.value
                                    )
                                    adjustTextareaHeight(e.target)
                                  }}
                                  onFocus={() =>
                                    setFocusedQuestion(question.id)
                                  }
                                  onBlur={() => setFocusedQuestion(null)}
                                  placeholder="Share your thoughts, experiences, or details that would strengthen your CV..."
                                  className={`
                                    w-full min-h-[120px] p-4 border rounded-lg resize-none
                                    ${theme.colors.surface.primary} ${theme.colors.text.primary}
                                    border-slate-200 dark:border-slate-700
                                    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
                                    transition-all duration-200
                                    placeholder-slate-400 dark:placeholder-slate-500
                                  `}
                                  rows={4}
                                />

                                {/* Word count and tips */}
                                {(answer?.text || isFocused) && (
                                  <motion.div
                                    initial={{ opacity: 0, y: 5 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="flex items-center justify-between mt-2 text-xs text-slate-500"
                                  >
                                    <div>
                                      {wordCount > 0 && (
                                        <span
                                          className={
                                            wordCount > 100
                                              ? "text-amber-600"
                                              : "text-green-600"
                                          }
                                        >
                                          {wordCount} words
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <span>Be specific and use examples</span>
                                    </div>
                                  </motion.div>
                                )}
                              </motion.div>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {/* Footer Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-slate-200 dark:border-slate-700"
      >
        <Button variant="ghost" onClick={onBack} className="w-full sm:w-auto">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>

        <div className="flex items-center gap-4">
          <div className="text-sm text-slate-500">
            {Object.values(answers).filter((a) => a.text || a.skipped).length}{" "}
            of {questions.length} completed
          </div>

          <Button
            onClick={handleContinue}
            disabled={!canContinue()}
            size="lg"
            className="w-full sm:w-auto"
          >
            Continue
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </motion.div>
    </Container>
  )
}

export default StepAskQuestions
