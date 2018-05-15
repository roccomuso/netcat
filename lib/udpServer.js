'use strict'
const os = require('os')
const fs = require('fs')
const stream = require('stream')
const through2 = require('through2')
const udp = require('datagram-stream')
const waitTimer = require('./util').waitTimer

const hex = require('hexer')
var hexerIn = hex.Transform({ prefix: '< ' })
var hexerOut = hex.Transform({ prefix: '> ' })

module.exports = function (debug) {
  var self = this
  var addresses = {}

  self.server = udp({
    address: self._address,
    port: self._port,
    bindingPort: self._bind,
    reuseAddr: true,
    unicast: self._destination
  }, function (err) {
    if (err) return self.emit('error', err)
    var ifaces = os.networkInterfaces()
    for (var k in ifaces) {
      ifaces[k].forEach(function (address) {
        addresses[address.address] = true
      })
    }
    handleTraffic.call(self)
    self.emit('ready')
  })

  self.server.write = function (msg, host) {
    if (typeof msg === 'string') { msg = Buffer.from(msg, 'utf8') }

    debug('Sending', msg, 'to', host || self._destination)
    self.server.send(msg, 0, msg.length, self._port, host || self._destination)
    if (self._output) hexerOut.write(msg) // hex Dump: outcoming

    return true
  }

  self.server.end = function () { /* HACK: replace end to not close the server */
    debug('end called')
  }

  self.server.on('data', function (d) {
    var msg = self._encoding ? d.toString(self._encoding) : d
    var rinfo = d.rinfo
    delete msg.rinfo

    var addr = self.server.address()
    if (addresses[rinfo.address] && rinfo.port === addr.port) {
      if (self._loopback === false) return
      rinfo.loopback = true
    }

    // waitTime before close
    waitTimer.call(self)

    debug('Data from', rinfo.address + ':' + rinfo.port, '->', msg)
    self.emit('data', rinfo, msg)
  })

  self.server.on('close', function () {
    self.server.emit('end')
    self.server.unref()
    debug('Server closed')
    if (self._output) { // close hex dump streams
      hexerIn.emit('end')
      hexerOut.emit('end')
      self._output.emit('end')
    }
    self.emit('close')
  })

  function handleTraffic () {
    if (self._broadcast) self.server.setBroadcast(true)
    // outcoming
    if (self._serveFile) {
      debug('Serving given file', self._serveFile, 'as a stream to', self._destination)
      fs.createReadStream(self._serveFile).pipe(self.server)
    } else if (self._serveStream) {
      debug('Serving given stream over UDP to', self._destination)
      if (Buffer.isBuffer(self._serveStream)) {
        var pt = new stream.PassThrough()
        pt.end(self._serveStream)
        pt.pipe(self.server)
      } else {
        self._serveStream.pipe(self.server)
      }
    }
    // incoming
    self.server.pipe(through2(function (chunk, enc, callback) {
      debug('Got incoming data ->', chunk)
      this.push(chunk)
      if (self._output) hexerIn.write(chunk) // hex Dump: incoming
      callback()
    }))
      .pipe(self._filter) // custom filter

    /* hex Dump */
    if (self._output) {
      debug('Hex Dump started.')
      hexerIn.pipe(self._output)
      hexerOut.pipe(self._output)
    }
  }
}
