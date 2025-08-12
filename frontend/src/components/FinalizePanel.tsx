import React, { useState } from "react"
import { postRenderPdf, postRenderDocx, postCoverLetter } from "../lib/api"

type Props = {
  cv: any
  target: { role?: string; seniority?: string; sector?: string }
  template: "modern" | "compact" | "classic"
}

function downloadBase64(filename: string, mime: string, base64: string) {
  const blob = Uint8Array.from(atob(base64), c => c.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([blob], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export default function FinalizePanel({ cv, target, template }: Props) {
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")
  const [letter, setLetter] = useState("")
  const [jobText, setJobText] = useState("")

  const dlPdf = async () => {
    try {
      setLoading('pdf')
      const res = await postRenderPdf({ cv, template })
      downloadBase64(res.filename, res.mime, res.base64)
    } catch (e: any) {
      setError(e.message || 'PDF failed')
    } finally { setLoading('') }
  }
  const dlDocx = async () => {
    try {
      setLoading('docx')
      const res = await postRenderDocx({ cv, template })
      downloadBase64(res.filename, res.mime, res.base64)
    } catch (e: any) {
      setError(e.message || 'DOCX failed')
    } finally { setLoading('') }
  }
  const genLetter = async () => {
    try {
      setLoading('letter')
      const res = await postCoverLetter({ cv, target, jobText })
      setLetter(res.letter)
    } catch (e: any) {
      setError(e.message || 'Letter failed')
    } finally { setLoading('') }
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 sm:px-6 py-3">
      <div className="rounded-2xl border shadow-sm p-4 sm:p-6 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-semibold">Finalize</h2>
          {loading && <span className="text-xs text-neutral-500">{loading}...</span>}
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button className="px-3 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={dlPdf} disabled={!!loading}>Download PDF</button>
          <button className="px-3 py-2 rounded-md border text-sm" onClick={dlDocx} disabled={!!loading}>Download DOCX</button>
          <button className="px-3 py-2 rounded-md border text-sm" onClick={genLetter} disabled={!!loading}>Generate Cover Letter</button>
        </div>
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">Job Description (optional)</label>
          <textarea value={jobText} onChange={(e) => setJobText(e.target.value)} className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm min-h-[80px]" />
        </div>
        <div className="mb-2">
          <label className="block text-sm font-medium mb-1">Cover Letter</label>
          <textarea value={letter} onChange={(e) => setLetter(e.target.value)} className="w-full rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-sm min-h-[160px]" />
          <div className="flex gap-2 mt-2">
            <button className="px-2 py-1 rounded-md border text-xs" onClick={() => navigator.clipboard.writeText(letter)}>Copy</button>
          </div>
        </div>
      </div>
      <div className="h-16" />
      <div className="fixed bottom-0 inset-x-0 md:hidden bg-white/90 dark:bg-neutral-900/90 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-end gap-3">
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={dlPdf} disabled={!!loading}>Download PDF</button>
      </div>
    </div>
  )
}


