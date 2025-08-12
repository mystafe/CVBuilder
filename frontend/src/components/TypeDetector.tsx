import React, { useEffect, useState } from "react"
import { postTypeDetect } from "../lib/api"

type Target = {
  role?: string
  seniority?: string
  sector?: string
  confidence?: number
}

type Props = {
  cv: any
  initialTarget?: Target
  onChange: (target: Target) => void
}

const SENIORITY = [
  "Intern",
  "Junior",
  "Mid",
  "Senior",
  "Lead",
  "Manager",
  "Director",
  "VP",
  "C-Level"
]

export default function TypeDetector({ cv, initialTarget, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [target, setTarget] = useState<Target>(initialTarget || {})

  useEffect(() => {
    let mounted = true
    if (
      !initialTarget ||
      (!initialTarget.role && !initialTarget.seniority && !initialTarget.sector)
    ) {
      setLoading(true)
      postTypeDetect({ cv })
        .then((res) => {
          if (!mounted) return
          setTarget(res.target || {})
          onChange(res.target || {})
        })
        .catch((e) => setError(e.message || "Failed to detect type"))
        .finally(() => setLoading(false))
    }
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const update = (patch: Partial<Target>) => {
    const next = { ...target, ...patch }
    setTarget(next)
    onChange(next)
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 py-3">
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Profile Target</h2>
          {loading && (
            <span className="text-xs text-neutral-500">Detecting...</span>
          )}
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="grid grid-cols-1 gap-3">
          <div>
            <label className="block text-sm mb-1">Role</label>
            <input
              value={target.role || ""}
              onChange={(e) => update({ role: e.target.value })}
              placeholder="e.g., Software Engineer"
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm mb-1">Seniority</label>
            <select
              value={target.seniority || ""}
              onChange={(e) => update({ seniority: e.target.value })}
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            >
              <option value="">Select...</option>
              {SENIORITY.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-1">Sector</label>
            <input
              value={target.sector || ""}
              onChange={(e) => update({ sector: e.target.value })}
              placeholder="e.g., Tech, Finance, Healthcare"
              className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
            />
          </div>
          {typeof target.confidence === "number" && (
            <div className="text-xs text-neutral-500">
              Model confidence: {(target.confidence * 100).toFixed(0)}%
            </div>
          )}
        </div>
      </div>
      <div className="h-14" />
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-white/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-end gap-3">
        <button
          className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm"
          onClick={() => setTarget(initialTarget || {})}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
          onClick={() => onChange(target)}
        >
          Save & Next
        </button>
      </div>
    </div>
  )
}
