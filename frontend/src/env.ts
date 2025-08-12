export type FrontendEnv = {
  REACT_APP_OPENAI_API_KEY?: string // optional on client; calls are proxied via backend typically
  REACT_APP_FEATURE_AUTH?: string // "true" | "false"
  REACT_APP_BASE_URL?: string
}

function validateEnv(): FrontendEnv {
  // Do not hard fail on frontend for secrets; backend must hold secrets securely
  const env: FrontendEnv = {
    REACT_APP_OPENAI_API_KEY: process.env.REACT_APP_OPENAI_API_KEY,
    REACT_APP_FEATURE_AUTH: process.env.REACT_APP_FEATURE_AUTH ?? "false",
    REACT_APP_BASE_URL: process.env.REACT_APP_BASE_URL
  }
  return env
}

export const env = validateEnv()
