export const theme = {
  colors: {
    background: {
      primary: "bg-white dark:bg-slate-950",
      secondary: "bg-slate-50/30 dark:bg-slate-900/30",
      tertiary: "bg-slate-100/30 dark:bg-slate-800/30",
      gradient:
        "bg-gradient-to-br from-slate-50/40 via-white/60 to-indigo-50/15 dark:from-slate-950/70 dark:via-slate-900/50 dark:to-indigo-950/15",
      softGradient:
        "bg-gradient-to-b from-transparent via-slate-50/10 to-transparent dark:from-transparent dark:via-slate-900/15 dark:to-transparent",
      radialGradient:
        "bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/20 via-transparent to-transparent dark:from-indigo-950/15 dark:via-transparent dark:to-transparent"
    },
    surface: {
      primary: "bg-white/70 dark:bg-slate-900/70 backdrop-blur-xl",
      elevated: "bg-white/80 dark:bg-slate-800/80 backdrop-blur-xl",
      overlay: "bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl",
      card: "bg-white/40 dark:bg-slate-900/40 backdrop-blur-lg border border-slate-200/30 dark:border-slate-700/30",
      glass:
        "bg-white/20 dark:bg-slate-900/20 backdrop-blur-md border border-white/20 dark:border-slate-700/20"
    },
    primary: {
      50: "bg-indigo-50 dark:bg-indigo-950/50",
      100: "bg-indigo-100 dark:bg-indigo-900/50",
      500: "bg-indigo-500",
      600: "bg-indigo-600",
      700: "bg-indigo-700",
      text: "text-indigo-600 dark:text-indigo-400",
      textHover: "hover:text-indigo-700 dark:hover:text-indigo-300",
      gradient: "bg-gradient-to-r from-indigo-600 to-purple-600",
      gradientHover: "hover:from-indigo-700 hover:to-purple-700"
    },
    accent: {
      purple: "text-purple-600 dark:text-purple-400",
      emerald: "text-emerald-600 dark:text-emerald-400",
      amber: "text-amber-600 dark:text-amber-400",
      rose: "text-rose-600 dark:text-rose-400"
    },
    text: {
      primary: "text-slate-900 dark:text-slate-100",
      secondary: "text-slate-700 dark:text-slate-300",
      tertiary: "text-slate-500 dark:text-slate-400",
      inverse: "text-white dark:text-slate-900",
      muted: "text-slate-400 dark:text-slate-500"
    },
    subtle: {
      border: "border-slate-200/60 dark:border-slate-700/60",
      divider: "border-slate-100/60 dark:border-slate-800/60",
      hover: "hover:bg-slate-50/50 dark:hover:bg-slate-800/50",
      ring: "ring-slate-200/50 dark:ring-slate-700/50"
    }
  },
  spacing: {
    xs: "p-3",
    sm: "p-4",
    md: "p-6",
    lg: "p-8",
    xl: "p-12",
    "2xl": "p-16",
    container: "px-4 sm:px-6 lg:px-8 xl:px-12",
    section: "py-12 md:py-16 lg:py-24",
    gap: {
      xs: "gap-2",
      sm: "gap-4",
      md: "gap-6",
      lg: "gap-8",
      xl: "gap-12"
    }
  },
  radius: {
    none: "rounded-none",
    sm: "rounded-lg",
    md: "rounded-xl",
    lg: "rounded-2xl",
    xl: "rounded-3xl",
    "2xl": "rounded-[2rem]",
    full: "rounded-full"
  },
  shadows: {
    none: "shadow-none",
    subtle: "shadow-sm shadow-slate-100/50 dark:shadow-slate-900/50",
    soft: "shadow-lg shadow-slate-200/20 dark:shadow-slate-900/40",
    medium: "shadow-xl shadow-slate-200/30 dark:shadow-slate-900/50",
    large: "shadow-2xl shadow-slate-200/40 dark:shadow-slate-900/60",
    glow: "shadow-lg shadow-indigo-500/20 dark:shadow-indigo-400/20",
    glowHover: "shadow-xl shadow-indigo-500/30 dark:shadow-indigo-400/30",
    inner: "shadow-inner shadow-slate-200/50 dark:shadow-slate-800/50"
  },
  transitions: {
    fast: "transition-all duration-150 ease-out",
    default: "transition-all duration-300 ease-out",
    slow: "transition-all duration-500 ease-out",
    spring: "transition-all duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)",
    bounce:
      "transition-transform duration-200 cubic-bezier(0.68, -0.55, 0.265, 1.55)",
    smooth: "transition-all duration-400 cubic-bezier(0.25, 0.46, 0.45, 0.94)"
  },
  animations: {
    fadeIn: "animate-in fade-in duration-500",
    slideInLeft: "animate-in slide-in-from-left-4 duration-500",
    slideInRight: "animate-in slide-in-from-right-4 duration-500",
    slideInUp: "animate-in slide-in-from-bottom-4 duration-500",
    slideInDown: "animate-in slide-in-from-top-4 duration-500",
    scaleIn: "animate-in zoom-in-95 duration-300",
    pulse: "animate-pulse",
    spin: "animate-spin",
    bounce: "animate-bounce"
  },
  glassmorphism: {
    light:
      "bg-white/5 dark:bg-white/5 backdrop-blur-sm border border-white/10 dark:border-slate-700/20",
    medium:
      "bg-white/10 dark:bg-white/10 backdrop-blur-md border border-white/20 dark:border-slate-700/30",
    heavy:
      "bg-white/20 dark:bg-white/15 backdrop-blur-lg border border-white/30 dark:border-slate-700/40",
    dark: "bg-black/5 dark:bg-black/10 backdrop-blur-sm border border-black/10 dark:border-black/20",
    subtle:
      "bg-gradient-to-br from-white/5 to-slate-50/5 dark:from-slate-900/5 dark:to-slate-800/5 backdrop-blur-sm"
  },
  typography: {
    brand: {
      primary: "font-black tracking-tighter",
      gradient:
        "bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent",
      glow: "drop-shadow-lg",
      modern: "font-extrabold tracking-tight",
      elegant: "font-light tracking-wider"
    },
    heading: {
      hero: "font-black tracking-tight leading-none",
      heroDesktop:
        "font-black tracking-tight leading-none text-5xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem]",
      large: "font-bold tracking-tight",
      medium: "font-semibold tracking-tight"
    },
    body: {
      large: "font-medium leading-relaxed",
      medium: "font-normal leading-relaxed",
      small: "font-normal leading-normal"
    }
  }
} as const

export type Theme = typeof theme
