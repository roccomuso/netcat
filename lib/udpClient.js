'use strict'
const dgram = require('dgram')
const stream = require('stream')
const through2 = require('through2')
const waitTimer = require('./util').waitTimer
var pipe = stream.prototype.pipe

const hex = require('hexer')
var hexerIn = hex.Transform({ prefix: '< ' })
var hexerOut = hex.Transform({ prefix: '> ' })

/* Inspired by https://github.com/dominictarr/broadcast-stream for piping */

module.exports = function (debug) {
  var self = this

  self.client = dgram.createSocket({type: 'udp4', reuseAddr: true})

  self.client.readable = self.client.writable = true

  self.client.write = function (message, host) {
    if (typeof message === 'string') { message = Buffer.from(message, 'utf8') }
    self.client.send(message, 0, message.length, self._port || self._bind, host || self._destination)
    debug('Sending', message, 'to', host || self._destination)
    if (self._output) hexerOut.write(message) // hex Dump: outcoming
    return true
  }

  self.client.end = function () {
    debug('stream end event')
    self.client.emit('end') // close the stream
  }

  self.client._send = function (data, host) {
    self.client.write(data, host)
    // waitTime before close
    waitTimer.call(self)
  }

  var latest = null

  function message (msg, rinfo) {
    var _msg = self._encoding ? msg.toString(self._encoding) : msg
    debug('Msg from %s:%d : %s', rinfo.address, rinfo.port, _msg)
    msg = {data: _msg, rinfo: rinfo}
    // if paused, remember the latest item.
    // otherwise just drop those messages.
    if (self.client.paused) {
      latest = msg
      return
    }

    latest = null
    self.client.emit('data', _msg)
    self.emit('data', msg)
  }

  function close () {
    self.client.unref()
    debug('Client closed')
    if (self._output) { // close hex dump streams
      hexerIn.emit('end')
      hexerOut.emit('end')
      self._output.emit('end')
    }
    self.emit('close')
  }

  function error (err) {
    debug('Client error', err)
    self.emit('error', err)
  }

  self.client.pause = function () {
    self.client.paused = true
    return this
  }

  self.client.resume = function () {
    self.client.paused = false
    if (latest) {
      var msg = latest
      latest = null
      self.client.emit('data', msg)
      self.emit('data', msg)
    }
    return this
  }

  function listening () {
    debug('Listening event')
    self.emit('ready')
  }

  self.client.pipe = pipe
  if (self._bind) {
    debug('Binding UDP to', self._bind, self._address)
    self.client.bind(self._bind, self._address) // Make client listen on a port.
  }

  self.client.pipe(through2(function (chunk, enc, callback) {
    debug('Got incoming data ->', chunk)
    this.push(chunk)
    if (self._output) hexerIn.write(chunk) // hex Dump: incoming
    callback()
  }))
    .pipe(self._filter)

  /* hex Dump */
  if (self._output) {
    debug('Hex Dump started.')
    hexerIn.pipe(self._output)
    hexerOut.pipe(self._output)
  }

  process.nextTick(function () {
    self.client.on('listening', listening)
    self.client.on('message', message)
    self.client.on('close', close)
    self.client.on('error', error)
  })
}
