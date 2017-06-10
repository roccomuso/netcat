'use strict'
const os = require('os')
const fs = require('fs')
const dgram = require('dgram')
const stream = require('stream')
const through2 = require('through2')
var pipe = stream.prototype.pipe

/* Inspired by https://github.com/dominictarr/broadcast-stream for piping */

module.exports = function (debug) {
  var self = this

  var addresses = {}
  self.server = dgram.createSocket({type: 'udp4', reuseAddr: true})

  self.server.readable = self.server.writable = true

  self.server.write = function (message, host) {
    if (typeof message === 'string') { message = Buffer.from(message, 'utf8') }
    self.server.send(message, 0, message.length, self._port, host || self._destination)
    return true
  }

  self.server.end = function () {
    self.server.close()
  }

  var latest = null

  function message (msg, rinfo) {
    msg = self._encoding ? msg.toString(self._encoding) : msg
    debug('Msg from %s:%d : %s', rinfo.address, rinfo.port, msg)

    if (addresses[rinfo.address] && rinfo.port === self._port) {
      if (self._loopback === false) return
      rinfo.loopback = true
    }

    // if paused, remember the latest item.
    // otherwise just drop those messages.
    if (self.server.paused) {
      debug('server is paused')
      latest = {msg: msg, rinfo: rinfo}
      return
    }

    latest = null
    self.server.emit('data', msg)
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
      var rinfo = latest.rinfo
      var msg = latest.msg
      latest = null
      self.server.emit('data', msg)
      self.emit('data', rinfo, msg)
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
    if (self._broadcast) self.server.setBroadcast(true)
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
    /* incoming */
    self.emit('ready')
  }


  self.server.pipe = pipe
  self.server.bind(self._port, self._address)
  self.server.pipe(self.passThrough)

  /*
  self.server.pipe(through2(function (chunk, enc, callback) {
    debug('Got data from stream', chunk)
    this.push(chunk)
    callback()
  })).pipe(self.passThrough)
  */


  process.nextTick(function () {
    self.server.on('listening', listening)
    self.server.on('message', message)
    self.server.on('close', close)
    self.server.on('error', error)
  })
}
