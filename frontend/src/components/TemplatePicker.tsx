import React from "react"

type Props = {
  value: "modern" | "compact" | "classic"
  onChange: (v: "modern" | "compact" | "classic") => void
}

const cards = [
  { id: "modern" as const, title: "Modern", desc: "Clean, balanced layout" },
  { id: "compact" as const, title: "Compact", desc: "Space-efficient" },
  { id: "classic" as const, title: "Classic", desc: "Traditional styling" },
]

export default function TemplatePicker({ value, onChange }: Props) {
  return (
    <div className="w-full max-w-screen-md mx-auto px-4 sm:px-6 py-3">
      <div className="rounded-2xl border shadow-sm p-4 sm:p-6 bg-white dark:bg-neutral-900">
        <h2 className="text-lg font-semibold mb-3">Template</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {cards.map((c) => (
            <label key={c.id} className={`flex flex-col gap-2 rounded-xl border p-3 cursor-pointer ${value === c.id ? 'border-blue-500 ring-2 ring-blue-200' : ''}`}>
              <input type="radio" name="template" className="hidden" checked={value === c.id} onChange={() => onChange(c.id)} />
              <div className="text-sm font-medium">{c.title}</div>
              <div className="text-xs text-neutral-500">{c.desc}</div>
              <div className="h-24 rounded bg-neutral-100 dark:bg-neutral-800"></div>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}


