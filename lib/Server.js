'use strict'
const log = require('debug')
var debug = log('netcat:server')
const fs = require('fs')
const Netcat = require('./Netcat')
const _initTcpServer = require('./tcpServer')
const _initUdpServer = require('./udpServer')
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
    this.keepalive(bool)
    return this /* chainable method */
  }

  close (cb) {
    debug('Server: closing sockets...')
    cb = cb || noop
    for (var c in this._clients) {
      this._clients[c].destroy() // closing existing sockets
    }
    if (this.server) this.server.close(cb)
    return this
  }

  listen () {
    debug('listen called')
    if (this._protocol === 'tcp') {
      _initTcpServer.call(this, debug)
      this.server.listen(this._unixSocket || {host: this._address, port: this._port})
    } else { // udp
      if (!this._port) throw Error('listen(): setting a port is mandatory.')
      _initUdpServer.call(this, debug, false) // loopback = false
      this.server.bind(this._port, this._address)
    }

    return this /* chainable method */
  }

  pipe (outputStream) {
    debug('Pipe method called')
    this.passThrough.pipe(outputStream, { end: !this._keepalive })
    return this
  }

  send (msg, host) {
    if (this._protocol !== 'udp') throw Error('Cannot use send() in TCP, use serve() instead')
    if (this.server) {
      this.server.write(msg, host)
      debug('Sending', msg, host ? 'to ' + host : 'to 255.255.255.255')
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

if (!module.parent) {
  const nc = new Server()
  // nc.port(2389).listen().k().serve(process.stdin).pipe(process.stdout)

  nc.port(2389).k().listen()
}
