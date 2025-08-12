import React, { useState } from 'react'
import { postDraftSave, postShareCreate } from '../lib/api.js'

export default function SaveBar({ cv, target, extras }) {
  const [draftId, setDraftId] = useState(() => {
    try { return localStorage.getItem('cvb:lastDraftId') || '' } catch { return '' }
  })
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')

  const persistDraftId = (id) => {
    try { localStorage.setItem('cvb:lastDraftId', id) } catch {}
    setDraftId(id)
  }

  const save = async () => {
    try {
      setLoading('save')
      const res = await postDraftSave({ draftId: draftId || undefined, cv, target, extras })
      persistDraftId(res.draftId)
      setLastSavedAt(res.savedAt)
      setError('')
    } catch (e) {
      setError(e.message || 'Save failed')
    } finally { setLoading('') }
  }

  const exportCvb = () => {
    const id = draftId || 'new'
    const blob = new Blob([JSON.stringify({ cv, target, extras }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `draft-${id}.cvb`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const share = async () => {
    try {
      setLoading('share')
      const did = draftId || (await postDraftSave({ cv, target, extras })).draftId
      persistDraftId(did)
      const res = await postShareCreate({ draftId: did, ttlDays: 14 })
      setShareUrl(res.shareUrl)
      setError('')
    } catch (e) {
      setError(e.message || 'Share failed')
    } finally { setLoading('') }
  }

  return (
    <div className="fixed bottom-3 right-3 z-40">
      {/* Floating FAB with menu */}
      <div className="relative">
        {/* Status bubble */}
        <div className="absolute -top-9 right-0 text-[11px] px-2 py-1 rounded-md bg-black/70 text-white shadow">
          {error ? 'Error' : (draftId ? `Draft · ${draftId.slice(0,6)}…` : 'Draft not saved')}
        </div>
        <details className="group">
          <summary className="list-none cursor-pointer select-none">
            <div className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-lg">
              <span className="text-xl leading-none">…</span>
            </div>
          </summary>
          <div className="absolute bottom-14 right-0 min-w-[220px] rounded-xl border bg-white dark:bg-neutral-900 shadow-lg p-2 space-y-2">
            {error && <div className="text-xs text-red-600 px-2">{error}</div>}
            {shareUrl && (
              <a className="block text-xs text-blue-600 underline px-2 truncate" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
            )}
            <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={save} disabled={!!loading}>
              {loading==='save' ? 'Saving…' : 'Save draft'}
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={exportCvb} disabled={!!loading}>
              Export .cvb
            </button>
            <button className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-neutral-100 dark:hover:bg-neutral-800" onClick={share} disabled={!!loading}>
              {loading==='share' ? 'Creating link…' : 'Share link'}
            </button>
          </div>
        </details>
      </div>
    </div>
  )
}


