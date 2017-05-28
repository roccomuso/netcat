'use strict'
const log = require('debug')
var debug = log('netcat:client')
const Netcat = require('./Netcat')
const portScan = require('./portScan')
const util = require('./util')
const net = require('net')

function noop () {}

class Client extends Netcat {
  constructor (opts) {
    opts = opts || {}
    super(opts)

    this.debug = debug
    this._address = opts.address || '127.0.0.1'
    this._interval = opts.interval || false
    this._timeout = opts.timeout || null
  }

  timeout (ms) {
    debug('setting timeout', ms, 'ms')
    this._timeout = ms
  }

  interval (secs) {
    debug('setting interval to', secs, 'seconds')
    if (!Number.isInteger(secs)) throw Error('Please provide a valid number')
    this._interval = Math.round(secs)
    return this
  }

  i (s) { /* alias for interval */
    this.interval(s)
  }

  connect (cb) {
    debug('connect() called')
    var self = this
    cb = cb || noop

    function data (d) {
      debug('got data', d)
      self.emit('data', d)
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
          self.client.connect({host: self._address, port: self._port})
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
    this.client = net.connect({host: this._address, port: this._port})

    if (this._timeout) this.client.setTimeout(this._timeout)

    process.nextTick(function () {
      if (self.listenerCount('data')) self.client.on('data', data) /* avoid default data event to not start reading a pipe */
      self.client.on('error', error)
      self.client.on('timeout', timeout)
      self.client.on('close', close)
      self.client.on('connect', connect)
    })

    return this
  }

  retry (ms) {
    if (!Number.isInteger(ms)) throw Error('Retry should be a positive integer!')
    this._retry = ms
    return this /* chainable method */
  }

  stream () {
    debug('Returning stream reference')
    return this.client /* return stream */
  }

  pipe (outStream) {
    if (this.client) {
      debug('Piping incoming data from socket to the given outStream')
      this.client.pipe(outStream, { end: !this._retry }) /* HACK: kept open when retrying */
    } else {
      debug('Client is NOT defined, please call pipe after connect()!')
    }
    return this
  }

  send (data, cb) {
    cb = cb || noop
    if (data && !Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    debug('Client sending data', data)
    var self = this
    if (!this.client) return this
    if (this._interval) { /* delay */
      setTimeout(function () {
        this.client.write(data, cb)
      }, self._interval * 1000)
    } else {
      this.client.write(data, cb)
    }
    return this
  }

  end (d) {
    if (this.client) this.client.end(d) /* send data + EOF */
    return this
  }

  close (cb) {
    debug('client: closing socket.')
    cb = cb || noop
    this.on('close', cb)
    return this.end()
  }

  scan (portsInterval, cb) {
    /* Port Scanner */
    portScan(this, portsInterval, cb)
    return this
  }
}

module.exports = Client

if (!module.parent) {
  // const fs = require('fs')
  const nc2 = new Client()
  nc2.tcp().addr('127.0.0.1').scan('22-25', function (out) {
    console.log('finish', out)
  })
}
