const { Document, Packer, Paragraph, HeadingLevel, TextRun, AlignmentType } = require('docx')

function sectionHeading(text) {
  return new Paragraph({ text, heading: HeadingLevel.HEADING_2, spacing: { after: 120 } })
}

function bullet(text) {
  return new Paragraph({ text, bullet: { level: 0 }, spacing: { after: 60 } })
}

async function renderDocxBuffer(cv) {
  const p = cv.personal || {}
  const children = []
  // Header
  children.push(new Paragraph({ text: p.fullName || '', heading: HeadingLevel.TITLE, spacing: { after: 60 }, alignment: AlignmentType.LEFT }))
  children.push(new Paragraph({ text: [p.email, p.phone, p.location].filter(Boolean).join(' • '), spacing: { after: 240 } }))

  // Summary
  children.push(sectionHeading('Summary'))
  children.push(new Paragraph({ text: cv.summary || '', spacing: { after: 180 } }))

  // Experience
  children.push(sectionHeading('Experience'))
  for (const e of (cv.experience || [])) {
    const titleLine = [e.title, e.company].filter(Boolean).join(' — ')
    const dateLine = [e.location, `${e.startDate || ''} — ${e.endDate || ''}`].filter(Boolean).join(' • ')
    children.push(new Paragraph({ text: titleLine, spacing: { after: 60 } }))
    if (dateLine) children.push(new Paragraph({ text: dateLine, spacing: { after: 60 } }))
    for (const b of (e.bullets || []).slice(0, 8)) children.push(bullet(b))
    children.push(new Paragraph({ text: '' }))
  }

  // Education
  children.push(sectionHeading('Education'))
  for (const ed of (cv.education || [])) {
    const line = [ed.degree, ed.field].filter(Boolean).join(' — ')
    const date = [ed.school, `${ed.startDate || ''} — ${ed.endDate || ''}`].filter(Boolean).join(' • ')
    children.push(new Paragraph({ text: line, spacing: { after: 60 } }))
    if (date) children.push(new Paragraph({ text: date, spacing: { after: 60 } }))
  }

  // Skills
  children.push(sectionHeading('Skills'))
  children.push(new Paragraph({ text: (cv.skills || []).map(s => s.name || s).filter(Boolean).join(', ') }))

  const doc = new Document({ sections: [{ properties: {}, children }] })
  const buffer = await Packer.toBuffer(doc)
  return buffer
}

module.exports = { renderDocxBuffer }


