import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { RotateCcw, AlertTriangle, Trash2 } from "lucide-react"
import { Button } from "./ui"
import { clearAllData, getStorageInfo } from "../lib/flow"
import { useToast } from "./Toast"

interface ResetAllButtonProps {
  onReset?: () => void
  className?: string
}

const ResetAllButton: React.FC<ResetAllButtonProps> = ({
  onReset,
  className = ""
}) => {
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [isResetting, setIsResetting] = useState(false)
  const toast = useToast()

  const storageInfo = getStorageInfo()
  const hasData =
    storageInfo.hasWizardState ||
    storageInfo.hasCVData ||
    storageInfo.hasSettings

  const handleReset = async () => {
    setIsResetting(true)

    try {
      // Clear all data
      clearAllData()

      // Call the onReset callback if provided
      if (onReset) {
        onReset()
      }

      // Show success toast
      toast.success(
        "All data cleared",
        "Your CV data, progress, and settings have been reset.",
        { duration: 4000 }
      )

      // Close confirmation modal
      setShowConfirmation(false)

      // Reload the page to ensure clean state
      setTimeout(() => {
        window.location.reload()
      }, 1000)
    } catch (error) {
      console.error("Failed to reset data:", error)
      toast.error(
        "Reset failed",
        "There was an error clearing your data. Please try again.",
        { duration: 6000 }
      )
    } finally {
      setIsResetting(false)
    }
  }

  if (!hasData) {
    return null // Don't show the button if there's no data to reset
  }

  return (
    <>
      <Button
        onClick={() => setShowConfirmation(true)}
        variant="ghost"
        size="sm"
        className={`text-red-600 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20 ${className}`}
        aria-label="Reset all CV Builder data"
      >
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset All
      </Button>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {showConfirmation && (
          <>
            {/* Backdrop */}
            <motion.div
              className="fixed inset-0 bg-black bg-opacity-50 z-50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isResetting && setShowConfirmation(false)}
            />

            {/* Modal */}
            <motion.div
              className="fixed inset-0 flex items-center justify-center z-50 p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 25 }}
            >
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
                {/* Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-full">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                      Reset All Data
                    </h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      This action cannot be undone
                    </p>
                  </div>
                </div>

                {/* Content */}
                <div className="mb-6">
                  <p className="text-gray-700 dark:text-gray-300 mb-4">
                    This will permanently delete:
                  </p>

                  <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                    {storageInfo.hasWizardState && (
                      <li className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span>Your current wizard progress</span>
                      </li>
                    )}
                    {storageInfo.hasCVData && (
                      <li className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span>All CV information and data</span>
                      </li>
                    )}
                    {storageInfo.hasSettings && (
                      <li className="flex items-center space-x-2">
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span>Your customized settings</span>
                      </li>
                    )}
                  </ul>

                  {storageInfo.lastSaved && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
                      Last saved: {storageInfo.lastSaved.toLocaleString()}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex space-x-3">
                  <Button
                    onClick={() => setShowConfirmation(false)}
                    variant="secondary"
                    className="flex-1"
                    disabled={isResetting}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleReset}
                    variant="primary"
                    className="flex-1 bg-red-600 hover:bg-red-700 focus:ring-red-500"
                    disabled={isResetting}
                    loading={isResetting}
                  >
                    {isResetting ? "Resetting..." : "Reset All Data"}
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  )
}

export default ResetAllButton
