'use strict'
const util = require('./util')
const waitTimer = util.waitTimer
const fs = require('fs')
const net = require('net')
const stream = require('stream')
const through2 = require('through2')
const shortid = require('shortid')

module.exports = function (debug) {
  var self = this
  this.server = net.createServer()

  function listening () {
    debug('Server listening on port', self._port, 'addr', self._address)
    self.emit('ready')
  }

  function tcpConnection (socket) {
    socket.id = shortid.generate()
    socket.setKeepAlive(!!self._keepalive)
    if (self._encoding) socket.setEncoding(self._encoding)
    self.emit('connection', socket)

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
      if (Buffer.isBuffer(self._serveStream)) {
        var pt = new stream.PassThrough()
        pt.end(self._serveStream)
        pt.pipe(socket)
      } else {
        self._serveStream.pipe(socket)
      }
    }
      /* incoming */
    socket
      .pipe(through2(function (chunk, enc, callback) {
        debug('Got data from', IPandPort, '->', chunk)
        this.push(chunk)
        callback()
      }))
      .pipe(self.passThrough, { end: !self._keepalive })

    function tcpData (data) { // emitting also chunks
      self.emit('data', socket, data)
      // waitTime before close
      waitTimer.call(self)
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
      self.emit('clientClose', socket, hadError)
    }

    process.nextTick(function () {
      socket.on('data', tcpData)
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
    self.emit('close')
  }

  function error (err) {
    debug('Server error', err)
    self.emit('error', err)
  }

  process.nextTick(function () {
    self.server.on('listening', listening)
    self.server.on('connection', tcpConnection)
    self.server.on('close', close)
    self.server.on('error', error)
  })
}
