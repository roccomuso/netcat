'use strict'
const log = require('debug')
const Netcat = require('./Netcat')
const portScan = require('./portScan')
const connectTcp = require('./tcpClient')
const initUdp = require('./udpClient')
const { verboseDebug } = require('./util')

class Client extends Netcat {
  constructor (opts = {}) {
    super(opts)
    this.debug = opts.verbose ? verboseDebug : log('netcat:client')
    this._verbose = opts.verbose || false
    this._address = opts.address || '127.0.0.1'
    this._interval = opts.interval || false
    this._retry = opts.retry || null
  }

  _log (name) {
    return this._verbose ? this.debug : log(name)
  }

  interval (ms) {
    this.debug('setting interval to', ms, 'ms')
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
    initUdp(this, this._log('netcat:client:udp'))
    return this
  }

  connect (cb) {
    if (this._protocol !== 'tcp') {
      throw Error('Useless call to connect() in UDP mode, use init() instead')
    }
    connectTcp(this, this._log('netcat:client:tcp'), cb)
    return this
  }

  retry (ms) {
    if (this._protocol !== 'tcp') throw Error('Cannot use retry() in UDP')
    if (!Number.isInteger(ms)) throw Error('Retry should be a positive integer!')
    this._retry = ms
    return this
  }

  stream () {
    this.debug('Returning stream reference')
    return this.client
  }

  pipe (outStream) {
    if (this.client) {
      this.debug('Piping incoming data from socket to the given outStream')
      this._filter.pipe(outStream, { end: !this._retry }) /* kept open when retrying */
    } else {
      this.debug('Client is NOT defined, please call pipe after connect()!')
    }
    return this
  }

  _delayed (fn) {
    if (this._interval) setTimeout(fn, this._interval)
    else fn()
  }

  send (data, cb) {
    if (!this.client) return this
    const cbOrHost = (this._protocol === 'tcp') ? (cb || (() => {})) : (cb || null)
    if (data && !Buffer.isBuffer(data)) data = Buffer.from(data)
    this._delayed(() => this.client._send(data, cbOrHost))
    return this
  }

  end (d) {
    if (this._protocol === 'udp') throw Error('end() method is tcp only')
    if (!this.client) {
      this.debug('Client is NOT defined, cannot end socket')
      return this
    }
    this._delayed(() => this.client?.end(d)) /* send data + EOF */
    return this
  }

  close (cb) {
    this.debug('client: closing socket.')
    if (typeof cb === 'function') this.once('close', cb)
    if (this._protocol === 'udp') {
      try {
        this.client?.close()
      } catch {
        this.debug('client already closed')
      }
      return this
    }
    this._retry = null // block retries.
    return this.end()
  }

  scan (portsInterval, cb) {
    portScan(this, portsInterval).then((outcome) => cb?.(outcome))
    return this
  }
}

module.exports = Client
