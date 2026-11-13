'use strict'
const dgram = require('node:dgram')
const { Stream } = require('node:stream')
const { waitTimer, hexDump } = require('./util')

/* The dgram socket is turned into a (legacy) stream so that it can be piped.
 * Inspired by https://github.com/dominictarr/broadcast-stream */
module.exports = function initUdp (client, debug) {
  const socket = dgram.createSocket({ type: 'udp4', reuseAddr: true })
  client.client = socket
  socket.readable = socket.writable = true

  socket.write = (message, host) => {
    if (typeof message === 'string') message = Buffer.from(message, 'utf8')
    const dst = host || client._destination
    socket.send(message, 0, message.length, client._port || client._bind, dst)
    debug('Sending', message, 'to', dst)
    hexDump(client)?.outgoing.write(message)
    waitTimer(client)
    return true
  }

  socket.end = () => {
    debug('stream end event')
    socket.emit('end') // close the stream
  }

  socket._send = (data, host) => socket.write(data, host)

  /* stream backpressure: while paused only the latest message is kept */
  let latest = null
  socket.pause = () => {
    socket.paused = true
    return socket
  }
  socket.resume = () => {
    socket.paused = false
    if (latest) {
      const msg = latest
      latest = null
      socket.emit('data', msg)
    }
    return socket
  }
  socket.pipe = Stream.prototype.pipe

  socket.on('message', (msg, rinfo) => {
    const data = client._encoding ? msg.toString(client._encoding) : msg
    debug('Msg from %s:%d : %s', rinfo.address, rinfo.port, data)
    hexDump(client)?.incoming.write(msg)
    waitTimer(client)
    /* 'data' listeners always get the message: stream backpressure must not drop them */
    client.emit('data', { data, rinfo })
    if (socket.paused) {
      latest = data
      return
    }
    latest = null
    socket.emit('data', data)
  })

  socket.on('listening', () => {
    debug('Listening event')
    client.emit('ready')
  })

  socket.on('close', () => {
    socket.unref()
    debug('Client closed')
    client._hexDump?.end()
    client.emit('close')
  })

  socket.on('error', (err) => {
    debug('Client error', err)
    client.emit('error', err)
  })

  if (client._bind) {
    debug('Binding UDP to', client._bind, client._address)
    socket.bind(client._bind, client._address) // Make client listen on a port.
  }

  socket.pipe(client._filter)
}
