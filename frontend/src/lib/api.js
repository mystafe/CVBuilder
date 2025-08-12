function getApiBase() {
  // CRA injects REACT_APP_* at build
  if (process.env.REACT_APP_API_BASE) return process.env.REACT_APP_API_BASE
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000'
    }
    // Production: use same-origin (assumes reverse proxy or rewrites)
    return ''
  }
  return process.env.NEXT_PUBLIC_API_BASE || ''
}

const API_BASE = getApiBase()



function buildBaseCandidates() {
  const envBase = process.env.REACT_APP_API_BASE || process.env.NEXT_PUBLIC_API_BASE
  if (envBase) {
    // If an explicit base is set, DO NOT fallback to others.
    return [envBase]
  }
  // No explicit env base: prefer same-origin, then localhost dev
  const list = ['']
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      list.push('http://localhost:4000')
    }
  }
  // Deduplicate
  return Array.from(new Set(list))
}

async function tryFetchJson(method, base, path, body, headers) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(headers || {}) },
    body: body !== undefined ? JSON.stringify(body ?? {}) : undefined
  })
  const text = await res.text()
  let json = {}
  try { json = text ? JSON.parse(text) : {} } catch { json = { error: "invalid_json", raw: text } }
  return { ok: res.ok, status: res.status, json }
}

async function postJson(path, body, headers) {
  const bases = buildBaseCandidates()
  let lastErr = null
  for (const base of bases) {
    try {
      const { ok, status, json } = await tryFetchJson('POST', base, path, body, headers)
      if (ok) return json
      // Retry on 404/route issues
      const err = (json && (json.error || json.message)) || `http_${status}`
      if (status === 404 || String(err).toLowerCase().includes('route not found')) {
        lastErr = `Route not found @ ${base}${path}`
        continue
      }
      lastErr = typeof err === 'string' ? err : JSON.stringify(json)
    } catch (e) {
      lastErr = e.message || 'fetch_failed'
      continue
    }
  }
  throw new Error(lastErr || 'request_failed')
}

async function getJson(path) {
  const bases = buildBaseCandidates()
  let lastErr = null
  for (const base of bases) {
    try {
      const res = await fetch(`${base}${path}`)
      const text = await res.text()
      let json = {}
      try { json = text ? JSON.parse(text) : {} } catch { json = { error: 'invalid_json', raw: text } }
      if (res.ok) return json
      const err = (json && (json.error || json.message)) || `http_${res.status}`
      if (res.status === 404 || String(err).toLowerCase().includes('route not found')) {
        lastErr = `Route not found @ ${base}${path}`
        continue
      }
      lastErr = typeof err === 'string' ? err : JSON.stringify(json)
    } catch (e) {
      lastErr = e.message || 'fetch_failed'
      continue
    }
  }
  throw new Error(lastErr || 'request_failed')
}

export function apiParse(input) { return postJson("/api/parse", input) }

export function apiTypeDetect(input) { return postJson("/api/type-detect", input) }

export function apiFollowups(input) { return postJson("/api/followups", input) }

export const postParse = apiParse
export const postTypeDetect = apiTypeDetect

export function postSectorQuestions(input) { return postJson("/api/sector-questions", input) }

export function postSkillAssessmentGenerate(input, sessionId) {
  const headers = {}
  if (sessionId) headers["X-Session-Id"] = sessionId
  return postJson('/api/skill-assessment/generate', input, headers)
}

export function postSkillAssessmentGrade(input) { return postJson("/api/skill-assessment/grade", input) }

export function postPolish(input) { return postJson("/api/polish", input) }
export function postAtsKeywords(input) { return postJson("/api/ats/keywords", input) }
export function postRenderPdf(input) { return postJson("/api/render/pdf", input) }
export function postRenderDocx(input) { return postJson("/api/render/docx", input) }
export function postCoverLetter(input) { return postJson("/api/cover-letter", input) }

export function postDraftSave(input) { return postJson('/api/drafts/save', input) }
export function getDraft(draftId) { return getJson(`/api/drafts/${draftId}`) }
export function postShareCreate(input) { return postJson('/api/share/create', input) }
export function postAnalytics(input) { return postJson('/api/analytics/event', input) }


