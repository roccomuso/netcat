'use strict'
const dgram = require('dgram')
const stream = require('stream')
const through2 = require('through2')
var pipe = stream.prototype.pipe

/* Inspired by https://github.com/dominictarr/broadcast-stream for piping */

module.exports = function (debug) {
  debug('init() called')
  var self = this

  self.client = dgram.createSocket({type: 'udp4', reuseAddr: true})

  self.client.readable = self.client.writable = true

  self.client.write = function (message, host) {
    if (typeof message === 'string') { message = Buffer.from(message, 'utf8') }
    self.client.send(message, 0, message.length, self._port || self._bind, host || self._destination)
    debug('Sending', message, 'to', host || self._destination)
    return true
  }

  self.client.end = function () {
    debug('stream end event')
    self.client.emit('end') // close the stream
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

    // waitTime before close
    if (self._waitTime) {
      clearTimeout(self._timer)
      self._timer = setTimeout(function () {
        self.client.end() // close the stream
        self.client.close()
      }, self._waitTime)
    }

    latest = null
    self.client.emit('data', _msg)
    self.emit('data', msg)
  }

  function close () {
    self.client.unref()
    debug('Client closed')
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
    callback()
  })).pipe(self.passThrough)

  process.nextTick(function () {
    self.client.on('listening', listening)
    self.client.on('message', message)
    self.client.on('close', close)
    self.client.on('error', error)
  })
}
