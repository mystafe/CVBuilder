import React from "react"
import { motion } from "framer-motion"
import { theme } from "../theme"

interface ProgressBarProps {
  step: number
  totalSteps?: number
  steps?: string[]
  className?: string
  showPercentage?: boolean
  showStepLabels?: boolean
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  step,
  totalSteps = 5,
  steps = ["Start", "Upload", "Process", "Customize", "Complete"],
  className = "",
  showPercentage = true,
  showStepLabels = true
}) => {
  const percentage = Math.min(Math.max((step / totalSteps) * 100, 0), 100)
  const currentStepIndex = Math.min(Math.max(step - 1, 0), steps.length - 1)

  return (
    <div className={`w-full ${className}`}>
      {/* Progress Bar */}
      <div className="relative">
        {/* Background Track */}
        <div
          className={`
            w-full h-2 
            ${theme.colors.background.tertiary} 
            ${theme.radius.full} 
            overflow-hidden
          `}
        >
          {/* Progress Fill */}
          <motion.div
            className={`
              h-full 
              ${theme.colors.primary[600]} 
              ${theme.radius.full}
            `}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              type: "spring",
              stiffness: 100,
              damping: 20,
              duration: 0.8
            }}
          />
        </div>

        {/* Step Indicators */}
        {showStepLabels && (
          <div className="flex justify-between mt-3">
            {steps.map((stepLabel, index) => {
              const isCompleted = index < step
              const isCurrent = index === currentStepIndex

              return (
                <div
                  key={index}
                  className="flex flex-col items-center"
                  style={{ width: `${100 / steps.length}%` }}
                >
                  {/* Step Circle */}
                  <motion.div
                    className={`
                      w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium
                      ${
                        isCompleted
                          ? `${theme.colors.primary[600]} ${theme.colors.text.inverse}`
                          : isCurrent
                          ? `${theme.colors.primary[100]} ${theme.colors.primary.text} ring-2 ring-blue-500 ring-offset-2`
                          : `${theme.colors.background.tertiary} ${theme.colors.text.tertiary}`
                      }
                      ${theme.transitions.default}
                    `}
                    initial={{ scale: 0.8 }}
                    animate={{
                      scale: isCurrent ? 1.1 : 1,
                      transition: {
                        type: "spring",
                        stiffness: 300,
                        damping: 25
                      }
                    }}
                  >
                    {isCompleted ? (
                      <svg
                        className="w-3 h-3"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    ) : (
                      index + 1
                    )}
                  </motion.div>

                  {/* Step Label */}
                  <motion.span
                    className={`
                      mt-2 text-xs font-medium text-center
                      ${
                        isCurrent
                          ? theme.colors.text.primary
                          : isCompleted
                          ? theme.colors.primary.text
                          : theme.colors.text.tertiary
                      }
                      ${theme.transitions.default}
                    `}
                    initial={{ opacity: 0.7 }}
                    animate={{
                      opacity: isCurrent ? 1 : 0.7,
                      transition: { duration: 0.3 }
                    }}
                  >
                    {stepLabel}
                  </motion.span>
                </div>
              )
            })}
          </div>
        )}

        {/* Percentage Display */}
        {showPercentage && (
          <motion.div
            className={`
              mt-3 text-center text-sm font-medium
              ${theme.colors.text.secondary}
            `}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <motion.span
              key={percentage}
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 200,
                damping: 20
              }}
            >
              {Math.round(percentage)}% Complete
            </motion.span>
          </motion.div>
        )}
      </div>
    </div>
  )
}
