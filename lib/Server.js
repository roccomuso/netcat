'use strict'
const debug = require('debug')('netcat:server')
const net = require('net')

class Server {

  constructor (opts) {
    opts = opts || {}
    this._protocol = opts.protocol || 'tcp'
    this._address = opts.address || '0.0.0.0'
    this._port = opts.port || null
    this.stdout = opts.stdout || process.stdout
  }

  protocol (p) {
    this._protocol = p
    debug('Protocol is', this._protocol)
    return this /* chainable method */
  }

  address (a) {
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

  close (cb) {
    debug('Closing socket.')
    this.server.close(cb)
  }

  _createServer () {
    var self = this
    this.server = net.createServer(function (socket) {
      debug('New connection!')

      socket.on('data', function (data) {
        self.stdout.write(data)
      })

      socket.on('end', function () {
        debug('Connection end.')
      })

      socket.on('timeout', function () {
        debug('Connection timed out')
      })

      socket.on('close', function (hadError) {
        debug('Connection closed', hadError ? 'because of a conn. error' : 'by client')
      })

    })
  }

  listen () {
    this._createServer()
    this.server.listen(this._port, this._address)
    debug('Server TCP listening on port', this._port, 'addr', this._address)
    // TODO: return stream
    return this.stdout
  }

}


module.exports = Server
