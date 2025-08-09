import React, { useState, useEffect } from "react"
import { motion } from "framer-motion"
import {
  TrendingUp,
  TrendingDown,
  Lightbulb,
  Star,
  AlertTriangle,
  ArrowRight,
  RefreshCw,
  Award,
  Target,
  Clock
} from "lucide-react"
import { Button, Card, Container } from "./ui"
import { theme } from "../theme"
import { useScoreCVMutation, CVData, ScoreResult } from "../lib/api"

interface StepScoreProps {
  cv: CVData
  onImproveMore: () => void
  onGoToPreview: () => void
  isLoading?: boolean
}

// Circular progress component with pure CSS
const CircularProgress: React.FC<{
  score: number
  size?: number
  strokeWidth?: number
  animationDelay?: number
}> = ({ score, size = 200, strokeWidth = 8, animationDelay = 0 }) => {
  // Ensure size is a valid number
  const validSize = typeof size === "number" && size > 0 ? size : 200
  const radius = (validSize - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (score / 100) * circumference

  return (
    <div className="relative" style={{ width: validSize, height: validSize }}>
      <svg
        className="transform -rotate-90"
        width={validSize}
        height={validSize}
        viewBox={`0 0 ${validSize} ${validSize}`}
      >
        {/* Background circle */}
        <circle
          cx={validSize / 2}
          cy={validSize / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="transparent"
          className="text-slate-200 dark:text-slate-700"
        />
        {/* Progress circle */}
        <motion.circle
          cx={validSize / 2}
          cy={validSize / 2}
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{
            duration: 2,
            delay: animationDelay,
            ease: "easeInOut"
          }}
          className="drop-shadow-sm"
        />
        {/* Gradient definition */}
        <defs>
          <linearGradient
            id="scoreGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="100%"
          >
            <stop
              offset="0%"
              stopColor={
                score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : "#ef4444"
              }
            />
            <stop
              offset="100%"
              stopColor={
                score >= 80 ? "#059669" : score >= 60 ? "#d97706" : "#dc2626"
              }
            />
          </linearGradient>
        </defs>
      </svg>

      {/* Score text in center */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              duration: 0.8,
              delay: animationDelay + 1,
              type: "spring",
              stiffness: 200
            }}
            className={`text-4xl font-black ${
              score >= 80
                ? "text-green-600 dark:text-green-400"
                : score >= 60
                ? "text-amber-600 dark:text-amber-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            {score}
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.6,
              delay: animationDelay + 1.5
            }}
            className={`text-sm font-medium ${theme.colors.text.secondary}`}
          >
            Score
          </motion.div>
        </div>
      </div>
    </div>
  )
}

// Badge component for strengths/weaknesses
const ScoreBadge: React.FC<{
  text: string
  type: "strength" | "weakness" | "suggestion"
  index: number
}> = ({ text, type, index }) => {
  const getColors = () => {
    switch (type) {
      case "strength":
        return "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-700"
      case "weakness":
        return "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-700"
      case "suggestion":
        return "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-700"
      default:
        return "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-300"
    }
  }

  const getIcon = () => {
    switch (type) {
      case "strength":
        return <Star className="w-4 h-4 flex-shrink-0" />
      case "weakness":
        return <AlertTriangle className="w-4 h-4 flex-shrink-0" />
      case "suggestion":
        return <Lightbulb className="w-4 h-4 flex-shrink-0" />
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{
        duration: 0.4,
        delay: index * 0.1
      }}
      className={`
        flex items-start gap-3 p-3 rounded-lg border
        ${getColors()}
      `}
    >
      {getIcon()}
      <span className="text-sm leading-relaxed">{text}</span>
    </motion.div>
  )
}

const StepScore: React.FC<StepScoreProps> = ({
  cv,
  onImproveMore,
  onGoToPreview,
  isLoading = false
}) => {
  const [scoreData, setScoreData] = useState<ScoreResult | null>(null)
  const scoreCVMutation = useScoreCVMutation()

  // Load score on mount
  useEffect(() => {
    if (cv && !scoreCVMutation.isPending) {
      scoreCVMutation.mutate(cv, {
        onSuccess: (data) => {
          setScoreData(data)
        }
      })
    }
  }, [cv, scoreCVMutation])

  // Get score category and message
  const getScoreCategory = (score: number) => {
    if (score >= 80)
      return { category: "Excellent", color: "text-green-600", icon: Award }
    if (score >= 60)
      return { category: "Good", color: "text-amber-600", icon: Target }
    return {
      category: "Needs Improvement",
      color: "text-red-600",
      icon: TrendingUp
    }
  }

  // Loading state
  if (scoreCVMutation.isPending || isLoading) {
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
            className="w-16 h-16 mx-auto mb-6"
          >
            <Clock className="w-16 h-16 text-indigo-600" />
          </motion.div>
          <h2
            className={`text-3xl ${theme.typography.heading.large} ${theme.colors.text.primary} mb-2`}
          >
            Analyzing Your CV
          </h2>
          <p className={theme.colors.text.secondary}>
            AI is evaluating your CV across multiple criteria...
          </p>
        </motion.div>
      </Container>
    )
  }

  // Error state
  if (scoreCVMutation.isError) {
    return (
      <Container className="py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="w-16 h-16 mx-auto mb-6 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
            <AlertTriangle className="w-8 h-8 text-red-600" />
          </div>
          <h2
            className={`text-2xl ${theme.typography.heading.large} ${theme.colors.text.primary} mb-2`}
          >
            Scoring Failed
          </h2>
          <p className={`${theme.colors.text.secondary} mb-6`}>
            We couldn't analyze your CV. Please try again.
          </p>
          <Button
            onClick={() => scoreCVMutation.mutate(cv)}
            loading={scoreCVMutation.isPending}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Try Again
          </Button>
        </motion.div>
      </Container>
    )
  }

  if (!scoreData) return null

  const {
    category,
    color,
    icon: CategoryIcon
  } = getScoreCategory(scoreData.score)

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
          Your CV Score
        </h1>
        <p className={`text-lg ${theme.colors.text.secondary}`}>
          Professional analysis of your CV with improvement recommendations
        </p>
      </motion.div>

      {/* Score Section */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="text-center mb-12"
      >
        <Card padding="lg" className="inline-block">
          <div className="flex flex-col items-center gap-6">
            <CircularProgress score={scoreData.score} animationDelay={0.3} />

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8, duration: 0.6 }}
              className="text-center"
            >
              <div className={`flex items-center justify-center gap-2 mb-2`}>
                <CategoryIcon className={`w-6 h-6 ${color}`} />
                <span className={`text-xl font-semibold ${color}`}>
                  {category}
                </span>
              </div>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                {scoreData.score >= 80
                  ? "Your CV demonstrates professional excellence!"
                  : scoreData.score >= 60
                  ? "Your CV is solid with room for enhancement."
                  : "Your CV has potential - let's improve it together."}
              </p>
            </motion.div>
          </div>
        </Card>
      </motion.div>

      {/* Detailed Feedback */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        {/* Strengths */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2, duration: 0.6 }}
        >
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
                <TrendingUp className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <h3
                className={`text-lg ${theme.typography.heading.medium} ${theme.colors.text.primary}`}
              >
                Strengths
              </h3>
            </div>
            <div className="space-y-3">
              {scoreData.strengths.map((strength, index) => (
                <ScoreBadge
                  key={index}
                  text={strength}
                  type="strength"
                  index={index}
                />
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Weaknesses */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.2, duration: 0.6 }}
        >
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                <TrendingDown className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <h3
                className={`text-lg ${theme.typography.heading.medium} ${theme.colors.text.primary}`}
              >
                Areas to Improve
              </h3>
            </div>
            <div className="space-y-3">
              {scoreData.weaknesses.map((weakness, index) => (
                <ScoreBadge
                  key={index}
                  text={weakness}
                  type="weakness"
                  index={index}
                />
              ))}
            </div>
          </Card>
        </motion.div>

        {/* Suggestions */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 2.4, duration: 0.6 }}
        >
          <Card padding="lg">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <h3
                className={`text-lg ${theme.typography.heading.medium} ${theme.colors.text.primary}`}
              >
                Recommendations
              </h3>
            </div>
            <div className="space-y-3">
              {scoreData.suggestions.map((suggestion, index) => (
                <ScoreBadge
                  key={index}
                  text={suggestion}
                  type="suggestion"
                  index={index}
                />
              ))}
            </div>
          </Card>
        </motion.div>
      </div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6, duration: 0.6 }}
        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
      >
        {scoreData.score < 85 && (
          <Button
            onClick={onImproveMore}
            size="lg"
            className="w-full sm:w-auto"
          >
            <RefreshCw className="w-5 h-5 mr-2" />
            Improve More
          </Button>
        )}

        <Button
          variant={scoreData.score < 85 ? "secondary" : "primary"}
          onClick={onGoToPreview}
          size="lg"
          className="w-full sm:w-auto"
        >
          {scoreData.score >= 85 ? "Perfect! " : ""}Go to Preview
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>

      {/* Additional Info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 3, duration: 0.6 }}
        className="text-center mt-8"
      >
        <p className={`text-sm ${theme.colors.text.secondary}`}>
          Score is based on content quality, formatting, impact demonstration,
          and industry standards.
        </p>
      </motion.div>
    </Container>
  )
}

export default StepScore
