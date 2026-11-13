'use strict'
const fs = require('node:fs')
const net = require('node:net')
const { PassThrough } = require('node:stream')
const { customAlphabet } = require('nanoid')
const { spawnProcess, waitTimer, hexDump } = require('./util')

const generateSocketId = customAlphabet('1234567890abcdefghpsxz', 7)

module.exports = function listenTcp (server, debug) {
  const tcp = net.createServer()
  server.server = tcp

  tcp.on('listening', () => {
    debug('Server listening on port', server._port, 'addr', server._address)
    server.emit('ready')
  })

  tcp.on('connection', (socket) => handleConnection(server, debug, socket))

  tcp.on('close', () => {
    tcp.unref()
    debug('Server closed')
    server._clients = {}
    server._hexDump?.end()
    server.emit('close')
  })

  tcp.on('error', (err) => {
    debug('Server error', err)
    server.emit('error', err)
  })
}

function handleConnection (server, debug, socket) {
  /* override write: hex dump and waitTime on outgoing traffic */
  const write = socket.write
  socket.write = (chunk, ...args) => {
    if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
      throw new TypeError('Invalid data, chunk must be a string or buffer, not ' + typeof chunk)
    }
    hexDump(server)?.outgoing.write(chunk)
    debug('Sending chunk:', chunk)
    waitTimer(server)
    return write.call(socket, chunk, ...args)
  }

  socket.id = generateSocketId()
  const IPandPort = socket.remoteAddress + ':' + socket.remotePort
  debug('New connection', socket.id, IPandPort)
  /* set up before 'connection' is emitted: its listeners may already
   * hit an error or call close(), which must destroy this socket too */
  server._clients[socket.id] = socket
  socket.on('error', (err) => {
    debug('Socket error:', err)
    server.emit('clientError', socket, err)
  })
  socket.setKeepAlive(!!server._keepalive)
  if (server._encoding) socket.setEncoding(server._encoding)
  server.emit('connection', socket)

  spawnProcess(server, server._filter, socket)

  /* outgoing */
  const end = !server._exec
  if (server._serveFile) {
    debug('Serving given file', server._serveFile, 'as a stream to', socket.id)
    fs.createReadStream(server._serveFile).pipe(socket, { end })
  } else if (Buffer.isBuffer(server._serveStream)) {
    debug('Serving given buffer to the client', socket.id)
    new PassThrough().end(server._serveStream).pipe(socket, { end })
  } else if (server._serveStream) {
    debug('Serving given stream to the client', socket.id)
    pipeServedStream(server, debug, socket, end)
  }

  /* incoming */
  socket.pipe(server._filter, { end: !server._keepalive })
  const dump = hexDump(server)
  if (dump) socket.pipe(dump.incoming, { end: false })

  socket.on('data', (data) => {
    debug('Got data from', IPandPort, '->', data)
    server.emit('data', socket, data)
    waitTimer(server)
  })

  socket.on('end', () => {
    debug('Connection end.')
    server.emit('end', socket)
    delete server._clients[socket.id]
    if (!server._keepalive) server.close()
  })

  socket.on('close', (hadError) => {
    debug('Connection closed', hadError ? 'because of a conn. error' : 'by client')
    delete server._clients[socket.id]
    server.emit('clientClose', socket, hadError)
  })
}

/* A served stream can be read only once: its data is cached so that clients
 * connecting later get it from the start too. Past serveCacheLimit bytes the
 * cache is dropped, to not grow forever with endless streams (e.g. stdin):
 * from then on, new clients only get the data still to come. */
function pipeServedStream (server, debug, socket, end) {
  const input = server._serveStream
  let cache = server._serveStreamCache
  if (!cache) {
    cache = server._serveStreamCache = { chunks: [], size: 0, ended: false }
    input.on('data', (chunk) => {
      if (!cache.chunks) return
      const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(String(chunk))
      cache.size += buf.length
      if (cache.size > server._serveCacheLimit) {
        debug('Served stream exceeded the cache limit, late clients will only get new data')
        cache.chunks = null
      } else {
        cache.chunks.push(buf)
      }
    })
    input.on('end', () => { cache.ended = true })
  }

  for (const chunk of cache.chunks ?? []) socket.write(chunk)

  if (!cache.ended) input.pipe(socket, { end })
  else if (end) socket.end()
}
