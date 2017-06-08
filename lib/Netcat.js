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
    this._loopback = opts.loopback || false
    this._encoding = opts.encoding || null
    this._unixSocket = opts.unixSocket || null
    this._port = opts.port || null
    this._exec = opts.exec || null
    this.passThrough = new stream.PassThrough()
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
