function getApiBase() {
  // CRA injects REACT_APP_* at build
  if (process.env.REACT_APP_API_BASE) return process.env.REACT_APP_API_BASE
  if (typeof window !== 'undefined') {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      return 'http://localhost:4000'
    }
    // Production fallback
    return 'https://cvbuilder-451v.onrender.com'
  }
  return process.env.NEXT_PUBLIC_API_BASE || ''
}

const API_BASE = getApiBase()

async function postJson(path, body) {
  try {
    const res = await fetch(`${API_BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body ?? {})
    })
    const text = await res.text()
    let json = {}
    try { json = text ? JSON.parse(text) : {} } catch { json = { error: "invalid_json", raw: text } }
    if (!res.ok) {
      const err = (json && (json.error || json.message)) || "request_failed"
      throw new Error(typeof err === "string" ? err : JSON.stringify(json))
    }
    return json
  } catch (error) {
    console.error('API call failed:', path, error)
    throw new Error(`Network error: ${error.message}`)
  }
}

export function apiParse(input) { return postJson("/api/parse", input) }

export function apiTypeDetect(input) { return postJson("/api/type-detect", input) }

export function apiFollowups(input) { return postJson("/api/followups", input) }

export const postParse = apiParse
export const postTypeDetect = apiTypeDetect

export function postSectorQuestions(input) { return postJson("/api/sector-questions", input) }

export function postSkillAssessmentGenerate(input, sessionId) {
  const headers = { "Content-Type": "application/json" }
  if (sessionId) headers["X-Session-Id"] = sessionId
  return fetch(`${API_BASE}/api/skill-assessment/generate`, { method: "POST", headers, body: JSON.stringify(input) })
    .then(async (res) => {
      const text = await res.text()
      let json = {}
      try { json = text ? JSON.parse(text) : {} } catch { json = { error: "invalid_json", raw: text } }
      if (!res.ok) throw new Error(json?.error || json?.message || "request_failed")
      return json
    })
}

export function postSkillAssessmentGrade(input) { return postJson("/api/skill-assessment/grade", input) }

export function postPolish(input) { return postJson("/api/polish", input) }
export function postAtsKeywords(input) { return postJson("/api/ats/keywords", input) }
export function postRenderPdf(input) { return postJson("/api/render/pdf", input) }
export function postRenderDocx(input) { return postJson("/api/render/docx", input) }
export function postCoverLetter(input) { return postJson("/api/cover-letter", input) }

export function postDraftSave(input) { return postJson('/api/drafts/save', input) }
export function getDraft(draftId) { return fetch(`${API_BASE}/api/drafts/${draftId}`).then((res) => res.json()) }
export function postShareCreate(input) { return postJson('/api/share/create', input) }
export function postAnalytics(input) { return postJson('/api/analytics/event', input) }


