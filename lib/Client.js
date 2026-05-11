'use strict'
const log = require('debug')
var debug = log('netcat:client')
const Netcat = require('./Netcat')
const portScan = require('./portScan')
const tcpClient = require('./tcpClient')
const udpClient = require('./udpClient')

function noop () {}
function verboseDebug () {
  var args = Array.prototype.slice.call(arguments)
  process.stderr.write(args.join(' ') + '\n')
}

class Client extends Netcat {
  constructor (opts) {
    opts = opts || {}
    super(opts)

    this.debug = opts.verbose ? verboseDebug : debug
    this._verbose = opts.verbose || false
    this._address = opts.address || '127.0.0.1'
    this._interval = opts.interval || false
    this._retry = opts.retry || null
  }

  interval (ms) {
    this.debug('setting interval to', ms, 'seconds')
    if (!Number.isInteger(ms)) throw Error('Please provide a valid number')
    this._interval = ms
    return this
  }

  i (ms) { /* alias for interval */
    return this.interval(ms)
  }

  init () {
    if (this._protocol === 'tcp') throw Error('Useless call to init() in TCP mode, use connect() instead')
    if (!this._port) throw Error('Port is mandatory in UDP')
    udpClient.call(this, this._verbose ? this.debug : log('netcat:client:udp'))
    return this
  }

  connect (cb) {
    if (this._protocol !== 'tcp') {
      throw Error('Useless call to connect() in UDP mode, use init() instead')
    }
    tcpClient.call(this, this._verbose ? this.debug : log('netcat:client:tcp'), cb)
    return this
  }

  retry (ms) {
    if (this._protocol !== 'tcp') throw Error('Cannot use retry() in UDP')
    if (!Number.isInteger(ms)) throw Error('Retry should be a positive integer!')
    this._retry = ms
    return this /* chainable method */
  }

  stream () {
    this.debug('Returning stream reference')
    return this.client /* return stream */
  }

  pipe (outStream) {
    if (this.client) {
      this.debug('Piping incoming data from socket to the given outStream')
      this._filter.pipe(outStream, { end: !this._retry }) /* HACK: kept open when retrying */
    } else {
      this.debug('Client is NOT defined, please call pipe after connect()!')
    }
    return this
  }

  send (data, cb) {
    var cbOrHost = (this._protocol === 'tcp') ? (cb || noop) : (cb || null)

    if (data && !Buffer.isBuffer(data)) {
      data = Buffer.from(data)
    }
    var self = this
    if (!this.client) return this
    if (self._interval) { /* delay */
      setTimeout(function () {
        self.client._send(data, cbOrHost)
      }, self._interval)
    } else {
      self.client._send(data, cbOrHost)
    }
    return this
  }

  end (d) {
    if (this._protocol === 'udp') throw Error('end() method is tcp only')
    var self = this
    if (this._interval) {
      setTimeout(function () { /* delay */
        if (self.client) self.client.end(d) /* send data + EOF */
      }, self._interval)
    } else if (self.client) {
      self.client.end(d) /* send data + EOF */
    } else {
      self.debug('Client is NOT defined, cannot end socket')
    }
    return this
  }

  close (cb) {
    this.debug('client: closing socket.')
    if (typeof cb === 'function') this.once('close', cb)
    if (this._protocol === 'udp') {
      try {
        if (this.client) this.client.close(cb)
      } catch (e) {
        this.debug('client already closed')
      }
      return this
    }
    this._retry = null // block retries.
    return this.end()
  }

  scan (portsInterval, cb) {
    /* Port Scanner */
    portScan(this, portsInterval, cb)
    return this
  }
}

module.exports = Client
