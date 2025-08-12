import React, { useEffect, useState } from "react"
import {
  postSkillAssessmentGenerate,
  postSkillAssessmentGrade
} from "../lib/api"

type Target = { role?: string; seniority?: string; sector?: string }
type Q = { id: string; topic: string; question: string; options: string[] }

type Props = {
  cv: any
  target: Target
  sessionId: string
}

export default function SkillAssessment({ cv, target, sessionId }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [questions, setQuestions] = useState<Q[]>([])
  const [choices, setChoices] = useState<Record<string, string>>({})
  const [result, setResult] = useState<null | {
    score: { correct: number; total: number; pct: number }
    breakdown: Array<{ id: string; correct: boolean }>
  }>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    postSkillAssessmentGenerate({ cv, target }, sessionId)
      .then((res) => {
        if (!mounted) return
        setQuestions(res.questions || [])
      })
      .catch((e) => setError(e.message || "Failed to generate assessment"))
      .finally(() => setLoading(false))
    return () => {
      mounted = false
    }
  }, [cv, target, sessionId])

  const submit = async () => {
    try {
      setLoading(true)
      const answers = Object.entries(choices).map(([id, choice]) => ({
        id,
        choice
      }))
      const res = await postSkillAssessmentGrade({ sessionId, answers })
      setResult(res)
    } catch (e: any) {
      setError(e.message || "Failed to grade assessment")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 py-3">
      <div className="bg-white/70 dark:bg-neutral-900/70 backdrop-blur rounded-lg p-4 shadow-sm border border-neutral-200 dark:border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Skill Assessment</h2>
          {loading && (
            <span className="text-xs text-neutral-500">Loading...</span>
          )}
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        {result ? (
          <div className="space-y-2">
            <div className="text-sm">
              Score:{" "}
              <span className="font-semibold">
                {result.score.correct}/{result.score.total}
              </span>{" "}
              ({Math.round(result.score.pct)}%)
            </div>
            <div className="grid grid-cols-1 gap-2">
              {result.breakdown.map((b) => (
                <div
                  key={b.id}
                  className={`text-sm px-3 py-2 rounded-md border ${
                    b.correct
                      ? "border-green-300 bg-green-50 dark:bg-green-900/20"
                      : "border-red-300 bg-red-50 dark:bg-red-900/20"
                  }`}
                >
                  {b.id}: {b.correct ? "Correct" : "Incorrect"}
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {questions.map((q, idx) => (
              <div key={q.id} className="flex flex-col gap-2">
                <div className="text-sm font-medium">
                  {idx + 1}. {q.question}
                </div>
                <div className="flex flex-col gap-1">
                  {q.options.map((opt, i) => {
                    const label = String.fromCharCode(65 + i)
                    return (
                      <label
                        key={`${q.id}-${label}`}
                        className="flex items-center gap-2 text-sm"
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={label}
                          checked={choices[q.id] === label}
                          onChange={(e) =>
                            setChoices({ ...choices, [q.id]: e.target.value })
                          }
                        />
                        <span className="rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-1 text-xs font-mono">
                          {label}
                        </span>
                        <span>{opt}</span>
                      </label>
                    )
                  })}
                </div>
              </div>
            ))}
            {questions.length === 0 && !loading && (
              <div className="text-sm text-neutral-500">No questions</div>
            )}
          </div>
        )}
      </div>
      {!result && (
        <>
          <div className="h-14" />
          <div className="fixed bottom-0 inset-x-0 md:hidden bg-white/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-end gap-3">
            <button
              className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
              onClick={submit}
              disabled={loading}
            >
              Submit
            </button>
          </div>
        </>
      )}
    </div>
  )
}
