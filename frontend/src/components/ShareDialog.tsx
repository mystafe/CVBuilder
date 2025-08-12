import React, { useState } from "react"
import { postShareCreate, postDraftSave } from "../lib/api"
import { useCvStore } from "../store/cv"

type Props = {
  open: boolean
  onClose: () => void
  cv: any
  target: any
  extras: any
}

export default function ShareDialog({
  open,
  onClose,
  cv,
  target,
  extras
}: Props) {
  const { draftId, actions } = useCvStore((s) => ({
    draftId: s.draftId,
    actions: s.actions
  }))
  const [ttl, setTtl] = useState(14)
  const [shareUrl, setShareUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  if (!open) return null

  const create = async () => {
    try {
      setLoading(true)
      const did =
        draftId || (await postDraftSave({ cv, target, extras })).draftId
      actions.setDraftId(did)
      const res = await postShareCreate({ draftId: did, ttlDays: ttl })
      setShareUrl(res.shareUrl)
    } catch (e: any) {
      setError(e.message || "Failed to create share link")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 p-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Share Draft</div>
          <button className="text-sm" onClick={onClose}>
            ✕
          </button>
        </div>
        {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
        <div className="mb-3">
          <label className="block text-sm font-medium mb-1">TTL (days)</label>
          <select
            value={ttl}
            onChange={(e) => setTtl(Number(e.target.value))}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {[1, 7, 14, 30].map((d) => (
              <option key={d} value={d}>
                {d} days
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm"
            onClick={create}
            disabled={loading}
          >
            {loading ? "Creating..." : "Create link"}
          </button>
          {shareUrl && (
            <>
              <input
                className="flex-1 rounded-md border px-3 py-2 text-sm"
                value={shareUrl}
                readOnly
              />
              <button
                className="px-3 py-2 rounded-md border text-sm"
                onClick={() => navigator.clipboard.writeText(shareUrl)}
              >
                Copy
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
