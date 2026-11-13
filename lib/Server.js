'use strict'
const fs = require('node:fs')
const log = require('debug')
const Netcat = require('./Netcat')
const listenTcp = require('./tcpServer')
const listenUdp = require('./udpServer')
const { verboseDebug } = require('./util')

const DEFAULT_SERVE_CACHE_LIMIT = 1024 * 1024 // 1 MiB

class Server extends Netcat {
  constructor (opts = {}) {
    super(opts)
    this.debug = opts.verbose ? verboseDebug : log('netcat:server')
    this._verbose = opts.verbose || false
    this._address = opts.address || '0.0.0.0'
    this._keepalive = false
    this._clients = {}
    this._serveCacheLimit = opts.serveCacheLimit ?? DEFAULT_SERVE_CACHE_LIMIT
  }

  _log (name) {
    return this._verbose ? this.debug : log(name)
  }

  keepalive (bool) {
    this._keepalive = typeof bool !== 'undefined' ? bool : true
    this.debug('Keepalive connection.')
    return this
  }

  k (bool) { /* keepalive alias */
    return this.keepalive(bool)
  }

  close (cb = () => {}) {
    this.debug('Server: closing sockets...')
    for (const socket of Object.values(this._clients)) socket.destroy()
    try {
      if (this._protocol === 'udp') this.server?.end() // close the stream
      this.server?.close(cb)
    } catch {
      this.debug('Server already closed')
    }
    return this
  }

  listen () {
    this.debug('listen called')
    if (this._protocol === 'tcp') {
      listenTcp(this, this._log('netcat:server:tcp'))
      this.server.listen(this._unixSocket || { host: this._address, port: this._port })
    } else { // udp
      if (!this._port) throw Error('listen(): setting a port is mandatory.')
      listenUdp(this, this._log('netcat:server:udp'))
    }
    return this
  }

  pipe (outputStream) {
    this.debug('Pipe method called')
    this._filter.pipe(outputStream, { end: !this._keepalive })
    return this
  }

  send (msg, host) {
    if (this._protocol !== 'udp') throw Error('Cannot use send() in TCP, use serve() instead')
    if (this.server) {
      this.server.write(msg, host)
    } else {
      this.debug('send(): server instance does not exists!')
    }
    return this
  }

  serve (input) {
    this._serveStreamCache = null
    this._serveFile = null
    this._serveStream = null
    if (typeof input === 'string') { // is a file
      this.debug('Serving given file:', input)
      fs.statSync(input) // check that file exists
      this._serveFile = input
    } else if (Buffer.isBuffer(input)) {
      this.debug('Serving given buffer:', input)
      this._serveStream = input
    } else { // is a stream
      this.debug('Serving given stream')
      this._serveStream = input
    }
    return this
  }

  getClients () {
    if (this._protocol !== 'tcp') throw Error('Cannot use getClients() in UDP')
    return this._clients
  }

  proxy (duplexStream) {
    if (this._protocol !== 'tcp') throw Error('Cannot use proxy() in UDP')
    this.debug('Proxying requests...')
    this.serve(duplexStream)
    this.pipe(duplexStream)
    return this
  }
}

module.exports = Server
