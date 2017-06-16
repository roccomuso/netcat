'use strict'
var debug = require('debug')('netcat:netcat')
const EventEmitter = require('events').EventEmitter
const stream = require('stream')

/* Inherited from Server.js and Client.js */
class Netcat extends EventEmitter {
  constructor (opts) {
    super()
    opts = opts || {}
    this.debug = debug
    this._protocol = opts.protocol || 'tcp'
    this._waitTime = opts.waitTime || null
    this._destination = opts.destination || '127.0.0.1'
    this._loopback = opts.loopback || false
    this._encoding = opts.encoding || null
    this._unixSocket = opts.unixSocket || null
    this._port = opts.port || null
    this._exec = opts.exec || null
    this.passThrough = new stream.PassThrough()
  }

  broadcast (dst) {
    if (this._protocol !== 'udp') throw Error('Cannot use broadcast() in TCP, only UDP')
    this._broadcast = true // server only
    this._destination = dst || '255.255.255.255'
    debug('broadcast to', this._destination)
    return this
  }

  b () { /* alias for broadcast() */
    return this.broadcast()
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
    return this /* chainable method */
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
    return this /* chainable method */
  }

  addr (a) {
    /* address alias */
    return this.address(a)
  }

  port (p) {
    if (!Number.isInteger(p)) throw Error('Port should be a positive integer!')
    this._port = p
    this.debug('Port set to', this._port)
    return this /* chainable method */
  }

  p (p) {
    /* port alias */
    return this.port(p)
  }

  bind (port) {
    /* listening port in UDP */
    if (this._protocol === 'tcp') throw Error('UDP-only Method')
    if (!Number.isInteger(port)) throw Error('Port should be a positive integer!')
    this.debug('UDP Listening port set to', port)
    this._bind = port
    return this
  }

  udp () {
    return this.protocol('udp') /* chainable method */
  }

  tcp () {
    return this.protocol('tcp') /* chainable method */
  }

  exec (cmd, args) {
    this._exec = cmd
    this._execArgs = args || []
    return this /* chainable method */
  }
}

module.exports = Netcat
