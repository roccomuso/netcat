'use strict'
var debug = require('debug')('netcat:server')
const fs = require('fs')
const EventEmitter = require('events').EventEmitter
const net = require('net')
const stream = require('stream')
const shortid = require('shortid')

function noop () {}

class Server extends EventEmitter {

  constructor (opts) {
    super()
    opts = opts || {}
    debug = opts.verbose ? function () {
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this._protocol = opts.protocol || 'tcp'
    this._address = opts.address || '0.0.0.0'
    this._port = opts.port || null
    this._keepalive = false
    this.passThrough = new stream.PassThrough()
    this._clients = {}
  }

  protocol (p) {
    this._protocol = p
    debug('Protocol is', this._protocol)
    return this /* chainable method */
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

  _createServer () {
    var self = this
    this.server = net.createServer()

    function listening () {
      debug('Server listening on port', self._port, 'addr', self._address)
      self.emit('ready')
    }

    function connection (socket) {
      socket.id = shortid.generate()
      debug('New connection', socket.id, socket.remoteAddress + ':' + socket.remotePort)
      self._clients[socket.id] = socket

      /* outcoming */
      if (self._serveFile) {
        debug('Serving given file', self._serveFile, 'as a stream to client', socket.id)
        fs.createReadStream(self._serveFile).pipe(socket)
      } else if (self._serveStream) {
        debug('Serving given stream to the client', socket.id)
        self._serveStream.pipe(socket)
      }
      /* incoming */
      socket.pipe(self.passThrough, { end: !self._keepalive })

      function data (data) { // emitting also chunks
        self.emit('data', socket, data)
      }

      function error (err) {
        debug('Socket error:', err)
        self.emit('error', socket, err)
      }

      function timeout () {
        debug('Connection timed out')
        delete self._clients[socket.id]
        self.emit('timeout', socket)
      }

      function end () {
        debug('Connection end.')
        delete self._clients[socket.id]
        self.emit('end', socket)
        if (!self._keepalive) self.close()
      }

      function close (hadError) {
        debug('Connection closed', hadError ? 'because of a conn. error' : 'by client')
        self.emit('close', socket, hadError)
      }

      process.nextTick(function () {
        socket.on('data', data)
        socket.on('error', error)
        socket.on('timeout', timeout)
        socket.on('end', end)
        socket.on('close', close)
      })
    }

    function close () {
      self.server.unref()
      debug('Server closed')
      self._clients = {}
      self.emit('srvClose')
    }

    function error (err) {
      debug('Server error', err)
      self.emit('error', err)
    }

    process.nextTick(function () {
      self.server.on('listening', listening)
      self.server.on('connection', connection)
      self.server.on('close', close)
      self.server.on('error', error)
    })
  }

  listen () {
    debug('listen called')
    this._createServer()
    this.server.listen(this._port, this._address)
    return this /* chainable method */
  }

  pipe (outputStream) {
    debug('Pipe method called')
    this.passThrough.pipe(outputStream, { end: !this._keepalive })
    return this
  }

  serve (input) {
    debug('Setting file/stream to serve', input)
    if (typeof input === 'string') {
      fs.statSync(input) // check that file exists
      this._serveFile = input
    } else if (Buffer.isBuffer(input)) { // is a Buffer
      var pt = new stream.PassThrough()
      pt.end(input)
      this._serveStream = pt
    } else if (input instanceof stream.Stream) { // is a stream
      this._serveStream = input
    }
    return this /* chainable method */
  }

  getClients () {
    return this._clients
  }

  q () {
    // TODO

  }

}

module.exports = Server

if (!module.parent) {
  const fs = require('fs')
  const nc = new Server()
  nc.port(2389).k().listen().pipe(fs.createWriteStream('output.txt'))
    .on('data', function (s, data) { console.log(s.id, 'got', data) })
}
