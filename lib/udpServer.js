'use strict'
const os = require('os')
const fs = require('fs')
const stream = require('stream')
const through2 = require('through2')
const udp = require('datagram-stream')

module.exports = function (debug) {
  var self = this
  var addresses = {}

  self.server = udp({
    address: self._address,
    port: self._port,
    bindingPort: self._bind,
    reuseAddr: true,
    unicast: self._destination
  }, function(err){
    if (err) return self.emit('error', err)
    var ifaces = os.networkInterfaces()
    for(var k in ifaces)
      ifaces[k].forEach(function (address) {
        addresses[address.address] = true
      })
    handleTraffic.call(self)
    self.emit('ready')
  })

  self.server.end = function(){ /* HACK: replace end to not close the server */
    debug('emitting end event')
    self.server.emit('end')
  }

  self.server.on('data', function(d){
    var msg = self._encoding ? d.toString(self._encoding) : d
    var rinfo = d.rinfo
    delete msg.rinfo

    var addr = self.server.address()
    if(addresses[rinfo.address] && rinfo.port === addr.port) {
      if(self._loopback === false) return
      rinfo.loopback = true
    }

    // waitTime before close
    if (self._waitTime) {
      clearTimeout(self._timer)
      self._timer = setTimeout(function () {
        self.server.end() // close the stream
        self.server.close()
      }, self._waitTime)
    }

    debug('Data from', rinfo.address + ':' + rinfo.port, '->', msg)
    self.emit('data', rinfo, msg)
  })

  self.server.on('close', function(){
    self.server.emit('end')
    self.server.unref()
    debug('Server closed')
    self.emit('srvClose')
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
    callback()
  })).pipe(self.passThrough)
}

}
