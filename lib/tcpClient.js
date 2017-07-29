'use strict'
const util = require('./util')
const net = require('net')
const stream = require('stream')
const waitTimer = util.waitTimer
const hex = require('hexer')

const noop = function () {}
var hexer = hex.Transform({ prefix: '> ' }) // outcoming
var hexPipeStarted = false

module.exports = function (debug, cb) {
  debug('connect() called')
  var self = this
  cb = cb || noop

  function _send (data, cb) {
    // sending data
    self.client.write(data, cb)
  }

  function write (chunk, encoding, cb) {
    if (typeof chunk !== 'string' && !(chunk instanceof Buffer)) {
      throw new TypeError('Invalid data, chunk must be a string or buffer, not ' + typeof chunk)
    }
    /* hex Dump: outcoming */
    if (self._output) {
      if (!hexPipeStarted) {
        debug('Hex Dump started.')
        hexPipeStarted = true
        hexer.pipe(self._output)
      }
      hexer.write(chunk)
    }
    debug('Sending chunk:', chunk, 'to', self._address)
    /* waitTime before close */
    waitTimer.call(self)
    /* write to stream */
    return stream.Duplex.prototype.write.apply(this, arguments)
  }

  function data (d) {
    debug('got data', d)
    self.emit('data', d)
  }

  function end () {
    debug('end')
    self.emit('end')
  }

  function error (err) {
    debug('got error', err)
    self.emit('err', err)
  }

  function timeout () {
    debug('got timeout')
    self.client.destroy()
    self.emit('timeout')
  }

  function close () {
    debug('Connection closed')
    if (self._retry) {
      debug('Retrying connection in', (self._retry / 1000).toFixed(2), 'seconds')
      setTimeout(function () {
        self.client.connect(self._unixSocket || {host: self._address, port: self._port})
      }, self._retry)
    }
    self.emit('close')
  }

  function connect () {
    debug('Connected to %s:%d', self._address, self._port)
    /* incoming traffic filter */
    self.client.pipe(self._filter, { end: !self._retry })
    /* spawn exec */
    util.spawnProcess.call(self, self._filter, self.client)
    /* hex Dump: incoming */
    if (self._output) {
      self.client.pipe(hex.Transform({ prefix: '< ' })).pipe(self._output)
    }
    /* connected */
    self.emit('connect')
    cb.call(self)
  }

  // create TCP client
  this.client = net.connect(self._unixSocket || {host: this._address, port: this._port})
  this.client._send = _send
  this.client.write = write // override
  if (self._encoding) this.client.setEncoding(self._encoding)

  if (this._timeout) this.client.setTimeout(this._timeout)

  process.nextTick(function () {
    if (self.listenerCount('data')) self.client.on('data', data) /* avoid default data event to not start reading a pipe */
    self.client.on('end', end)
    self.client.on('error', error)
    self.client.on('timeout', timeout)
    self.client.on('close', close)
    self.client.on('connect', connect)
  })
}
