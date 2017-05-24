'use strict'
var debug = require('debug')('netcat:client')
const Netcat = require('./Netcat')
const net = require('net')

function noop () {}

class Client extends Netcat {

  constructor (opts) {
    opts = opts || {}
    super(opts)

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
      self.emit('error', err)
    }

    function timeout () {
      debug('got timeout')
      self.client.destroy()
      self.emit('timeout')
    }

    function close () {
      debug('Connection closed')
      if (self._retry) {
        setTimeout(function () {
          self.client.connect()
        }, self._retry)
      }
      self.emit('close')
    }

    // create TCP client
    this.client = net.connect({host: this._address, port: this._port}, function () {
      debug('Connected to %s:%d', self._address, self._port)
      self.client.pipe(self.passThrough)
      cb.call(self)
    })

    if (this._timeout) this.client.setTimeout(this._timeout)

    process.nextTick(function () {
      self.client.on('data', data)
      self.client.on('error', error)
      self.client.on('timeout', timeout)
      self.client.on('close', close)
    })

    return this
  }

  retry (ms) {
    this._retry = ms
  }

  stream () {
    debug('Returning stream reference')
    return this.client /* return stream */
  }

  pipe (outStream) {
    debug('Piping data from socket to the given outStream')
    this.passThrough.pipe(outStream) /* incoming */
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

}

module.exports = Client

if (!module.parent) {
  // const fs = require('fs')
  const nc2 = new Client()
  process.stdin.pipe(nc2.port(2389).connect().pipe(process.stdout).stream())
}
