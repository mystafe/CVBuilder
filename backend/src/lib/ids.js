const crypto = require('crypto')

function toUrlSafeBase64(buffer) {
  return buffer.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function randomId(len = 22) {
  // 22 url-safe chars ~ 132 bits
  const bytes = crypto.randomBytes(Math.ceil((len * 3) / 4))
  const id = toUrlSafeBase64(bytes).slice(0, len)
  return id
}

module.exports = { randomId }


