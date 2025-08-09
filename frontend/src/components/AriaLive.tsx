import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from "react"

interface AriaLiveContextType {
  announce: (message: string, priority?: "polite" | "assertive") => void
}

const AriaLiveContext = createContext<AriaLiveContextType | undefined>(
  undefined
)

export const useAriaLive = (): AriaLiveContextType => {
  const context = useContext(AriaLiveContext)
  if (!context) {
    throw new Error("useAriaLive must be used within an AriaLiveProvider")
  }
  return context
}

// Provider component
export const AriaLiveProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [politeMessage, setPoliteMessage] = useState("")
  const [assertiveMessage, setAssertiveMessage] = useState("")

  const announce = useCallback(
    (message: string, priority: "polite" | "assertive" = "polite") => {
      if (priority === "assertive") {
        setAssertiveMessage(message)
        // Clear the message after a brief delay to allow screen readers to announce it
        setTimeout(() => setAssertiveMessage(""), 100)
      } else {
        setPoliteMessage(message)
        setTimeout(() => setPoliteMessage(""), 100)
      }
    },
    []
  )

  const value: AriaLiveContextType = {
    announce
  }

  return (
    <AriaLiveContext.Provider value={value}>
      {children}

      {/* Screen reader only live regions */}
      <div className="sr-only">
        <div
          aria-live="polite"
          aria-atomic="true"
          role="status"
          id="aria-live-polite"
        >
          {politeMessage}
        </div>

        <div
          aria-live="assertive"
          aria-atomic="true"
          role="alert"
          id="aria-live-assertive"
        >
          {assertiveMessage}
        </div>
      </div>
    </AriaLiveContext.Provider>
  )
}

// Hook for async operation announcements
export const useAsyncAnnouncer = () => {
  const { announce } = useAriaLive()

  const announceLoading = useCallback(
    (operation: string) => {
      announce(`${operation} in progress...`, "polite")
    },
    [announce]
  )

  const announceSuccess = useCallback(
    (operation: string, result?: string) => {
      const message = result
        ? `${operation} completed. ${result}`
        : `${operation} completed successfully.`
      announce(message, "polite")
    },
    [announce]
  )

  const announceError = useCallback(
    (operation: string, error?: string) => {
      const message = error
        ? `${operation} failed: ${error}`
        : `${operation} failed. Please try again.`
      announce(message, "assertive")
    },
    [announce]
  )

  return {
    announceLoading,
    announceSuccess,
    announceError,
    announce
  }
}

export default AriaLiveProvider
