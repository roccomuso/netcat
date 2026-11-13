'use strict'
const { EventEmitter } = require('node:events')
const { PassThrough, Transform } = require('node:stream')

/* Inherited from Server.js and Client.js */
class Netcat extends EventEmitter {
  constructor (opts = {}) {
    super()
    this.debug = require('debug')('netcat:netcat')
    this._protocol = opts.protocol || 'tcp'
    this._waitTime = opts.waitTime || null
    this._destination = opts.destination || '127.0.0.1'
    this._loopback = opts.loopback || false
    this._encoding = opts.encoding || null
    this._unixSocket = opts.unixSocket || null
    this._port = opts.port || null
    this._output = opts.output || null
    this._exec = opts.exec || null
    this._filter = opts.filter || new PassThrough()

    /* Incoming traffic always flows into this._filter, read by pipe() or exec().
     * When only 'data' events are used nobody reads it: drain it, otherwise once
     * its buffer fills up backpressure pauses the socket and data stops (issue #11). */
    this.on('newListener', (event) => {
      if (event === 'data') process.nextTick(() => this._drainUnusedFilter())
    })
  }

  _drainUnusedFilter () {
    if (this._filter.readableFlowing === null) this._filter.resume()
  }

  broadcast (dst) {
    if (this._protocol !== 'udp') throw Error('Cannot use broadcast() in TCP, only UDP')
    this._broadcast = true // server only
    this._destination = dst || '255.255.255.255'
    this.debug('broadcast to', this._destination)
    return this
  }

  b (dst) { /* alias for broadcast() */
    return this.broadcast(dst)
  }

  destination (dst) {
    if (this._protocol !== 'udp') throw Error('Cannot use destination() in TCP, only UDP')
    this._destination = dst || '127.0.0.1'
    this.debug('destination set to', this._destination)
    return this
  }

  waitTime (ms) {
    this.debug('setting waitTime', ms, 'ms')
    this._waitTime = ms
    return this
  }

  wait (ms) { /* waitTime(ms) alias */
    return this.waitTime(ms)
  }

  enc (encoding) {
    this.debug('set encoding to', encoding)
    this._encoding = encoding
    return this
  }

  protocol (p) {
    this._protocol = p
    this.debug('Protocol is', this._protocol)
    return this
  }

  loopback () {
    if (this._protocol === 'tcp') throw Error('loopback() not available in TCP mode')
    this.debug('loopback true')
    this._loopback = true
    return this
  }

  unixSocket (file) {
    if (this._protocol === 'udp') throw Error('unixSocket() not available in UDP mode')
    this.debug('Setting the given unix socket file:', file)
    this._unixSocket = file
    return this
  }

  address (a) {
    this.debug('setting address', a)
    this._address = a
    return this
  }

  addr (a) { /* address alias */
    return this.address(a)
  }

  port (p) {
    if (!Number.isInteger(p)) throw Error('Port should be a positive integer!')
    this._port = p
    this.debug('Port set to', this._port)
    return this
  }

  p (p) { /* port alias */
    return this.port(p)
  }

  bind (port) { /* listening port in UDP */
    if (this._protocol === 'tcp') throw Error('UDP-only Method')
    if (!Number.isInteger(port)) throw Error('Port should be a positive integer!')
    this.debug('UDP Listening port set to', port)
    this._bind = port
    return this
  }

  udp () {
    return this.protocol('udp')
  }

  tcp () {
    return this.protocol('tcp')
  }

  output (outStream) {
    if (!(outStream && outStream.writable !== false && typeof outStream.write === 'function')) {
      throw Error('Provide a writable stream to output()')
    }
    this.debug('Set hex dump output stream')
    this._output = outStream
    return this
  }

  out (outStream) { /* output() alias */
    return this.output(outStream)
  }

  exec (cmd, args, execOptions) {
    if (this._protocol === 'udp') throw Error('TCP-only Method')
    this._exec = cmd
    this._execArgs = args || []
    this._execOptions = execOptions || {}
    return this
  }

  filter (fn) {
    this.debug('Setting a filter for incoming traffic')
    if (typeof fn !== 'function') throw Error('filter() accepts only function!')
    this._filter = new Transform({ transform: fn })
    return this
  }
}

module.exports = Netcat
