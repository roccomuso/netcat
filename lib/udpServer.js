'use strict'
const os = require('os')
const fs = require('fs')
const dgram = require('dgram')
const stream = require('stream')
var pipe = stream.prototype.pipe

/* Inspired by https://github.com/dominictarr/broadcast-stream for piping */

module.exports = function (debug) {
  var self = this

  var addresses = {}
  this.server = dgram.createSocket('udp4')

  this.server.readable = this.server.writable = true

  self.server.write = function (message, host) {
    if (typeof message === 'string') { message = Buffer.from(message, 'utf8') }
    self.server.send(message, 0, message.length, self._port, host || '255.255.255.255')
    return true
  }

  var latest = null

  function message (msg, rinfo) {
    debug('Msg from %s:%d : %s', rinfo.address, rinfo.port, msg)

    if (addresses[rinfo.address] && rinfo.port === self._port) {
      if (self._loopback === false) return
      rinfo.loopback = true
    }

    // msg.port = rinfo.port
    // msg.address = rinfo.address

    // if paused, remember the latest item.
    // otherwise just drop those messages.
    if (self.server.paused) {
      latest = msg
      return
    }

    latest = null
    self.emit('data', rinfo, msg)
  }

  function close () {
    self.server.unref()
    debug('Server closed')
    self.emit('srvClose')
  }

  function error (err) {
    debug('Server error', err)
    self.emit('error', err)
  }

  self.server.pause = function () {
    self.server.paused = true
    return this
  }

  self.server.resume = function () {
    self.server.paused = false
    if (latest) {
      var msg = latest
      latest = null
      self.emit('data', msg)
    }
    return this
  }

  function listening () {
    debug('Server listening on port', self._port, 'addr', self._address)
    var ifaces = os.networkInterfaces()
    for (var k in ifaces) {
      ifaces[k].forEach(function (address) {
        addresses[address.address] = true
      })
    }
    self.server.setBroadcast(true)
    /* outcoming */
    if (self._serveFile) {
      debug('Serving given file', self._serveFile, 'as a stream')
      fs.createReadStream(self._serveFile).pipe(self.server)
    } else if (self._serveStream) {
      debug('Serving given stream over UDP')
      if (Buffer.isBuffer(self._serveStream)) {
        var pt = new stream.PassThrough()
        pt.end(self._serveStream)
        pt.pipe(self.server)
      } else {
        self._serveStream.pipe(self.server)
      }
    }
    self.emit('ready')
  }

  self.server.pipe = pipe
  self.server.pipe(this.passThrough)

  process.nextTick(function () {
    self.server.on('listening', listening)
    self.server.on('message', message)
    self.server.on('close', close)
    self.server.on('error', error)
  })
}
