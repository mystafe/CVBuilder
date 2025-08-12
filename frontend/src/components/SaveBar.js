import React, { useState } from 'react'
import { postDraftSave, postShareCreate } from '../lib/api.js'

export default function SaveBar({ cv, target, extras, compact = false }) {
  const [draftId, setDraftId] = useState(() => {
    try { return localStorage.getItem('cvb:lastDraftId') || '' } catch { return '' }
  })
  const [lastSavedAt, setLastSavedAt] = useState('')
  const [loading, setLoading] = useState('')
  const [error, setError] = useState('')
  const [shareUrl, setShareUrl] = useState('')
  const [open, setOpen] = useState(false)

  const persistDraftId = (id) => {
    try { localStorage.setItem('cvb:lastDraftId', id) } catch { }
    setDraftId(id)
  }

  const save = async () => {
    try {
      setLoading('save')
      const res = await postDraftSave({ draftId: draftId || undefined, cv: cv ?? {}, target: target ?? {}, extras: extras ?? {} })
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
      const did = draftId || (await postDraftSave({ cv: cv ?? {}, target: target ?? {}, extras: extras ?? {} })).draftId
      persistDraftId(did)
      const res = await postShareCreate({ draftId: did, ttlDays: 14 })
      // Use query param so app root can handle it later
      const finalUrl = `${window.location.origin}/?share=${res.shareId}`
      setShareUrl(finalUrl)
      setError('')
    } catch (e) {
      setError(e.message || 'Share failed')
    } finally { setLoading('') }
  }

  if (compact) {
    return (
      <div className="fab-menu-compact" style={{ position: 'relative' }}>
        <button className="fab-button-compact" onClick={() => setOpen(!open)} aria-label="More actions">💾</button>
        {open && (
          <div className="fab-sheet-compact open" style={{ right: 0, bottom: '2.5rem' }}>
            {error && <div className="fab-error">{error}</div>}
            {shareUrl && (
              <div className="fab-share">
                <input value={shareUrl} readOnly onFocus={(e) => e.target.select()} />
                <button onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</button>
              </div>
            )}
            <button className="fab-item" onClick={save} disabled={!!loading}>{loading === 'save' ? 'Saving…' : 'Save'}</button>
            <button className="fab-item" onClick={exportCvb} disabled={!!loading}>Export</button>
            <button className="fab-item" onClick={share} disabled={!!loading}>{loading === 'share' ? 'Sharing…' : 'Share'}</button>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="fab-menu">
      <div className="fab-status">
        {error ? 'Error' : (draftId ? `Draft · ${draftId.slice(0, 6)}…` : 'Draft not saved')}
      </div>
      <button className="fab-button" onClick={() => setOpen(!open)} aria-label="More actions">…</button>
      <div className={`fab-sheet ${open ? 'open' : ''}`}>
        {error && <div className="fab-error">{error}</div>}
        {shareUrl && (
          <div className="fab-share">
            <input value={shareUrl} readOnly onFocus={(e) => e.target.select()} />
            <button onClick={() => navigator.clipboard.writeText(shareUrl)}>Copy</button>
          </div>
        )}
        <button className="fab-item" onClick={save} disabled={!!loading}>{loading === 'save' ? 'Saving…' : 'Save draft'}</button>
        <button className="fab-item" onClick={exportCvb} disabled={!!loading}>Export .cvb</button>
        <button className="fab-item" onClick={share} disabled={!!loading}>{loading === 'share' ? 'Creating link…' : 'Share link'}</button>
      </div>
    </div>
  )
}


