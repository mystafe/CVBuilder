const path = require('path')
const fs = require('fs')

const BASE = path.join(process.cwd(), 'data')
const DRAFTS_DIR = path.join(BASE, 'drafts')
const SHARES_DIR = path.join(BASE, 'shares')
const LOGS_DIR = path.join(BASE, 'logs')

function safeJoin(base, ...parts) {
  const p = path.join(base, ...parts)
  const resolved = path.resolve(p)
  if (!resolved.startsWith(base)) throw new Error('Path escape detected')
  return resolved
}

function ensureBase() {
  [BASE, DRAFTS_DIR, SHARES_DIR, LOGS_DIR].forEach((dir) => {
    try { fs.mkdirSync(dir, { recursive: true }) } catch { }
  })
}

module.exports = { BASE, DRAFTS_DIR, SHARES_DIR, LOGS_DIR, safeJoin, ensureBase }


