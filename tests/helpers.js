'use strict'
const { Writable } = require('node:stream')

/* Writable collecting everything written to it: once finished, cb gets
 * a Buffer (or a string, if only strings were written). */
function concat (cb) {
  const chunks = []
  return new Writable({
    decodeStrings: false,
    write (chunk, enc, next) {
      chunks.push(chunk)
      next()
    },
    final (done) {
      cb(chunks.every((c) => typeof c === 'string') && chunks.length ? chunks.join('') : Buffer.concat(chunks.map((c) => Buffer.from(c))))
      done()
    }
  })
}

module.exports = { concat }
