import React, { useState } from "react"
import { postPolish, postAtsKeywords } from "../lib/api"

type Props = {
  cv: any
  target: { role?: string; seniority?: string; sector?: string }
  onCvUpdate: (cv: any) => void
}

export default function PolishPanel({ cv, target, onCvUpdate }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [jobText, setJobText] = useState("")
  const [ats, setAts] = useState<{ missing: string[]; suggested: string[]; score: number } | null>(null)
  const [notes, setNotes] = useState<string[]>([])

  const improve = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await postPolish({ cv, target })
      onCvUpdate(res.cv)
      setNotes(res.notes || [])
    } catch (e: any) {
      setError(e.message || "Failed to improve CV")
    } finally {
      setLoading(false)
    }
  }

  const analyze = async () => {
    setLoading(true)
    setError("")
    try {
      const res = await postAtsKeywords({ cv, jobText })
      setAts(res)
    } catch (e: any) {
      setError(e.message || "ATS analysis failed")
    } finally {
      setLoading(false)
    }
  }

  const addToSummary = (kw: string) => {
    const sum = (cv.summary || "") + (cv.summary ? " " : "") + kw
    onCvUpdate({ ...cv, summary: sum })
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 sm:px-6 py-3">
      <div className="rounded-2xl border shadow-sm p-4 sm:p-6 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Polish & ATS</h2>
          {loading && <span className="text-xs text-neutral-500">Working...</span>}
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}

        <div className="flex gap-2 mb-3">
          <button className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={improve}>Improve CV</button>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Job Description</label>
          <textarea
            className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm min-h-[120px]"
            value={jobText}
            onChange={(e) => setJobText(e.target.value)}
            placeholder="Paste job description here (optional)"
          />
          <div className="flex gap-2 mt-2">
            <button className="px-3 py-2 rounded-md border text-sm" onClick={analyze}>Analyze Job Description</button>
            {ats && <div className="text-sm">ATS Score: <span className="font-semibold text-blue-600">{ats.score}</span></div>}
          </div>
        </div>

        {ats && (
          <div className="mb-4">
            <div className="text-sm font-medium mb-2">Missing Keywords</div>
            <div className="flex flex-wrap gap-2">
              {ats.missing.map((kw) => (
                <button key={kw} onClick={() => addToSummary(kw)} className="px-2 py-1 rounded-full border text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800">{kw}</button>
              ))}
            </div>
            <div className="text-sm font-medium mt-3 mb-2">Suggested</div>
            <div className="flex flex-wrap gap-2">
              {ats.suggested.map((kw) => (
                <button key={kw} onClick={() => addToSummary(kw)} className="px-2 py-1 rounded-full border text-xs hover:bg-neutral-50 dark:hover:bg-neutral-800">{kw}</button>
              ))}
            </div>
          </div>
        )}

        {notes.length > 0 && (
          <div className="mb-2">
            <div className="text-sm font-medium mb-1">Notes</div>
            <ul className="list-disc pl-5 text-sm">
              {notes.map((n, i) => <li key={i}>{n}</li>)}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}


