'use strict'
const log = require('debug')
var debug = log('netcat:server')
const fs = require('fs')
const Netcat = require('./Netcat')
const tcpServer = require('./tcpServer')
const udpServer = require('./udpServer')
const stream = require('stream')

function noop () {}

class Server extends Netcat {
  constructor (opts) {
    opts = opts || {}
    super(opts)

    debug = opts.verbose ? function () {
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this.debug = debug
    this._verbose = opts.verbose || false
    this._address = opts.address || '0.0.0.0'
    this._keepalive = false
    this._clients = {}
  }

  keepalive (bool) {
    this._keepalive = typeof bool !== 'undefined' ? bool : true
    debug('Keepalive connection.')
    return this /* chainable method */
  }

  k (bool) { /* keepalive alias */
    return this.keepalive(bool) /* chainable method */
  }

  close (cb) {
    debug('Server: closing sockets...')
    cb = cb || noop
    for (var c in this._clients) {
      this._clients[c].destroy() // closing existing sockets
    }
    try {
      if (this._protocol === 'udp') this.server.end() // close the stream
      if (this.server) this.server.close(cb)
    } catch (e) {
      debug('Server already closed')
    }
    return this
  }

  listen () {
    debug('listen called')
    if (this._protocol === 'tcp') {
      tcpServer.call(this, this._verbose ? debug : log('netcat:server:tcp'))
      this.server.listen(this._unixSocket || {host: this._address, port: this._port})
    } else { // udp
      if (!this._port) throw Error('listen(): setting a port is mandatory.')
      udpServer.call(this, this._verbose ? debug : log('netcat:server:udp'))
    }

    return this /* chainable method */
  }

  pipe (outputStream) {
    debug('Pipe method called')
    this._filter.pipe(outputStream, { end: !this._keepalive })
    return this
  }

  send (msg, host) {
    if (this._protocol !== 'udp') throw Error('Cannot use send() in TCP, use serve() instead')
    if (this.server) {
      this.server.write(msg, host)
    } else {
      debug('send(): server instance does not exists!')
    }
    return this
  }

  serve (input) {
    if (typeof input === 'string') { // is a file
      debug('Serving given file:', input)
      fs.statSync(input) // check that file exists
      this._serveFile = input
    } else if (Buffer.isBuffer(input)) { // is a Buffer
      debug('Serving given buffer:', input)
      this._serveStream = input
    } else if (input instanceof stream.Stream) { // is a stream
      debug('Serving given stream')
      this._serveStream = input
    } else {
      debug('Attempting to serve general stream')
      this._serveStream = input
    }
    return this /* chainable method */
  }

  getClients () {
    if (this._protocol !== 'tcp') throw Error('Cannot use getClients() in UDP')
    return this._clients
  }

  proxy (duplexStream) {
    if (this._protocol !== 'tcp') throw Error('Cannot use proxy() in UDP')
    debug('Proxying requests...')
    this.serve(duplexStream)
    this.pipe(duplexStream)
    return this
  }
}

module.exports = Server
