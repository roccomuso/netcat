'use strict'
const debug = require('debug')('netcat:udpServer')
const dgram = require('dgram')
const Server = require('./Server')

class udpServer extends Server {
  constructor (args) {
    super(args)
    this.protocol = 'udp'
  }

  _createServer () {
    this.server = dgram.createSocket('udp4')
    // TODO
  }

  listen () {
    this._createServer()
    this.server.bind(this.port, this.address)
    debug('Server UDP listening on port', this.port, 'addr', this.address)
    return this
  }
}

module.exports = udpServer
