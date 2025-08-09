import React from "react"
import { motion } from "framer-motion"
import { theme } from "../theme"
import { buttonVariants, buttonSizes, cx } from "../lib/ui-helpers"

// Container Component
interface ContainerProps {
  children: React.ReactNode
  className?: string
  size?: "sm" | "md" | "lg" | "xl" | "full"
  gradient?: boolean
}

export const Container: React.FC<ContainerProps> = ({
  children,
  className = "",
  size = "lg",
  gradient = false
}) => {
  const sizeClasses = {
    sm: "max-w-3xl",
    md: "max-w-5xl",
    lg: "max-w-7xl",
    xl: "max-w-[90rem]",
    full: "max-w-full"
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: "easeOut" }}
      className={`
        mx-auto relative
        ${sizeClasses[size]} 
        ${theme.spacing.container} 
        ${gradient ? theme.colors.background.softGradient : ""} 
        ${className}
      `}
    >
      {children}
    </motion.div>
  )
}

// Card Component
interface CardProps {
  children: React.ReactNode
  className?: string
  variant?: "default" | "elevated" | "glass" | "gradient"
  padding?: "sm" | "md" | "lg" | "xl"
  hover?: boolean
  delay?: number
  role?: string
  tabIndex?: number
  "aria-label"?: string
  "aria-labelledby"?: string
  onClick?: () => void
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  variant = "default",
  padding = "md",
  hover = true,
  delay = 0,
  role,
  tabIndex,
  onClick,
  ...ariaProps
}) => {
  const paddingClasses = {
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
    xl: theme.spacing.xl
  }

  const variantClasses = {
    default: `${theme.colors.surface.card} ${theme.shadows.soft}`,
    elevated: `${theme.colors.surface.elevated} ${theme.shadows.medium}`,
    glass: `${theme.glassmorphism.light} ${theme.shadows.subtle}`,
    gradient: `${theme.colors.primary.gradient} text-white ${theme.shadows.glow}`
  }

  const isInteractive = onClick || tabIndex !== undefined

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (onClick && (event.key === "Enter" || event.key === " ")) {
      event.preventDefault()
      onClick()
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{
        duration: 0.4,
        delay: delay * 0.1,
        ease: "easeOut"
      }}
      whileHover={
        hover
          ? {
              y: -4,
              scale: 1.02,
              transition: { duration: 0.2 }
            }
          : undefined
      }
      className={`
        ${variantClasses[variant]}
        ${theme.radius.lg} 
        ${paddingClasses[padding]}
        ${theme.transitions.smooth}
        ${hover || isInteractive ? "cursor-pointer" : ""}
        ${
          isInteractive
            ? "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
            : ""
        }
        ${className}
      `}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={isInteractive ? handleKeyDown : undefined}
      {...ariaProps}
    >
      {children}
    </motion.div>
  )
}

// Button Component
interface ButtonProps {
  children: React.ReactNode
  variant?: "primary" | "ghost" | "secondary" | "danger"
  size?: "sm" | "md" | "lg"
  loading?: boolean
  className?: string
  disabled?: boolean
  onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void
  type?: "button" | "submit" | "reset"
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  disabled = false,
  onClick,
  type = "button"
}) => {
  return (
    <motion.button
      whileHover={{
        scale: disabled ? 1 : 1.02,
        y: disabled ? 0 : -2
      }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      className={cx(buttonVariants(variant), buttonSizes(size), className)}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
    >
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-inherit rounded-lg"
        >
          <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
        </motion.div>
      )}

      <motion.div
        className={cx("flex items-center", {
          "opacity-0": loading,
          "opacity-100": !loading
        })}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </motion.button>
  )
}

// Badge Component
interface BadgeProps {
  children: React.ReactNode
  variant?: "default" | "primary" | "success" | "warning" | "error" | "gradient"
  size?: "sm" | "md" | "lg"
  className?: string
  pulse?: boolean
  icon?: React.ReactNode
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  size = "md",
  className = "",
  pulse = false,
  icon
}) => {
  const baseClasses = `
    inline-flex items-center font-semibold 
    ${theme.radius.full}
    ${theme.transitions.smooth}
    backdrop-blur-sm
  `

  const variantClasses = {
    default: `
      ${theme.colors.surface.card}
      ${theme.colors.text.secondary}
      ${theme.shadows.subtle}
    `,
    primary: `
      ${theme.colors.primary[100]} 
      ${theme.colors.primary.text}
      ring-1 ring-indigo-500/20
    `,
    success: `
      bg-emerald-100/80 dark:bg-emerald-900/30 
      text-emerald-700 dark:text-emerald-300
      ring-1 ring-emerald-500/20
    `,
    warning: `
      bg-amber-100/80 dark:bg-amber-900/30 
      text-amber-700 dark:text-amber-300
      ring-1 ring-amber-500/20
    `,
    error: `
      bg-rose-100/80 dark:bg-rose-900/30 
      text-rose-700 dark:text-rose-300
      ring-1 ring-rose-500/20
    `,
    gradient: `
      bg-gradient-to-r from-purple-500/20 to-pink-500/20
      text-purple-700 dark:text-purple-300
      ring-1 ring-purple-500/20
    `
  }

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1",
    md: "px-3 py-1.5 text-sm gap-1.5",
    lg: "px-4 py-2 text-sm gap-2"
  }

  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 500, damping: 25 }}
      className={`
        ${baseClasses}
        ${variantClasses[variant]}
        ${sizeClasses[size]}
        ${pulse ? "animate-pulse" : ""}
        ${className}
      `}
    >
      {icon && (
        <motion.span
          initial={{ opacity: 0, rotate: -90 }}
          animate={{ opacity: 1, rotate: 0 }}
          transition={{ delay: 0.1 }}
          className="flex-shrink-0"
        >
          {icon}
        </motion.span>
      )}
      {children}
    </motion.span>
  )
}
