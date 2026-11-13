'use strict'
const os = require('node:os')
const fs = require('node:fs')
const { PassThrough } = require('node:stream')
const udp = require('datagram-stream')
const { waitTimer, hexDump } = require('./util')

module.exports = function listenUdp (server, debug) {
  const localAddresses = new Set()

  const socket = udp({
    address: server._address,
    port: server._port,
    bindingPort: server._bind,
    reuseAddr: true,
    unicast: server._destination
  }, (err) => {
    if (err) return server.emit('error', err)
    for (const iface of Object.values(os.networkInterfaces())) {
      for (const { address } of iface) localAddresses.add(address)
    }
    handleTraffic()
    server.emit('ready')
  })
  server.server = socket

  socket.write = (msg, host) => {
    if (typeof msg === 'string') msg = Buffer.from(msg, 'utf8')
    const dst = host || server._destination
    debug('Sending', msg, 'to', dst)
    socket.send(msg, 0, msg.length, server._port, dst)
    hexDump(server)?.outgoing.write(msg)
    waitTimer(server)
    return true
  }

  socket.end = () => { /* replaced to not close the server when a served stream ends */
    debug('end called')
  }

  socket.on('data', (d) => {
    const { rinfo } = d
    delete d.rinfo
    const msg = server._encoding ? d.toString(server._encoding) : d
    if (localAddresses.has(rinfo.address) && rinfo.port === socket.address().port) {
      if (server._loopback === false) return
      rinfo.loopback = true
    }
    waitTimer(server)
    debug('Data from', rinfo.address + ':' + rinfo.port, '->', msg)
    hexDump(server)?.incoming.write(d)
    server.emit('data', rinfo, msg)
  })

  socket.on('close', () => {
    socket.emit('end')
    socket.unref()
    debug('Server closed')
    server._hexDump?.end()
    server.emit('close')
  })

  function handleTraffic () {
    if (server._broadcast) socket.setBroadcast(true)
    /* outgoing */
    if (server._serveFile) {
      debug('Serving given file', server._serveFile, 'as a stream to', server._destination)
      fs.createReadStream(server._serveFile).pipe(socket)
    } else if (Buffer.isBuffer(server._serveStream)) {
      debug('Serving given buffer over UDP to', server._destination)
      new PassThrough().end(server._serveStream).pipe(socket)
    } else if (server._serveStream) {
      debug('Serving given stream over UDP to', server._destination)
      server._serveStream.pipe(socket)
    }
    /* incoming */
    socket.pipe(server._filter)
  }
}
