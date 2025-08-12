type Env = {
  OPENAI_API_KEY?: string
  FEATURE_AUTH?: string // "true" | "false"
  BASE_URL?: string
}

const required = (
  name: keyof Env,
  allowEither?: (keyof Env)[]
): string | undefined => {
  const value = process.env[name as string]
  if (value && value.trim() !== "") return value
  if (allowEither && allowEither.some((alt) => process.env[alt as string]))
    return undefined
  throw new Error(`Missing required env: ${String(name)}`)
}

export const env = {
  OPENAI_API_KEY: required("OPENAI_API_KEY"),
  FEATURE_AUTH: process.env.FEATURE_AUTH ?? "false",
  BASE_URL: process.env.BASE_URL ?? ""
} as const

export type LoadedEnv = typeof env
