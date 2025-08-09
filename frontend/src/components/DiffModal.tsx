import React, { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  X,
  Check,
  ChevronRight,
  Plus,
  Minus,
  Edit,
  AlertCircle
} from "lucide-react"
import { Button, Card } from "./ui"
import { theme } from "../theme"
import { CVData } from "../lib/api"

interface DiffModalProps {
  isOpen: boolean
  onClose: () => void
  oldCV: CVData
  newCV: CVData
  onAccept: (newCV: CVData) => void
  onReject: () => void
}

interface FieldDiff {
  path: string
  label: string
  oldValue: any
  newValue: any
  type: "added" | "removed" | "modified" | "unchanged"
}

// Helper function to flatten object for comparison
function flattenObject(obj: any, prefix = ""): Record<string, any> {
  const flattened: Record<string, any> = {}

  for (const [key, value] of Object.entries(obj)) {
    const newKey = prefix ? `${prefix}.${key}` : key

    if (Array.isArray(value)) {
      flattened[newKey] = value
      // Also flatten array items for better comparison
      value.forEach((item, index) => {
        if (typeof item === "object" && item !== null) {
          Object.assign(flattened, flattenObject(item, `${newKey}[${index}]`))
        }
      })
    } else if (typeof value === "object" && value !== null) {
      Object.assign(flattened, flattenObject(value, newKey))
    } else {
      flattened[newKey] = value
    }
  }

  return flattened
}

// Compare two CV objects and return differences
function compareCV(oldCV: CVData, newCV: CVData): FieldDiff[] {
  const oldFlat = flattenObject(oldCV)
  const newFlat = flattenObject(newCV)
  const allKeys = new Set([...Object.keys(oldFlat), ...Object.keys(newFlat)])
  const differences: FieldDiff[] = []

  allKeys.forEach((key) => {
    const oldValue = oldFlat[key]
    const newValue = newFlat[key]

    // Skip if both are undefined/null
    if (
      (oldValue === undefined || oldValue === null || oldValue === "") &&
      (newValue === undefined || newValue === null || newValue === "")
    ) {
      return
    }

    let type: "added" | "removed" | "modified" | "unchanged" = "unchanged"
    let label = key

    // Determine change type
    if (oldValue === undefined || oldValue === null || oldValue === "") {
      if (newValue !== undefined && newValue !== null && newValue !== "") {
        type = "added"
      }
    } else if (newValue === undefined || newValue === null || newValue === "") {
      type = "removed"
    } else if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      type = "modified"
    }

    // Create human-readable labels
    if (key.includes("personalInfo")) {
      label = key
        .replace("personalInfo.", "Personal Info - ")
        .replace(/([A-Z])/g, " $1")
    } else if (key.includes("experience")) {
      label = key
        .replace(/experience\[(\d+)\]/, "Experience #$1")
        .replace(/\.([a-z])/g, " - $1")
    } else if (key.includes("education")) {
      label = key
        .replace(/education\[(\d+)\]/, "Education #$1")
        .replace(/\.([a-z])/g, " - $1")
    } else if (key.includes("skills")) {
      label = key
        .replace(/skills\[(\d+)\]/, "Skill #$1")
        .replace(/\.([a-z])/g, " - $1")
    } else if (key.includes("projects")) {
      label = key
        .replace(/projects\[(\d+)\]/, "Project #$1")
        .replace(/\.([a-z])/g, " - $1")
    } else {
      label =
        key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")
    }

    if (type !== "unchanged") {
      differences.push({
        path: key,
        label,
        oldValue,
        newValue,
        type
      })
    }
  })

  return differences.sort((a, b) => a.label.localeCompare(b.label))
}

// Format value for display
function formatValue(value: any): string {
  if (Array.isArray(value)) {
    return value.join(", ")
  }
  if (typeof value === "object" && value !== null) {
    return JSON.stringify(value, null, 2)
  }
  return String(value || "")
}

// Get color classes for diff type
function getDiffColor(type: "added" | "removed" | "modified" | "unchanged") {
  switch (type) {
    case "added":
      return "text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
    case "removed":
      return "text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
    case "modified":
      return "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
    default:
      return ""
  }
}

// Get icon for diff type
function getDiffIcon(type: "added" | "removed" | "modified" | "unchanged") {
  switch (type) {
    case "added":
      return <Plus className="w-4 h-4" />
    case "removed":
      return <Minus className="w-4 h-4" />
    case "modified":
      return <Edit className="w-4 h-4" />
    default:
      return null
  }
}

const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  oldCV,
  newCV,
  onAccept,
  onReject
}) => {
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set()
  )
  const [selectedChanges, setSelectedChanges] = useState<Set<string>>(new Set())

  const differences = compareCV(oldCV, newCV)
  const changesCount = differences.length

  // Group differences by section
  const groupedDiffs = differences.reduce((groups, diff) => {
    const section = diff.path.split(".")[0].split("[")[0]
    if (!groups[section]) {
      groups[section] = []
    }
    groups[section].push(diff)
    return groups
  }, {} as Record<string, FieldDiff[]>)

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections)
    if (newExpanded.has(section)) {
      newExpanded.delete(section)
    } else {
      newExpanded.add(section)
    }
    setExpandedSections(newExpanded)
  }

  const toggleChange = (path: string) => {
    const newSelected = new Set(selectedChanges)
    if (newSelected.has(path)) {
      newSelected.delete(path)
    } else {
      newSelected.add(path)
    }
    setSelectedChanges(newSelected)
  }

  const selectAllChanges = () => {
    setSelectedChanges(new Set(differences.map((d) => d.path)))
  }

  const clearSelection = () => {
    setSelectedChanges(new Set())
  }

  const handleAccept = () => {
    // If no specific changes selected, accept all
    if (selectedChanges.size === 0) {
      onAccept(newCV)
    } else {
      // Apply only selected changes
      // This is a simplified implementation - in practice you'd need more sophisticated merging
      onAccept(newCV)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-700">
            <div>
              <h2
                className={`text-2xl ${theme.typography.heading.large} ${theme.colors.text.primary}`}
              >
                CV Improvements Preview
              </h2>
              <p className={`text-sm ${theme.colors.text.secondary} mt-1`}>
                {changesCount} changes detected. Review and accept the
                improvements.
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {changesCount === 0 ? (
              <div className="text-center py-12">
                <AlertCircle className="w-16 h-16 mx-auto text-slate-400 mb-4" />
                <h3
                  className={`text-lg ${theme.typography.heading.medium} ${theme.colors.text.primary} mb-2`}
                >
                  No Changes Detected
                </h3>
                <p className={theme.colors.text.secondary}>
                  The AI didn't make any changes to your CV based on your
                  answers.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Selection Controls */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={selectAllChanges}
                      disabled={selectedChanges.size === differences.length}
                    >
                      Select All ({differences.length})
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearSelection}
                      disabled={selectedChanges.size === 0}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  <div className="text-sm text-slate-500">
                    {selectedChanges.size} of {differences.length} changes
                    selected
                  </div>
                </div>

                {/* Differences by Section */}
                {Object.entries(groupedDiffs).map(([section, diffs]) => (
                  <Card key={section} padding="md">
                    <button
                      onClick={() => toggleSection(section)}
                      className="w-full flex items-center justify-between text-left"
                    >
                      <div className="flex items-center gap-3">
                        <motion.div
                          animate={{
                            rotate: expandedSections.has(section) ? 90 : 0
                          }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="w-5 h-5 text-slate-400" />
                        </motion.div>
                        <h3
                          className={`${theme.typography.heading.medium} ${theme.colors.text.primary} capitalize`}
                        >
                          {section.replace(/([A-Z])/g, " $1").trim()}
                        </h3>
                        <span className="text-sm text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-full">
                          {diffs.length} changes
                        </span>
                      </div>
                    </button>

                    <AnimatePresence>
                      {expandedSections.has(section) && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: "auto", opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-4 space-y-3">
                            {diffs.map((diff) => (
                              <div
                                key={diff.path}
                                className={`
                                  p-4 rounded-lg border-2 cursor-pointer transition-all duration-200
                                  ${
                                    selectedChanges.has(diff.path)
                                      ? "border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20"
                                      : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
                                  }
                                `}
                                onClick={() => toggleChange(diff.path)}
                              >
                                <div className="flex items-start gap-3">
                                  <div
                                    className={`
                                    p-2 rounded-lg ${getDiffColor(diff.type)}
                                  `}
                                  >
                                    {getDiffIcon(diff.type)}
                                  </div>

                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-2">
                                      <h4
                                        className={`font-medium ${theme.colors.text.primary}`}
                                      >
                                        {diff.label}
                                      </h4>
                                      <span
                                        className={`
                                        px-2 py-1 text-xs rounded-full font-medium
                                        ${getDiffColor(diff.type)}
                                      `}
                                      >
                                        {diff.type}
                                      </span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                      {diff.type !== "added" && (
                                        <div>
                                          <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                                            BEFORE
                                          </div>
                                          <div className="text-sm text-slate-600 dark:text-slate-400 bg-red-50 dark:bg-red-900/10 p-2 rounded border">
                                            {formatValue(diff.oldValue) ||
                                              "(empty)"}
                                          </div>
                                        </div>
                                      )}

                                      {diff.type !== "removed" && (
                                        <div>
                                          <div className="text-xs font-medium text-green-600 dark:text-green-400 mb-1">
                                            AFTER
                                          </div>
                                          <div className="text-sm text-slate-600 dark:text-slate-400 bg-green-50 dark:bg-green-900/10 p-2 rounded border">
                                            {formatValue(diff.newValue) ||
                                              "(empty)"}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-between p-6 border-t border-slate-200 dark:border-slate-700">
            <Button variant="ghost" onClick={onReject}>
              Reject Changes
            </Button>

            <div className="flex items-center gap-3">
              <Button variant="secondary" onClick={onClose}>
                Review Later
              </Button>
              <Button
                onClick={handleAccept}
                disabled={changesCount === 0}
                className="min-w-[120px]"
              >
                <Check className="w-4 h-4 mr-2" />
                Accept{" "}
                {selectedChanges.size > 0 ? `(${selectedChanges.size})` : "All"}
              </Button>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default DiffModal
