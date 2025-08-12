import { create } from "zustand"

type Target = { role?: string; seniority?: string; sector?: string }

type CvState = {
  cv: any
  target: Target
  extras: any
  draftId?: string
  lastSavedAt?: string
  actions: {
    setCv: (cv: any) => void
    setTarget: (t: Target) => void
    setExtras: (e: any) => void
    setDraftId: (id?: string) => void
    setLastSavedAt: (ts?: string) => void
  }
}

const initialDraftId = (() => {
  if (typeof window === "undefined") return undefined
  try {
    return localStorage.getItem("cvb:lastDraftId") || undefined
  } catch {
    return undefined
  }
})()

export const useCvStore = create<CvState>((set, get) => ({
  cv: {},
  target: {},
  extras: {},
  draftId: initialDraftId,
  lastSavedAt: undefined,
  actions: {
    setCv: (cv) => set({ cv }),
    setTarget: (t) => set({ target: t }),
    setExtras: (e) => set({ extras: e }),
    setDraftId: (id) => {
      try {
        if (id) localStorage.setItem("cvb:lastDraftId", id)
        else localStorage.removeItem("cvb:lastDraftId")
      } catch {}
      set({ draftId: id })
    },
    setLastSavedAt: (ts) => set({ lastSavedAt: ts })
  }
}))
