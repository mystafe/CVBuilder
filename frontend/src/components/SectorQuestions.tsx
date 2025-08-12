import React, { useEffect, useState } from "react"
import { postSectorQuestions } from "../lib/api"

type Target = { role?: string; seniority?: string; sector?: string }
type Question = { id: string; question: string; key: string }

type Props = {
  cv: any
  target: Target
  onChange: (answers: Record<string, string>) => void
}

export default function SectorQuestions({ cv, target, onChange }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, string>>({})

  useEffect(() => {
    let mounted = true
    setLoading(true)
    postSectorQuestions({ cv, target })
      .then((res) => {
        if (!mounted) return
        setQuestions(res.questions || [])
      })
      .catch((e) => setError(e.message || "Failed to load questions"))
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [cv, target])

  const setAns = (id: string, value: string) => {
    const next = { ...answers, [id]: value }
    setAnswers(next)
    onChange(next)
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 py-3">
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Sector Questions</h2>
          {loading && (
            <span className="text-xs text-neutral-500">Loading...</span>
          )}
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="grid grid-cols-1 gap-4">
          {questions.map((q) => (
            <div key={q.id} className="flex flex-col gap-2">
              <label className="text-sm font-medium">{q.question}</label>
              <input
                value={answers[q.id] || ""}
                onChange={(e) => setAns(q.id, e.target.value)}
                className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm"
                placeholder="Your answer"
              />
            </div>
          ))}
          {questions.length === 0 && !loading && (
            <div className="text-sm text-neutral-500">No questions</div>
          )}
        </div>
      </div>
      <div className="h-14" />
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-white/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-end gap-3">
        <button
          className="px-4 py-2 rounded-md border border-neutral-300 dark:border-neutral-700 text-sm"
          onClick={() => setAnswers({})}
        >
          Reset
        </button>
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
          onClick={() => onChange(answers)}
        >
          Save & Next
        </button>
      </div>
    </div>
  )
}
