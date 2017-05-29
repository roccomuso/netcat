'use strict'
var debug = require('debug')('netcat:netcat')
const EventEmitter = require('events').EventEmitter
const stream = require('stream')

/* Inherited from Server.js and Client.js */
class Netcat extends EventEmitter {
  constructor (opts) {
    super()
    opts = opts || {}
    debug = opts.verbose ? function () {
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this._protocol = opts.protocol || 'tcp'
    this._encoding = opts.encoding || null
    this._unixSocket = opts.unixSocket || null
    this._port = opts.port || null
    this._exec = opts.exec || null
    this.passThrough = new stream.PassThrough()
  }

  enc (encoding) {
    debug('set encoding to', encoding)
    this._encoding = encoding
    return this
  }

  protocol (p) {
    this._protocol = p
    debug('Protocol is', this._protocol)
    return this /* chainable method */
  }

  unixSocket (file) {
    debug('Setting the given unix socket file:', file)
    this._unixSocket = file
    return this
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
    if (!Number.isInteger(p)) throw Error('Port should be a positive integer!')
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

  exec (cmd, args) {
    this._exec = cmd
    this._execArgs = args || []
    return this /* chainable method */
  }
}

module.exports = Netcat
