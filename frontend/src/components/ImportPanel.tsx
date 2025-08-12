import React, { useRef, useState } from "react"
import { useCvStore } from "../store/cv"

type Props = {
  onLoad: (data: { cv?: any; target?: any; extras?: any }) => void
}

export default function ImportPanel({ onLoad }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState("")

  const handleFile = async (file: File) => {
    setError("")
    try {
      if (!file.name.endsWith(".cvb")) throw new Error("Invalid file type")
      const text = await file.text()
      const data = JSON.parse(text)
      if (typeof data !== "object") throw new Error("Invalid file content")
      onLoad({
        cv: data.cv || {},
        target: data.target || {},
        extras: data.extras || {}
      })
    } catch (e: any) {
      setError(e.message || "Import failed")
    }
  }

  return (
    <div className="w-full max-w-screen-md mx-auto px-4 sm:px-6 py-3">
      <div className="rounded-2xl border shadow-sm p-4 sm:p-6 bg-white dark:bg-neutral-900">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-base font-semibold">
            Load previous draft (.cvb)
          </h3>
          <button
            className="px-3 py-2 rounded-md border text-sm"
            onClick={() => inputRef.current?.click()}
          >
            Choose file
          </button>
        </div>
        {error && <div className="text-sm text-red-600">{error}</div>}
        <input
          ref={inputRef}
          type="file"
          accept=".cvb,application/json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>
    </div>
  )
}
