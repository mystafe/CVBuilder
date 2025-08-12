const React = require('react')
const { renderToStream } = require('@react-pdf/renderer')
const { Document, Page, Text, View, StyleSheet } = require('@react-pdf/renderer')

function buildStyles(template) {
  const base = {
    page: { padding: 24, fontSize: 11 },
    h1: { fontSize: 18, marginBottom: 6 },
    h2: { fontSize: 12, marginTop: 10, marginBottom: 4, borderBottom: 1, paddingBottom: 2 },
    small: { fontSize: 10, color: '#555' },
    row: { marginBottom: 6 },
    bullet: { marginLeft: 10, marginBottom: 2 },
  }
  if (template === 'modern') return StyleSheet.create(base)
  if (template === 'compact') return StyleSheet.create({ ...base, page: { ...base.page, fontSize: 10, padding: 18 } })
  return StyleSheet.create(base)
}

function PdfDoc({ cv, template }) {
  const styles = buildStyles(template)
  const p = cv.personal || {}
  return React.createElement(Document, {},
    React.createElement(Page, { size: 'A4', style: styles.page },
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h1 }, p.fullName || ''),
        React.createElement(Text, { style: styles.small }, `${p.email || ''} • ${p.phone || ''} • ${p.location || ''}`)
      ),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Summary'),
        React.createElement(Text, {}, cv.summary || '')
      ),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Experience'),
        (cv.experience || []).map((e, idx) => React.createElement(View, { key: `exp-${idx}`, style: { marginBottom: 6 } },
          React.createElement(Text, { style: { fontSize: 12, fontWeight: 700 } }, `${e.title || ''} — ${e.company || ''}`),
          React.createElement(Text, { style: styles.small }, `${e.location || ''} • ${e.startDate || ''} — ${e.endDate || ''}`),
          (e.bullets || []).slice(0, 8).map((b, bi) => React.createElement(Text, { key: `b-${bi}`, style: styles.bullet }, `• ${b}`))
        ))
      ),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Education'),
        (cv.education || []).map((ed, idx) => React.createElement(View, { key: `ed-${idx}`, style: { marginBottom: 4 } },
          React.createElement(Text, {}, `${ed.degree || ''} ${ed.field ? '— ' + ed.field : ''}`),
          React.createElement(Text, { style: styles.small }, `${ed.school || ''} • ${ed.startDate || ''} — ${ed.endDate || ''}`)
        ))
      ),
      React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Skills'),
        React.createElement(Text, {}, (cv.skills || []).map(s => s.name || s).filter(Boolean).join(', '))
      ),
      (cv.projects || []).length ? React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Projects'),
        (cv.projects || []).map((pr, idx) => React.createElement(View, { key: `pr-${idx}`, style: { marginBottom: 4 } },
          React.createElement(Text, {}, pr.name || ''),
          React.createElement(Text, { style: styles.small }, (pr.tech || []).join(', ')),
          pr.summary ? React.createElement(Text, {}, pr.summary) : null
        ))
      ) : null,
      (cv.certifications || []).length ? React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Certifications'),
        React.createElement(Text, {}, (cv.certifications || []).map(c => c.name).filter(Boolean).join(', '))
      ) : null,
      (cv.languages || []).length ? React.createElement(View, { style: styles.row },
        React.createElement(Text, { style: styles.h2 }, 'Languages'),
        React.createElement(Text, {}, (cv.languages || []).map(l => `${l.name || ''}${l.level ? ' (' + l.level + ')' : ''}`).join(', '))
      ) : null,
    )
  )
}

async function renderPdfBuffer(cv, template) {
  const doc = React.createElement(PdfDoc, { cv, template })
  const stream = await renderToStream(doc)
  const chunks = []
  return new Promise((resolve, reject) => {
    stream.on('data', (d) => chunks.push(d))
    stream.on('end', () => resolve(Buffer.concat(chunks)))
    stream.on('error', reject)
  })
}

module.exports = { renderPdfBuffer }


