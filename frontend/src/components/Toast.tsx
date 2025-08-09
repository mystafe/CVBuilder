import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect
} from "react"
import { createPortal } from "react-dom"
import { motion, AnimatePresence } from "framer-motion"
import { CheckCircle, XCircle, AlertCircle, Info, X } from "lucide-react"

export type ToastType = "success" | "error" | "warning" | "info"

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
  duration?: number
  action?: {
    label: string
    onClick: () => void
  }
}

interface ToastContextType {
  toasts: Toast[]
  addToast: (toast: Omit<Toast, "id">) => string
  removeToast: (id: string) => void
  success: (title: string, message?: string, options?: Partial<Toast>) => string
  error: (title: string, message?: string, options?: Partial<Toast>) => string
  warning: (title: string, message?: string, options?: Partial<Toast>) => string
  info: (title: string, message?: string, options?: Partial<Toast>) => string
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider")
  }
  return context
}

// Toast component
const ToastComponent: React.FC<{
  toast: Toast
  onRemove: (id: string) => void
}> = ({ toast, onRemove }) => {
  const { id, type, title, message, action } = toast

  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info
  }

  const colors = {
    success: {
      bg: "bg-green-50 dark:bg-green-900/30",
      border: "border-green-200 dark:border-green-800",
      icon: "text-green-600 dark:text-green-400",
      text: "text-green-800 dark:text-green-200"
    },
    error: {
      bg: "bg-red-50 dark:bg-red-900/30",
      border: "border-red-200 dark:border-red-800",
      icon: "text-red-600 dark:text-red-400",
      text: "text-red-800 dark:text-red-200"
    },
    warning: {
      bg: "bg-yellow-50 dark:bg-yellow-900/30",
      border: "border-yellow-200 dark:border-yellow-800",
      icon: "text-yellow-600 dark:text-yellow-400",
      text: "text-yellow-800 dark:text-yellow-200"
    },
    info: {
      bg: "bg-blue-50 dark:bg-blue-900/30",
      border: "border-blue-200 dark:border-blue-800",
      icon: "text-blue-600 dark:text-blue-400",
      text: "text-blue-800 dark:text-blue-200"
    }
  }

  const Icon = icons[type]
  const color = colors[type]

  const handleRemove = () => onRemove(id)

  return (
    <motion.div
      initial={{ opacity: 0, y: 50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -20, scale: 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`
        max-w-sm w-full ${color.bg} ${color.border} border rounded-lg shadow-lg p-4
        pointer-events-auto
      `}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <Icon className={`h-5 w-5 ${color.icon}`} />
        </div>

        <div className="ml-3 flex-1">
          <p className={`text-sm font-medium ${color.text}`}>{title}</p>
          {message && (
            <p className={`mt-1 text-sm ${color.text} opacity-90`}>{message}</p>
          )}

          {action && (
            <div className="mt-3">
              <button
                onClick={action.onClick}
                className={`
                  text-sm font-medium ${color.text} underline hover:no-underline
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  rounded
                `}
              >
                {action.label}
              </button>
            </div>
          )}
        </div>

        <div className="ml-4 flex-shrink-0">
          <button
            onClick={handleRemove}
            className={`
              inline-flex ${color.text} opacity-60 hover:opacity-100
              focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
              rounded p-1
            `}
            aria-label="Close notification"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </motion.div>
  )
}

// Toast container
const ToastContainer: React.FC<{
  toasts: Toast[]
  onRemove: (id: string) => void
}> = ({ toasts, onRemove }) => {
  const [portalElement, setPortalElement] = useState<HTMLElement | null>(null)

  useEffect(() => {
    let element = document.getElementById("toast-portal")
    if (!element) {
      element = document.createElement("div")
      element.id = "toast-portal"
      element.className =
        "fixed inset-0 flex flex-col items-end justify-end px-4 py-6 pointer-events-none z-50 space-y-4"
      document.body.appendChild(element)
    }
    setPortalElement(element)

    return () => {
      // Don't remove the portal element on unmount as it might be used by other toasts
    }
  }, [])

  if (!portalElement) return null

  return createPortal(
    <AnimatePresence mode="popLayout">
      {toasts.map((toast) => (
        <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </AnimatePresence>,
    portalElement
  )
}

// Toast provider
export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [toasts, setToasts] = useState<Toast[]>([])

  const generateId = () =>
    `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

  const addToast = useCallback((toast: Omit<Toast, "id">): string => {
    const id = generateId()
    const newToast: Toast = {
      id,
      duration: 5000, // Default 5 seconds
      ...toast
    }

    setToasts((prev) => [...prev, newToast])

    // Auto remove after duration
    if (newToast.duration && newToast.duration > 0) {
      setTimeout(() => {
        removeToast(id)
      }, newToast.duration)
    }

    return id
  }, [])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  // Convenience methods
  const success = useCallback(
    (title: string, message?: string, options?: Partial<Toast>): string => {
      return addToast({ type: "success", title, message, ...options })
    },
    [addToast]
  )

  const error = useCallback(
    (title: string, message?: string, options?: Partial<Toast>): string => {
      return addToast({
        type: "error",
        title,
        message,
        duration: 7000,
        ...options
      }) // Longer duration for errors
    },
    [addToast]
  )

  const warning = useCallback(
    (title: string, message?: string, options?: Partial<Toast>): string => {
      return addToast({ type: "warning", title, message, ...options })
    },
    [addToast]
  )

  const info = useCallback(
    (title: string, message?: string, options?: Partial<Toast>): string => {
      return addToast({ type: "info", title, message, ...options })
    },
    [addToast]
  )

  const value: ToastContextType = {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    warning,
    info
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
