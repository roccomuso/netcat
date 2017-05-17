'use strict'
var debug = require('debug')('netcat:server')
const EventEmitter = require('events').EventEmitter
const net = require('net')

class Client extends EventEmitter {

  constructor (opts) {
    super()
    opts = opts || {}
    debug = opts.verbose ? function(){
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this._protocol = opts.protocol || 'tcp'
    this._address = opts.address || '127.0.0.1'
    this._port = opts.port || null
    this.client = {}
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

  connect () {
    var self = this
    // create TCP client
    this.client = net.connect({host: this._address, port: this._port}, function () {
        // write out connection details
        debug('Connected to %s:%d\n', self._address, self._port)

        rl.on('line', function (d) {
          // send data to through the client to the host
          self.client.write(d.trim() + '\n')
        })

        self.client.on('data', function (d) {
          // pause to prevent more data from coming in
          process.stdin.pause()

          // write out the data
          process.stdout.write(d.toString())
          process.stdin.resume()
        })

        self.client.on('close', function () {
          // stop input
          process.stdin.pause()

          // end readline
          process.stdout.write('\nconnection closed by foreign host.\n')
          rl.close()
        })

        rl.on('SIGINT', function () {
          // stop input
          process.stdin.pause()
          process.stdout.write('\nending session\n')
          rl.close()

          // close connection
          self.client.end()
        })

    })
  }

  send (data) {
    if (this.client.write) this.client.write(data)
  }

  end () {
    debug('Closing socket.')
    if (this.client.end) this.client.end()
    return this
  }

}

module.exports = Client
