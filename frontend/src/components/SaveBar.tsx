import React, { useState } from "react"
import { postDraftSave, postShareCreate } from "../lib/api"
import { useCvStore } from "../store/cv"

type Props = {
  cv: any
  target: any
  extras: any
}

export default function SaveBar({ cv, target, extras }: Props) {
  const { draftId, actions } = useCvStore((s) => ({
    draftId: s.draftId,
    actions: s.actions
  }))
  const [loading, setLoading] = useState("")
  const [error, setError] = useState("")
  const [shareUrl, setShareUrl] = useState("")

  const save = async () => {
    try {
      setLoading("save")
      const res = await postDraftSave({ draftId, cv, target, extras })
      actions.setDraftId(res.draftId)
      actions.setLastSavedAt(res.savedAt)
    } catch (e: any) {
      setError(e.message || "Save failed")
    } finally {
      setLoading("")
    }
  }

  const exportCvb = () => {
    const id = draftId || "new"
    const blob = new Blob([JSON.stringify({ cv, target, extras }, null, 2)], {
      type: "application/json"
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `draft-${id}.cvb`
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  }

  const share = async () => {
    try {
      setLoading("share")
      // default TTL 14
      const did =
        draftId || (await postDraftSave({ cv, target, extras })).draftId
      const res = await postShareCreate({ draftId: did, ttlDays: 14 })
      setShareUrl(res.shareUrl)
    } catch (e: any) {
      setError(e.message || "Share failed")
    } finally {
      setLoading("")
    }
  }

  return (
    <div className="fixed bottom-0 inset-x-0 bg-white/95 dark:bg-neutral-900/95 border-t border-neutral-200 dark:border-neutral-800 px-4 py-3 flex items-center justify-between gap-3 z-40">
      <div className="text-xs text-neutral-500">
        {error ? (
          <span className="text-red-600">{error}</span>
        ) : shareUrl ? (
          <a
            className="text-blue-600 underline"
            href={shareUrl}
            target="_blank"
            rel="noreferrer"
          >
            {shareUrl}
          </a>
        ) : draftId ? (
          `Draft: ${draftId}`
        ) : (
          "Unsaved draft"
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          className="px-3 py-2 rounded-md border text-sm"
          onClick={exportCvb}
          disabled={!!loading}
        >
          Export .cvb
        </button>
        <button
          className="px-3 py-2 rounded-md border text-sm"
          onClick={share}
          disabled={!!loading}
        >
          {loading === "share" ? "Sharing..." : "Share"}
        </button>
        <button
          className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
          onClick={save}
          disabled={!!loading}
        >
          {loading === "save" ? "Saving..." : "Save draft"}
        </button>
      </div>
    </div>
  )
}
