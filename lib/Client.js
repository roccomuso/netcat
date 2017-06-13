'use strict'
const log = require('debug')
var debug = log('netcat:client')
const Netcat = require('./Netcat')
const portScan = require('./portScan')
const tcpClient = require('./tcpClient')
const udpClient = require('./udpClient')

function noop () {}

class Client extends Netcat {
  constructor (opts) {
    opts = opts || {}
    super(opts)

    debug = opts.verbose ? function () {
      var args = Array.prototype.slice.call(arguments)
      process.stderr.write(args.join(' ') + '\n')
    } : debug
    this.debug = debug
    this._verbose = opts.verbose || false
    this._address = opts.address || '127.0.0.1'
    this._interval = opts.interval || false
    this._q = opts.q || null
  }

  interval (secs) {
    debug('setting interval to', secs, 'seconds')
    if (!Number.isInteger(secs)) throw Error('Please provide a valid number')
    this._interval = Math.round(secs)
    return this
  }

  i (s) { /* alias for interval */
    return this.interval(s)
  }

  init () {
    if (this._protocol === 'tcp') throw Error('Useless call to init() in TCP mode, use connect() instead')
    if (!this._port) throw Error('Port is mandatory in UDP')
    udpClient.call(this, this._verbose ? debug : log('netcat:client:udp'))
    return this
  }

  connect (cb) {
    if (this._protocol !== 'tcp') {
      throw Error('Useless call to connect() in UDP mode, use init() instead')
    }
    tcpClient.call(this, this._verbose ? debug : log('netcat:client:tcp'), cb)
    return this
  }

  retry (ms) {
    if (this._protocol !== 'tcp') throw Error('Cannot use retry() in UDP')
    if (!Number.isInteger(ms)) throw Error('Retry should be a positive integer!')
    this._retry = ms
    return this /* chainable method */
  }

  stream () {
    debug('Returning stream reference')
    return this.client /* return stream */
  }

  pipe (outStream) {
    if (this.client) {
      debug('Piping incoming data from socket to the given outStream')
      this.client.pipe(outStream, { end: !this._retry }) /* HACK: kept open when retrying */
    } else {
      debug('Client is NOT defined, please call pipe after connect()!')
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
    if (this._interval) { /* delay */
      setTimeout(function () {
        self.client.write(data, cbOrHost)
        debug('Client sent data', data, ((self._protocol === 'udp') ? 'to ' + (cbOrHost || self._destination) : ''))
      }, self._interval * 1000)
    } else {
      self.client.write(data, cbOrHost)
      debug('Client sent data', data, ((self._protocol === 'udp') ? 'to ' + (cbOrHost || self._destination) : ''))
    }
    return this
  }

  end (d) {
    if (this._protocol === 'udp') throw Error('end() method is tcp only')
    var self = this
    if (this._interval) {
      setTimeout(function () { /* delay */
        if (self.client) self.client.end(d) /* send data + EOF */
      }, self._interval * 1000)
    } else {
      self.client.end(d) /* send data + EOF */
    }
    return this
  }

  close (cb) {
    debug('client: closing socket.')
    if (typeof cb === 'function') this.on('close', cb)
    if (this._protocol === 'udp') {
      try {
        if (this.client) this.client.close(cb)
      } catch (e) {
        debug('client already closed')
      }
      return this
    }
    return this.end()
  }

  scan (portsInterval, cb) {
    /* Port Scanner */
    portScan(this, portsInterval, cb)
    return this
  }
}

module.exports = Client

if (!module.parent) {
  const nc2 = new Client()
  nc2.udp().port(53)
  .on('data', function (rinfo, res) {
    console.log(res)
  })
  .init()

}
