const fs = require('fs')
const path = require('path')

async function readJsonSafe(file) {
  try {
    const data = await fs.promises.readFile(file, 'utf8')
    return JSON.parse(data)
  } catch (e) {
    if (e.code === 'ENOENT') return null
    throw e
  }
}

async function writeJsonAtomic(file, obj) {
  const dir = path.dirname(file)
  await fs.promises.mkdir(dir, { recursive: true })
  const tmp = `${file}.tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`
  const data = JSON.stringify(obj, null, 2)
  await fs.promises.writeFile(tmp, data, 'utf8')
  await fs.promises.rename(tmp, file)
  return { size: Buffer.byteLength(data, 'utf8') }
}

async function listJson(dir) {
  try {
    const names = await fs.promises.readdir(dir)
    return names.filter(n => n.endsWith('.json')).map(n => path.join(dir, n))
  } catch (e) {
    if (e.code === 'ENOENT') return []
    throw e
  }
}

module.exports = { readJsonSafe, writeJsonAtomic, listJson }


