import React from "react"
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
  Link
} from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileText, Sparkles } from "lucide-react"
import { Container, Button } from "./components/ui"
import { ProgressBar } from "./components/ProgressBar"
import { theme } from "./theme"
import ErrorBoundary from "./components/ErrorBoundary"
import { ToastProvider } from "./components/Toast"
import { AriaLiveProvider } from "./components/AriaLive"
import { SettingsProvider, SettingsButton } from "./components/SettingsDrawer"
import ResetAllButton from "./components/ResetAllButton"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { motionPresets } from "./lib/ui-helpers"

// Create a client for React Query
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 2,
      staleTime: 5 * 60 * 1000 // 5 minutes
    }
  }
})

// Page Components with modern design
const HomePage: React.FC = () => (
  <motion.div
    {...motionPresets.fadeIn(0.2)}
    className={`min-h-screen relative ${theme.colors.background.primary} ${theme.spacing.section}`}
  >
    <Container className="text-center relative">
      {/* Soft gradient background overlay */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 1.5 }}
        className={`absolute inset-0 -mx-4 ${theme.colors.background.softGradient} pointer-events-none`}
      />

      {/* Radial gradient at top */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.4, duration: 2 }}
        className={`absolute top-0 left-1/2 transform -translate-x-1/2 w-full h-96 ${theme.colors.background.radialGradient} pointer-events-none`}
      />

      {/* Background decorative elements - more subtle */}
      <motion.div
        initial={{ opacity: 0, scale: 0 }}
        animate={{ opacity: 0.05, scale: 1 }}
        transition={{ delay: 0.6, duration: 2 }}
        className="absolute inset-0 overflow-hidden pointer-events-none"
      >
        <div className="absolute top-1/3 left-1/5 w-48 h-48 bg-indigo-500/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 right-1/5 w-64 h-64 bg-purple-500/5 rounded-full blur-3xl" />
        <div className="absolute top-2/3 left-1/2 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl" />
      </motion.div>

      <motion.div {...motionPresets.slideUp(0.2, 40)} className="relative z-10">
        {/* Hero icon with gradient */}
        <motion.div
          initial={{ scale: 0, rotate: -180 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{
            delay: 0.4,
            type: "spring",
            stiffness: 200,
            damping: 15
          }}
          className="relative mb-8"
        >
          <div
            className={`inline-flex p-4 ${theme.radius.xl} ${theme.colors.primary.gradient} ${theme.shadows.glow} mb-6`}
          >
            <Sparkles className="w-12 h-12 text-white" />
          </div>
        </motion.div>

        {/* Main heading with gradient text */}
        <motion.h1
          {...motionPresets.slideUp(0.6, 30)}
          className={`text-5xl md:text-7xl lg:text-8xl xl:text-9xl 2xl:text-[10rem] mb-6 ${theme.typography.brand.primary} ${theme.typography.brand.gradient} ${theme.typography.brand.glow}`}
          style={{
            fontFamily:
              "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
            letterSpacing: "-0.05em"
          }}
        >
          <span className="inline-block">CV</span>
          <span className="inline-block mx-1 text-indigo-500">•</span>
          <span className="inline-block">Builder</span>
          <motion.span
            className="inline-block ml-3 text-transparent bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text"
            animate={{
              backgroundPosition: ["0% 50%", "100% 50%", "0% 50%"]
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "linear"
            }}
          >
            AI
          </motion.span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          {...motionPresets.slideUp(0.8, 30)}
          className={`text-xl md:text-2xl lg:text-3xl xl:text-4xl mb-12 max-w-5xl mx-auto leading-relaxed ${theme.colors.text.secondary}`}
        >
          Create professional resumes with the power of AI. Upload your existing
          CV or start fresh - we'll help you build something{" "}
          <span className="font-semibold text-indigo-600">amazing</span>.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          {...motionPresets.slideUp(1.0, 40)}
          className="flex flex-col sm:flex-row gap-6 justify-center items-center"
        >
          <Link to="/wizard?upload=true">
            <Button
              size="lg"
              className="w-full sm:w-auto text-lg lg:text-xl xl:text-2xl px-8 py-4 lg:px-10 lg:py-6"
            >
              <Upload className="w-6 h-6 lg:w-8 lg:h-8 mr-3" />
              Upload Existing CV
            </Button>
          </Link>
          <Link to="/wizard">
            <Button
              variant="secondary"
              size="lg"
              className="w-full sm:w-auto text-lg lg:text-xl xl:text-2xl px-8 py-4 lg:px-10 lg:py-6"
            >
              <FileText className="w-6 h-6 lg:w-8 lg:h-8 mr-3" />
              Start From Scratch
            </Button>
          </Link>
        </motion.div>

        {/* Features preview */}
        <motion.div
          {...motionPresets.slideUp(1.2, 60)}
          className="mt-20 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto"
        >
          {[
            {
              icon: "🤖",
              title: "AI-Powered",
              desc: "Smart suggestions and improvements"
            },
            {
              icon: "⚡",
              title: "Lightning Fast",
              desc: "Create professional CVs in minutes"
            },
            {
              icon: "🎨",
              title: "Beautiful Templates",
              desc: "Modern, ATS-friendly designs"
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              {...motionPresets.slideUp(1.4 + i * 0.1, 30)}
              className={`${theme.colors.surface.card} ${theme.radius.lg} ${theme.spacing.lg} text-center group hover:scale-105 ${theme.transitions.smooth}`}
            >
              <div className="text-4xl mb-4">{feature.icon}</div>
              <h3
                className={`text-lg font-semibold mb-2 ${theme.colors.text.primary}`}
              >
                {feature.title}
              </h3>
              <p className={`text-sm ${theme.colors.text.secondary}`}>
                {feature.desc}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </Container>
  </motion.div>
)

const WizardPage: React.FC = () => (
  <motion.div
    {...motionPresets.slideRight(0, 100)}
    className={`${theme.spacing.section}`}
  >
    <Container>
      <div className="text-center mb-8">
        <h1 className={`text-3xl font-bold mb-4 ${theme.colors.text.primary}`}>
          CV Builder Wizard
        </h1>
        <p className={`${theme.colors.text.secondary}`}>
          Let's build your perfect resume step by step
        </p>
      </div>

      {/* Placeholder content */}
      <div
        className={`${theme.colors.surface.primary} ${theme.radius.lg} p-8 text-center`}
      >
        <FileText className="w-24 h-24 mx-auto mb-4 text-gray-400" />
        <p className={`text-lg ${theme.colors.text.secondary}`}>
          Wizard steps will be implemented here
        </p>
      </div>
    </Container>
  </motion.div>
)

const PreviewPage: React.FC = () => (
  <motion.div
    {...motionPresets.scaleIn(0)}
    className={`${theme.spacing.section}`}
  >
    <Container>
      <div className="text-center mb-8">
        <h1 className={`text-3xl font-bold mb-4 ${theme.colors.text.primary}`}>
          CV Preview
        </h1>
        <p className={`${theme.colors.text.secondary}`}>
          Review and download your generated resume
        </p>
      </div>

      {/* Placeholder content */}
      <div
        className={`${theme.colors.surface.primary} ${theme.radius.lg} p-8 text-center`}
      >
        <FileText className="w-24 h-24 mx-auto mb-4 text-gray-400" />
        <p className={`text-lg ${theme.colors.text.secondary}`}>
          CV preview will be shown here
        </p>
      </div>
    </Container>
  </motion.div>
)

// Navigation Component
const Navigation: React.FC = () => {
  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={{ y: 0 }}
      transition={{ type: "spring", stiffness: 200, damping: 20 }}
      className={`
        sticky top-0 z-50 
        ${theme.colors.surface.overlay} 
        ${theme.colors.subtle.border} 
        border-b 
        backdrop-blur-md
      `}
    >
      <Container>
        <div className="flex items-center justify-between py-4">
          {/* Logo/Brand */}
          <Link to="/">
            <motion.div
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="flex items-center space-x-2"
            >
              <motion.div
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
                className={`p-2 ${theme.radius.lg} ${theme.colors.primary.gradient}`}
              >
                <Sparkles className="w-6 h-6 text-white" />
              </motion.div>
              <span
                className={`text-xl lg:text-2xl xl:text-3xl ${theme.typography.brand.modern} ${theme.typography.brand.gradient}`}
                style={{
                  fontFamily:
                    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
                  letterSpacing: "-0.02em"
                }}
              >
                CV<span className="text-indigo-500 mx-0.5">•</span>Builder
                <span className="text-purple-600 ml-1">AI</span>
              </span>
            </motion.div>
          </Link>

          {/* Navigation Actions */}
          <div className="flex items-center space-x-3">
            <ResetAllButton className="hidden md:flex" />
            <SettingsButton />
            <Link to="/wizard?upload=true" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                <Upload className="w-4 h-4 mr-2" />
                Upload
              </Button>
            </Link>
            <Link to="/wizard">
              <Button size="sm">
                <FileText className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Start Without Upload</span>
                <span className="sm:hidden">Start</span>
              </Button>
            </Link>
          </div>
        </div>
      </Container>
    </motion.nav>
  )
}

// Progress Bar Container
const ProgressContainer: React.FC = () => {
  const location = useLocation()

  // Determine current step based on route
  const getCurrentStep = () => {
    if (location.pathname === "/") return 0
    if (location.pathname === "/wizard") return 2
    if (location.pathname === "/preview") return 5
    return 0
  }

  // Only show progress bar on wizard and preview pages
  const showProgress = ["/wizard", "/preview"].includes(location.pathname)

  if (!showProgress) return null

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
      className={`${theme.colors.background.secondary} ${theme.colors.subtle.border} border-b`}
    >
      <Container className="py-4">
        <ProgressBar
          step={getCurrentStep()}
          totalSteps={5}
          steps={["Start", "Upload", "Process", "Customize", "Complete"]}
        />
      </Container>
    </motion.div>
  )
}

// Page Transition Wrapper
const PageTransition: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  return (
    <motion.div
      className="min-h-screen flex flex-col"
      {...motionPresets.fadeIn(0)}
    >
      {children}
    </motion.div>
  )
}

// Main App Component
const AppContent: React.FC = () => {
  const location = useLocation()

  return (
    <PageTransition>
      <Navigation />
      <ProgressContainer />

      {/* Main Content with Mobile-First Layout */}
      <main className={`flex-1 ${theme.colors.background.primary}`}>
        <AnimatePresence mode="wait" initial={false}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<HomePage />} />
            <Route path="/wizard" element={<WizardPage />} />
            <Route path="/preview" element={<PreviewPage />} />
          </Routes>
        </AnimatePresence>
      </main>

      {/* Footer */}
      <motion.footer
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className={`
          ${theme.colors.background.secondary} 
          ${theme.colors.subtle.border} 
          border-t 
          py-6
        `}
      >
        <Container>
          <div className="text-center md:flex md:items-center md:justify-between">
            <p className={`text-sm ${theme.colors.text.tertiary}`}>
              © 2024 CVBuilder AI. Built with ❤️ and AI.
            </p>
            <div className="mt-4 md:mt-0 flex justify-center space-x-6">
              <button
                className={`text-sm ${theme.colors.text.tertiary} ${theme.colors.primary.textHover} hover:underline`}
              >
                Privacy
              </button>
              <button
                className={`text-sm ${theme.colors.text.tertiary} ${theme.colors.primary.textHover} hover:underline`}
              >
                Terms
              </button>
              <button
                className={`text-sm ${theme.colors.text.tertiary} ${theme.colors.primary.textHover} hover:underline`}
              >
                Support
              </button>
            </div>
          </div>
        </Container>
      </motion.footer>
    </PageTransition>
  )
}

const App: React.FC = () => {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SettingsProvider>
          <ToastProvider>
            <AriaLiveProvider>
              <Router>
                <AppContent />
              </Router>
            </AriaLiveProvider>
          </ToastProvider>
        </SettingsProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

export default App
