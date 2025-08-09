import React, { useState, useContext, createContext, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, Settings, Palette, Type, Zap } from "lucide-react"
import { Button } from "./ui"

// Settings context
interface SettingsContextType {
  primaryColor: string
  fontScale: number
  reducedMotion: boolean
  setPrimaryColor: (color: string) => void
  setFontScale: (scale: number) => void
  setReducedMotion: (reduced: boolean) => void
  resetSettings: () => void
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
)

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext)
  if (!context) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}

// Primary color options
const PRIMARY_COLORS = [
  { name: "Blue", value: "blue", class: "bg-blue-500" },
  { name: "Indigo", value: "indigo", class: "bg-indigo-500" },
  { name: "Purple", value: "purple", class: "bg-purple-500" },
  { name: "Pink", value: "pink", class: "bg-pink-500" },
  { name: "Red", value: "red", class: "bg-red-500" },
  { name: "Orange", value: "orange", class: "bg-orange-500" },
  { name: "Yellow", value: "yellow", class: "bg-yellow-500" },
  { name: "Green", value: "green", class: "bg-green-500" },
  { name: "Emerald", value: "emerald", class: "bg-emerald-500" },
  { name: "Teal", value: "teal", class: "bg-teal-500" },
  { name: "Cyan", value: "cyan", class: "bg-cyan-500" },
  { name: "Sky", value: "sky", class: "bg-sky-500" }
]

// Font scale options
const FONT_SCALES = [
  { name: "Small", value: 0.9, percentage: "90%" },
  { name: "Normal", value: 1.0, percentage: "100%" },
  { name: "Large", value: 1.1, percentage: "110%" }
]

// Settings provider
export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [primaryColor, setPrimaryColorState] = useState("blue")
  const [fontScale, setFontScaleState] = useState(1.0)
  const [reducedMotion, setReducedMotionState] = useState(false)

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedSettings = localStorage.getItem("cvbuilder-settings")
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings)
        setPrimaryColorState(settings.primaryColor || "blue")
        setFontScaleState(settings.fontScale || 1.0)
        setReducedMotionState(settings.reducedMotion || false)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
  }, [])

  // Save settings to localStorage whenever they change
  useEffect(() => {
    const settings = {
      primaryColor,
      fontScale,
      reducedMotion
    }
    localStorage.setItem("cvbuilder-settings", JSON.stringify(settings))

    // Apply CSS custom properties to root
    const root = document.documentElement
    root.style.setProperty("--font-scale", fontScale.toString())

    // Apply reduced motion preference
    if (reducedMotion) {
      root.style.setProperty("--animation-duration", "0.01ms")
      root.style.setProperty("--transition-duration", "0.01ms")
    } else {
      root.style.removeProperty("--animation-duration")
      root.style.removeProperty("--transition-duration")
    }

    // Apply primary color CSS variables
    const colorMap: Record<string, string> = {
      blue: "#3b82f6",
      indigo: "#6366f1",
      purple: "#8b5cf6",
      pink: "#ec4899",
      red: "#ef4444",
      orange: "#f97316",
      yellow: "#eab308",
      green: "#22c55e",
      emerald: "#10b981",
      teal: "#14b8a6",
      cyan: "#06b6d4",
      sky: "#0ea5e9"
    }

    const color = colorMap[primaryColor] || colorMap.blue
    root.style.setProperty("--primary-color", color)
  }, [primaryColor, fontScale, reducedMotion])

  const setPrimaryColor = (color: string) => {
    setPrimaryColorState(color)
  }

  const setFontScale = (scale: number) => {
    setFontScaleState(scale)
  }

  const setReducedMotion = (reduced: boolean) => {
    setReducedMotionState(reduced)
  }

  const resetSettings = () => {
    setPrimaryColorState("blue")
    setFontScaleState(1.0)
    setReducedMotionState(false)
    localStorage.removeItem("cvbuilder-settings")
  }

  const value: SettingsContextType = {
    primaryColor,
    fontScale,
    reducedMotion,
    setPrimaryColor,
    setFontScale,
    setReducedMotion,
    resetSettings
  }

  return (
    <SettingsContext.Provider value={value}>
      <div
        style={{
          fontSize: `calc(1rem * ${fontScale})`,
          ...(reducedMotion &&
            ({ "--reduced-motion": "1" } as React.CSSProperties))
        }}
        className={reducedMotion ? "motion-reduce" : ""}
      >
        {children}
      </div>
    </SettingsContext.Provider>
  )
}

// Settings drawer component
interface SettingsDrawerProps {
  isOpen: boolean
  onClose: () => void
}

const SettingsDrawer: React.FC<SettingsDrawerProps> = ({ isOpen, onClose }) => {
  const settings = useSettings()

  const drawerVariants = {
    hidden: { x: "100%" },
    visible: {
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    },
    exit: {
      x: "100%",
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 30
      }
    }
  }

  const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    exit: { opacity: 0 }
  }

  // Prevent motion if reduced motion is enabled
  const shouldAnimate = !settings.reducedMotion

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 bg-black bg-opacity-50 z-40"
            variants={shouldAnimate ? backdropVariants : undefined}
            initial={shouldAnimate ? "hidden" : undefined}
            animate={shouldAnimate ? "visible" : undefined}
            exit={shouldAnimate ? "exit" : undefined}
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            className="fixed right-0 top-0 h-full w-80 bg-white dark:bg-gray-800 shadow-xl z-50 overflow-y-auto"
            variants={shouldAnimate ? drawerVariants : undefined}
            initial={shouldAnimate ? "hidden" : undefined}
            animate={shouldAnimate ? "visible" : undefined}
            exit={shouldAnimate ? "exit" : undefined}
          >
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                  <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                    Settings
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors"
                  aria-label="Close settings"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Primary Color */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Palette className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Primary Color
                    </label>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {PRIMARY_COLORS.map((color) => (
                      <button
                        key={color.value}
                        onClick={() => settings.setPrimaryColor(color.value)}
                        className={`
                          w-12 h-12 rounded-lg ${color.class} relative
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                          transition-transform hover:scale-105
                          ${
                            settings.primaryColor === color.value
                              ? "ring-2 ring-gray-400 ring-offset-2"
                              : ""
                          }
                        `}
                        title={color.name}
                        aria-label={`Select ${color.name} as primary color`}
                      >
                        {settings.primaryColor === color.value && (
                          <motion.div
                            className="absolute inset-2 bg-white bg-opacity-30 rounded"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", stiffness: 400 }}
                          />
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Font Scale */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Type className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Font Size
                    </label>
                  </div>
                  <div className="space-y-2">
                    {FONT_SCALES.map((scale) => (
                      <button
                        key={scale.value}
                        onClick={() => settings.setFontScale(scale.value)}
                        className={`
                          w-full p-3 text-left rounded-lg border transition-colors
                          focus:outline-none focus:ring-2 focus:ring-blue-500
                          ${
                            settings.fontScale === scale.value
                              ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300"
                              : "border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
                          }
                        `}
                        aria-pressed={settings.fontScale === scale.value}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{scale.name}</span>
                          <span className="text-sm text-gray-500">
                            {scale.percentage}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reduced Motion */}
                <div>
                  <div className="flex items-center space-x-2 mb-3">
                    <Zap className="h-4 w-4 text-gray-500" />
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Accessibility
                    </label>
                  </div>
                  <label className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={settings.reducedMotion}
                      onChange={(e) =>
                        settings.setReducedMotion(e.target.checked)
                      }
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">
                        Reduce Motion
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">
                        Minimize animations for better performance
                      </div>
                    </div>
                  </label>
                </div>

                {/* Reset Button */}
                <div className="pt-4 border-t border-gray-200 dark:border-gray-600">
                  <Button
                    onClick={() => {
                      settings.resetSettings()
                      // Show a brief confirmation (you could use toast here)
                    }}
                    variant="secondary"
                    className="w-full"
                  >
                    Reset to Defaults
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

// Settings button component for navigation
export const SettingsButton: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="p-2 text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        aria-label="Open settings"
        title="Settings"
      >
        <Settings className="h-5 w-5" />
      </button>

      <SettingsDrawer isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  )
}

export default SettingsDrawer
