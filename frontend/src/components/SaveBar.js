import React, { useState } from 'react'
import { postDraftSave, postShareCreate } from '../lib/api'

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
    <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between gap-3 z-40">
      <div className="text-xs text-neutral-500">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : shareUrl ? (
          <a className="text-blue-600 underline" href={shareUrl} target="_blank" rel="noreferrer">{shareUrl}</a>
        ) : draftId ? (
          `Draft: ${draftId}`
        ) : (
          'Unsaved draft'
        )}
      </div>
      <div className="flex items-center gap-2">
        <button className="px-3 py-2 rounded-md border text-sm" onClick={exportCvb} disabled={!!loading}>Export .cvb</button>
        <button className="px-3 py-2 rounded-md border text-sm" onClick={share} disabled={!!loading}>{loading==='share'?'Sharing...':'Share'}</button>
        <button className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm" onClick={save} disabled={!!loading}>{loading==='save'?'Saving...':'Save draft'}</button>
      </div>
    </div>
  )
}


