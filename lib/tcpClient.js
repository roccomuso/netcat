'use strict'
const util = require('./util')
const net = require('net')
const waitTimer = util.waitTimer

const noop = function () {}

module.exports = function (debug, cb) {
  debug('connect() called')
  var self = this
  cb = cb || noop

  function _send (data, cb) {
    // sending data
    self.client.write(data, cb)
    debug('Client sent data', data, 'to', self._address)
    // waitTime before close
    waitTimer.call(self)
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
    /* spawn exec */
    util.spawnProcess.call(self, self.client)
    self.emit('connect')
    cb.call(self)
  }

  // create TCP client
  this.client = net.connect(self._unixSocket || {host: this._address, port: this._port})
  this.client._send = _send
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
