'use strict'
var debug = require('debug')('netcat:client')
const EventEmitter = require('events').EventEmitter
const net = require('net')

function noop () {}

class Client extends EventEmitter {

  constructor (opts) {
    super()
    opts = opts || {}
    debug = opts.verbose ? function () {
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this._protocol = opts.protocol || 'tcp'
    this._address = opts.address || '127.0.0.1'
    this._port = opts.port || null
    this._interval = opts.interval || false
    this._timeout = opts.timeout || null
  }

  protocol (p) {
    this._protocol = p
    debug('Protocol is', this._protocol)
    return this /* chainable method */
  }

  address (a) {
    debug('setting address', a)
    this._address = a
    return this /* chainable method */
  }

  addr (a) {
    /* address alias */
    return this.address(a)
  }

  port (p) {
    if (!Number.isInteger(p)) throw Error('Port should be a positive number!')
    this._port = p
    debug('Port set to', this._port)
    return this /* chainable method */
  }

  udp () {
    return this.protocol('udp') /* chainable method */
  }

  tcp () {
    return this.protocol('tcp') /* chainable method */
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
      self.emit('close')
    }

    // create TCP client
    this.client = net.connect({host: this._address, port: this._port}, function () {
      debug('Connected to %s:%d', self._address, self._port)
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

  stream () {
    debug('Returning stream reference')
    return this.client /* return stream */
  }

  pipe (outStream) {
    debug('Piping data from socket to the given outStream')
    this.client.pipe(outStream)
    return this
  }

  send (data, cb) {
    debug('Client sending data', data)
    cb = cb || noop
    if (data && !Buffer.isBuffer(data)) {
      data = new Buffer(data)
    }
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

  close (cb) {
    debug('client: closing socket.')
    this.on('close', cb)
    if (this.client) this.client.end()
    return this
  }

}

module.exports = Client

if (!module.parent) {
  const fs = require('fs')
  const nc2 = new Client()
  process.stdin.pipe(nc2.port(2389).connect().pipe(process.stdout).stream())
}
