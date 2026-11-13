'use strict'
const net = require('node:net')
const { spawnProcess, waitTimer, hexDump } = require('./util')

module.exports = function connectTcp (client, debug, cb = () => {}) {
  debug('connect() called')
  const target = () => client._unixSocket || { host: client._address, port: client._port }
  const socket = net.connect(target())
  client.client = socket

  /* override write: hex dump and waitTime also apply to data written to stream() */
  const write = socket.write
  socket.write = (chunk, ...args) => {
    if (typeof chunk !== 'string' && !(chunk instanceof Uint8Array)) {
      throw new TypeError('Invalid data, chunk must be a string or buffer, not ' + typeof chunk)
    }
    hexDump(client)?.outgoing.write(chunk)
    debug('Sending chunk:', chunk, 'to', client._address)
    waitTimer(client)
    return write.call(socket, chunk, ...args)
  }
  socket._send = (data, cb) => socket.write(data, cb)

  if (client._encoding) socket.setEncoding(client._encoding)

  socket.on('connect', () => {
    debug('Connected to %s:%d', client._address, client._port)
    socket.pipe(client._filter, { end: !client._retry }) /* incoming traffic filter */
    spawnProcess(client, client._filter, socket)
    const dump = hexDump(client)
    if (dump) socket.pipe(dump.incoming, { end: false })
    client.emit('connect')
    cb.call(client)
  })

  socket.on('data', (data) => {
    debug('got data', data)
    waitTimer(client)
    client.emit('data', data)
  })

  socket.on('end', () => {
    debug('end')
    client.emit('end')
  })

  socket.on('error', (err) => {
    debug('got error', err)
    /* when retrying, failed attempts are expected: keep retrying instead of failing */
    if (!client._retry) client.emit('error', err)
  })

  socket.on('close', () => {
    debug('Connection closed')
    socket.unpipe(client._filter)
    if (client._hexDump) socket.unpipe(client._hexDump.incoming)
    if (client._retry) {
      debug('Retrying connection in', (client._retry / 1000).toFixed(2), 'seconds')
      setTimeout(() => socket.connect(target()), client._retry)
    } else {
      client._hexDump?.end()
    }
    client.emit('close')
  })
}
