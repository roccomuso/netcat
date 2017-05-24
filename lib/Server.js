'use strict'
const log = require('debug')
var debug = log('netcat:server')
const fs = require('fs')
const util = require('./util')
const Netcat = require('./Netcat')
const net = require('net')
const stream = require('stream')
const through2 = require('through2')
const shortid = require('shortid')

function noop () {}

class Server extends Netcat {

  constructor (opts) {
    opts = opts || {}
    super(opts)

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

  _createServer () {
    var self = this
    this.server = net.createServer()

    function listening () {
      debug('Server listening on port', self._port, 'addr', self._address)
      self.emit('ready')
    }

    function connection (socket) {
      socket.id = shortid.generate()
      var IPandPort = socket.remoteAddress + ':' + socket.remotePort
      debug('New connection', socket.id, IPandPort)
      self._clients[socket.id] = socket

      /* spawn exec */
      util.spawnProcess.call(self, socket)

      /* outcoming */
      if (self._serveFile) {
        debug('Serving given file', self._serveFile, 'as a stream to', socket.id)
        fs.createReadStream(self._serveFile).pipe(socket)
      } else if (self._serveStream) {
        debug('Serving given stream to the client', socket.id)
        self._serveStream.pipe(socket)
      }
      /* incoming */
      socket
      .pipe(through2(function (chunk, enc, callback) {
        debug('Got data from', IPandPort, '->', chunk)
        this.push(chunk)
        callback()
      }))
      .pipe(self.passThrough, { end: !self._keepalive })

      function data (data) { // emitting also chunks
        self.emit('data', socket, data)
      }

      function error (err) {
        debug('Socket error:', err)
        self.emit('err', socket, err)
      }

      function timeout () {
        debug('Connection timed out')
        delete self._clients[socket.id]
        self.emit('timeout', socket)
      }

      function end () {
        debug('Connection end.')
        self.emit('end', socket)
        if (!self._keepalive) self.close()
      }

      function close (hadError) {
        debug('Connection closed', hadError ? 'because of a conn. error' : 'by client')
        delete self._clients[socket.id]
        socket.removeAllListeners()
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
    if (typeof input === 'string') { // is a file
      debug('Serving given file:', input)
      fs.statSync(input) // check that file exists
      this._serveFile = input
    } else if (Buffer.isBuffer(input)) { // is a Buffer
      debug('Serving given buffer:', input)
      var pt = new stream.PassThrough()
      pt.end(input)
      this._serveStream = pt
    } else if (input instanceof stream.Stream) { // is a stream
      debug('Serving given stream')
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
  // const fs = require('fs')
  const nc = new Server()
  nc.port(2389).listen().k().serve(process.stdin).pipe(process.stdout)
}
