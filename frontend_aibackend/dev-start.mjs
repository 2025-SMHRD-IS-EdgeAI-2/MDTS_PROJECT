/**
 * Vite dev server launcher that patches fs.realpathSync
 * to prevent # in path from breaking Vite's URL handling.
 */
import { createRequire } from 'module'
import { fileURLToPath } from 'url'
import path from 'path'
import fs from 'fs'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Patch realpathSync so Vite sees a # -free root
const REAL_ROOT = fs.realpathSync(__dirname)
const SAFE_ROOT = __dirname  // junction / clean path if available

const _orig = fs.realpathSync.bind(fs)
fs.realpathSync = function (p, opts) {
  const result = _orig(p, opts)
  // Replace the real (hashed) root with the invocation path
  return result.replace(REAL_ROOT, SAFE_ROOT)
}
fs.realpathSync.native = function (p, opts) {
  const result = _orig.native ? _orig.native(p, opts) : _orig(p, opts)
  return result.replace(REAL_ROOT, SAFE_ROOT)
}

// Also patch the async version
const _origAsync = fs.realpath.bind(fs)
fs.realpath = function (p, opts, cb) {
  if (typeof opts === 'function') { cb = opts; opts = {} }
  _origAsync(p, opts, (err, result) => {
    if (err) return cb(err)
    cb(null, result.replace(REAL_ROOT, SAFE_ROOT))
  })
}

// Launch Vite programmatically
const { createServer } = await import('vite')

const server = await createServer({
  root: SAFE_ROOT,
  configFile: path.join(SAFE_ROOT, 'vite.config.js'),
  server: { port: 5174 },
})

await server.listen()
server.printUrls()
