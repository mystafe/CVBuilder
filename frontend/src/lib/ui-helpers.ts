import { MotionProps } from "framer-motion"

// Motion presets - return Framer Motion props objects
export const motionPresets = {
  // Fade in animation
  fadeIn: (delay = 0): MotionProps => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: {
      duration: 0.3,
      delay,
      ease: "easeOut"
    }
  }),

  // Slide up animation
  slideUp: (delay = 0, distance = 20): MotionProps => ({
    initial: { opacity: 0, y: distance },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -distance },
    transition: {
      duration: 0.4,
      delay,
      ease: "easeOut",
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  }),

  // Slide right animation
  slideRight: (delay = 0, distance = 100): MotionProps => ({
    initial: { opacity: 0, x: -distance },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: distance },
    transition: {
      duration: 0.3,
      delay,
      ease: "easeOut"
    }
  }),

  // Scale in animation
  scaleIn: (delay = 0): MotionProps => ({
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 1.05 },
    transition: {
      duration: 0.2,
      delay,
      ease: "easeOut"
    }
  }),

  // Stagger children animation
  staggerChildren: (staggerDelay = 0.1): MotionProps => ({
    initial: "hidden",
    animate: "visible",
    exit: "hidden",
    variants: {
      hidden: { opacity: 0 },
      visible: {
        opacity: 1,
        transition: {
          staggerChildren: staggerDelay
        }
      }
    }
  }),

  // Bounce in animation
  bounceIn: (delay = 0): MotionProps => ({
    initial: { opacity: 0, scale: 0.3 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.3 },
    transition: {
      duration: 0.6,
      delay,
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  })
}

// Classnames helper - combines class strings and conditionals
export function cx(...args: (string | undefined | null | false | { [key: string]: boolean })[]): string {
  const classes: string[] = []
  
  for (const arg of args) {
    if (!arg) continue
    
    if (typeof arg === "string") {
      classes.push(arg)
    } else if (typeof arg === "object") {
      for (const [key, value] of Object.entries(arg)) {
        if (value) {
          classes.push(key)
        }
      }
    }
  }
  
  return classes.join(" ")
}

// Button variant styles
export const buttonVariants = (variant: "primary" | "ghost" | "secondary" | "danger" = "primary"): string => {
  const baseClasses = `
    inline-flex items-center justify-center font-semibold relative overflow-hidden
    rounded-lg transition-all duration-200 ease-out
    focus:outline-none focus:ring-2 focus:ring-offset-2
    disabled:opacity-40 disabled:cursor-not-allowed
    group
  `

  const variants = {
    primary: `
      bg-gradient-to-r from-blue-600 to-indigo-600
      hover:from-blue-700 hover:to-indigo-700
      text-white shadow-lg
      hover:shadow-xl hover:shadow-blue-500/25
      focus:ring-blue-500
      active:scale-[0.98]
    `,
    ghost: `
      text-gray-600 dark:text-gray-400
      hover:text-gray-900 dark:hover:text-white
      hover:bg-gray-100 dark:hover:bg-gray-800
      focus:ring-gray-500
      active:scale-[0.98]
    `,
    secondary: `
      bg-white dark:bg-gray-800
      border border-gray-300 dark:border-gray-600
      text-gray-700 dark:text-gray-300
      hover:bg-gray-50 dark:hover:bg-gray-700
      shadow-sm hover:shadow-md
      focus:ring-blue-500
      active:scale-[0.98]
    `,
    danger: `
      bg-gradient-to-r from-red-600 to-red-700
      hover:from-red-700 hover:to-red-800
      text-white shadow-lg
      hover:shadow-xl hover:shadow-red-500/25
      focus:ring-red-500
      active:scale-[0.98]
    `
  }

  return cx(baseClasses, variants[variant])
}

// Size variants for buttons
export const buttonSizes = (size: "sm" | "md" | "lg" = "md"): string => {
  const sizes = {
    sm: "px-4 py-2 text-sm gap-2",
    md: "px-6 py-3 text-sm gap-2", 
    lg: "px-8 py-4 text-base gap-3"
  }
  
  return sizes[size]
}

// Input variants
export const inputVariants = (variant: "default" | "error" | "success" = "default"): string => {
  const baseClasses = `
    w-full px-3 py-2 border rounded-md
    focus:outline-none focus:ring-2 focus:ring-offset-0
    transition-colors duration-200
    disabled:opacity-50 disabled:cursor-not-allowed
  `

  const variants = {
    default: `
      border-gray-300 dark:border-gray-600
      focus:border-blue-500 focus:ring-blue-500
      bg-white dark:bg-gray-800
      text-gray-900 dark:text-white
    `,
    error: `
      border-red-300 dark:border-red-600
      focus:border-red-500 focus:ring-red-500
      bg-red-50 dark:bg-red-900/20
      text-gray-900 dark:text-white
    `,
    success: `
      border-green-300 dark:border-green-600
      focus:border-green-500 focus:ring-green-500
      bg-green-50 dark:bg-green-900/20
      text-gray-900 dark:text-white
    `
  }

  return cx(baseClasses, variants[variant])
}

// Card variants
export const cardVariants = (variant: "default" | "elevated" | "glass" | "gradient" = "default"): string => {
  const baseClasses = "rounded-lg transition-all duration-200"

  const variants = {
    default: `
      bg-white dark:bg-gray-800
      border border-gray-200 dark:border-gray-700
      shadow-sm
    `,
    elevated: `
      bg-white dark:bg-gray-800
      shadow-lg hover:shadow-xl
      border border-gray-100 dark:border-gray-700
    `,
    glass: `
      bg-white/80 dark:bg-gray-800/80
      backdrop-blur-sm
      border border-gray-200/50 dark:border-gray-700/50
      shadow-sm
    `,
    gradient: `
      bg-gradient-to-br from-blue-50 to-indigo-50
      dark:from-blue-900/20 dark:to-indigo-900/20
      border border-blue-200/50 dark:border-blue-700/50
      shadow-sm
    `
  }

  return cx(baseClasses, variants[variant])
}

// Badge variants
export const badgeVariants = (variant: "default" | "primary" | "success" | "warning" | "error" = "default"): string => {
  const baseClasses = `
    inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
    transition-colors duration-200
  `

  const variants = {
    default: `
      bg-gray-100 dark:bg-gray-800
      text-gray-800 dark:text-gray-200
    `,
    primary: `
      bg-blue-100 dark:bg-blue-900/30
      text-blue-800 dark:text-blue-200
    `,
    success: `
      bg-green-100 dark:bg-green-900/30
      text-green-800 dark:text-green-200
    `,
    warning: `
      bg-yellow-100 dark:bg-yellow-900/30
      text-yellow-800 dark:text-yellow-200
    `,
    error: `
      bg-red-100 dark:bg-red-900/30
      text-red-800 dark:text-red-200
    `
  }

  return cx(baseClasses, variants[variant])
}

// Animation utilities
export const animations = {
  // Pulse animation for loading states
  pulse: "animate-pulse",
  
  // Spin animation for spinners
  spin: "animate-spin",
  
  // Bounce animation for notifications
  bounce: "animate-bounce",
  
  // Ping animation for indicators
  ping: "animate-ping"
}

// Layout utilities
export const layout = {
  // Flexbox utilities
  flexCenter: "flex items-center justify-center",
  flexBetween: "flex items-center justify-between",
  flexStart: "flex items-center justify-start",
  flexEnd: "flex items-center justify-end",
  flexCol: "flex flex-col",
  flexColCenter: "flex flex-col items-center justify-center",
  
  // Grid utilities
  gridCenter: "grid place-items-center",
  gridCols: (cols: number) => `grid grid-cols-${cols}`,
  
  // Spacing utilities
  stack: (space = 4) => `space-y-${space}`,
  stackX: (space = 4) => `space-x-${space}`,
  
  // Container utilities
  container: "container mx-auto px-4",
  containerSm: "max-w-sm mx-auto px-4",
  containerMd: "max-w-md mx-auto px-4",
  containerLg: "max-w-lg mx-auto px-4",
  containerXl: "max-w-xl mx-auto px-4"
}

// Typography utilities
export const typography = {
  // Headings
  h1: "text-4xl font-bold tracking-tight",
  h2: "text-3xl font-bold tracking-tight", 
  h3: "text-2xl font-semibold tracking-tight",
  h4: "text-xl font-semibold tracking-tight",
  h5: "text-lg font-semibold",
  h6: "text-base font-semibold",
  
  // Body text
  body: "text-base leading-relaxed",
  bodySmall: "text-sm leading-relaxed",
  bodyLarge: "text-lg leading-relaxed",
  
  // Utilities
  muted: "text-gray-600 dark:text-gray-400",
  subtle: "text-gray-500 dark:text-gray-500",
  emphasis: "font-medium text-gray-900 dark:text-white",
  
  // Gradients
  gradientText: "bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent"
}

// Focus utilities for accessibility
export const focus = {
  // Standard focus ring
  ring: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  
  // Focus ring variants
  ringPrimary: "focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2",
  ringDanger: "focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
  ringSuccess: "focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2",
  
  // Focus visible (keyboard only)
  visible: "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
}

export default {
  motionPresets,
  cx,
  buttonVariants,
  buttonSizes,
  inputVariants,
  cardVariants,
  badgeVariants,
  animations,
  layout,
  typography,
  focus
}
