import React from "react"

type Props = {
  cv: any
  template: "modern" | "compact" | "classic"
}

export default function CvPreview({ cv, template }: Props) {
  const p = cv.personal || {}
  return (
    <div className="w-full max-w-screen-md mx-auto px-4 sm:px-6 py-3">
      <div className="rounded-2xl border shadow-sm p-4 sm:p-6 bg-white dark:bg-neutral-900">
        <div className="mb-2">
          <div className="text-xl font-semibold">{p.fullName || ''}</div>
          <div className="text-sm text-neutral-600">{[p.email, p.phone, p.location].filter(Boolean).join(' • ')}</div>
        </div>
        <div className="mt-3">
          <div className="font-medium border-b pb-1 mb-2">Summary</div>
          <div className="text-sm whitespace-pre-wrap">{cv.summary || ''}</div>
        </div>
        <div className="mt-3">
          <div className="font-medium border-b pb-1 mb-2">Experience</div>
          <div className="space-y-2">
            {(cv.experience || []).map((e: any, i: number) => (
              <div key={i}>
                <div className="text-sm font-semibold">{e.title} — {e.company}</div>
                <div className="text-xs text-neutral-600">{[e.location, `${e.startDate || ''} — ${e.endDate || ''}`].filter(Boolean).join(' • ')}</div>
                <ul className="list-disc pl-5 text-sm">
                  {(e.bullets || []).map((b: string, j: number) => <li key={j}>{b}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium border-b pb-1 mb-2">Education</div>
          <div className="space-y-2">
            {(cv.education || []).map((ed: any, i: number) => (
              <div key={i}>
                <div className="text-sm font-semibold">{[ed.degree, ed.field].filter(Boolean).join(' — ')}</div>
                <div className="text-xs text-neutral-600">{[ed.school, `${ed.startDate || ''} — ${ed.endDate || ''}`].filter(Boolean).join(' • ')}</div>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-3">
          <div className="font-medium border-b pb-1 mb-2">Skills</div>
          <div className="text-sm">{(cv.skills || []).map((s: any) => s.name || s).filter(Boolean).join(', ')}</div>
        </div>
      </div>
    </div>
  )
}


