'use strict'
var debug = require('debug')('netcat:server')
const net = require('net')
const Stream = require('stream')
const concat = require('concat-stream')


class Server {

  constructor (opts) {
    opts = opts || {}
    debug = opts.verbose ? function(){
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this._protocol = opts.protocol || 'tcp'
    this._address = opts.address || '0.0.0.0'
    this._port = opts.port || null
    this._keepalive = false
    this.passThrough = new Stream.PassThrough()
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

  keepalive (bool) {
    this._keepalive = typeof bool !== 'undefined' ? bool : true
    debug('Keepalive connection.')
    if (this._serveStream) this._bufferizeStream()
    return this /* chainable method */
  }

  k (bool) { /* keepalive alias */
    this.keepalive(bool)
    return this /* chainable method */
  }

  close (cb) {
    debug('Closing socket.')
    this.server.close(cb)
    return this
  }

  _createServer () {
    var self = this
    this.server = net.createServer(function (socket) {
      debug('New connection!')

      /* outcoming */
      if (self._buffServeStream || self._serveStream){
        debug('Serving a stream to the current client.')
        (self._buffServeStream || self._serveStream).pipe(socket)
      }
      /* incoming */
      socket.pipe(self.passThrough, { end: !self._keepalive })

      //socket.on('data', function (data) {
      //  self.stdout.write(data)
      //})

      socket.on('end', function () {
        debug('Connection end.')
        if (!self._keepalive) self.close()
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
    return this /* chainable method */
  }

  pipe (outputStream) {
    debug('Pipe method called')
    this.passThrough.pipe(outputStream, { end: !this._keepalive })
    return this
  }

  serve (inputStream) {
    debug('Serving a stream to the clients...')
    this._serveStream = inputStream
    if (this._keepalive) this._bufferizeStream()
    return this /* chainable method */
  }

  _bufferizeStream () {
    /* bufferize the inputStream from serve(...) if _keepalive is set */
    debug('Bufferizing input serve() stream')
    var self = this
    var concatStream = concat(function(buff){
      self._serveStream = buff
    })
    this._serveStream.pipe(concatStream)
  }

  q () {
    // TODO

  }

}


module.exports = Server

if (!module.parent){
  const fs = require('fs')
  const nc = new Server()
  nc.port(2389).k().listen().pipe(fs.createWriteStream('output.txt'))
}
