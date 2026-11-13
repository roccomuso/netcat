'use strict'

const fs = require('fs')
const path = require('path')
const { concat } = require('./helpers')
const test = require('node:test')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client

test('UDP Server basic methods', (t) => {
  t.plan(8)

  const nc = new NetcatServer()
  t.assert.strictEqual(nc._protocol, 'tcp', 'protocol is tcp by default')

  // calling udp-only methods
  t.assert.throws(() => nc.send('hi'), Error, 'send() is udp only')

  t.assert.throws(() => nc.loopback(), Error, 'loopback() is udp only')

  t.assert.throws(() => nc.broadcast(), Error, 'broadcast() is udp only')

  nc.udp()
  t.assert.strictEqual(nc._protocol, 'udp', 'setting udp as protocol')
  // calling tcp-only methods
  t.assert.throws(() => nc.getClients(), Error, 'getClients() is tcp only')

  t.assert.throws(() => nc.proxy(), Error, 'proxy() is tcp only')

  t.assert.throws(() => nc.listen(), Error, 'port is mandatory')
})

test('Client basic methods', (t) => {
  t.plan(9)

  const nc = new NetcatClient()
  t.assert.strictEqual(nc._protocol, 'tcp', 'protocol is tcp by default')

  // calling udp-only methods
  t.assert.throws(() => nc.init(), Error, 'init() is udp only')

  t.assert.throws(() => nc.loopback(), Error, 'loopback() is udp only')

  t.assert.throws(() => nc.destination(), Error, 'destination() is udp only')

  nc.udp()
  t.assert.strictEqual(nc._protocol, 'udp', 'setting udp as protocol')
  // calling tcp-only methods
  t.assert.throws(() => nc.connect(), Error, 'connect() is tcp only')

  t.assert.throws(() => nc.retry(), Error, 'retry() is tcp only')

  t.assert.throws(() => nc.end(), Error, 'end() is tcp only')

  t.assert.throws(() => nc.init(), Error, 'port is mandatory')
})

test('Server listen and client send packets', (t) => {
  t.plan(5, { wait: 5000 })

  const nc = new NetcatServer()
  nc.udp().port(2100).listen().on('data', (rinfo, data) => {
    t.assert.strictEqual(rinfo.family, 'IPv4', 'got expected IP version')
    t.assert.ok(Buffer.isBuffer(data), 'got expected data type')
    t.assert.strictEqual(data.toString(), 'hello', 'got expected data')
    nc.close()
  }).on('close', () => {
    t.assert.ok(true, 'server got expected close event')
  })

  const nc2 = new NetcatClient()
  nc2.udp().port(2100).wait(1000).init().send('hello', '127.0.0.1').on('close', () => {
    t.assert.ok(true, 'client got expected close event')
  })
})

test('Server rx encoding utf8', (t) => {
  t.plan(4, { wait: 3000 })

  const nc = new NetcatServer()
  t.assert.strictEqual(nc._encoding, null, 'no encoding by default')

  nc.udp().enc('utf8').port(2101).listen().on('data', (rinfo, data) => {
    t.assert.strictEqual(nc._encoding, 'utf8', 'server got expected encoding set')
    t.assert.strictEqual(typeof data, 'string', 'got expected data type')
    t.assert.strictEqual(data, 'hello', 'server got expected data')
    nc.close()
    nc2.close()
  })

  const nc2 = new NetcatClient()
  nc2.udp().port(2101).init().send('hello', '127.0.0.1')
})

test('Server sending a packet with loopback', (t) => {
  t.plan(4, { wait: 3000 })

  const nc = new NetcatServer()
  t.assert.strictEqual(nc._loopback, false, 'no loopback by default')
  nc.udp().port(2103).serve(Buffer.from('hello myself')).on('data', (rinfo, msg) => {
    t.assert.fail('got unexpected msg')
  }).listen()

  const nc2 = new NetcatServer()
  nc2.udp().port(2104).loopback().wait(1000).serve(Buffer.from('hello myself')).on('data', (rinfo, msg) => {
    t.assert.strictEqual(nc2._loopback, true, 'loopback is true')
    t.assert.ok(rinfo.loopback, 'got loopback msg')
    t.assert.strictEqual(msg.toString(), 'hello myself', 'got expected loopback msg')
    nc.close()
  }).listen()
})

test('Transfer a file (stream)', (t) => {
  t.plan(2, { wait: 5000 })

  const nc = new NetcatServer()
  const testFile = path.join(__dirname, '..', 'client.js')
  const inputFile = fs.readFileSync(testFile)

  const concatStream = concat((file) => {
    t.assert.strictEqual(file.toString(), inputFile.toString(), 'server got expected file')
  })

  // waitTime to close after 1 sec of inactivity since the last msg
  nc.udp().port(2105).wait(1000).listen().pipe(concatStream)
    .on('close', () => {
      t.assert.ok(true, 'server closed event')
      nc2.close()
    })

  const nc2 = new NetcatClient()
  nc.on('ready', () => {
    nc2.udp().destination('127.0.0.1').port(2105).init()
    fs.createReadStream(testFile).pipe(nc2.stream())
  })
})

test('Server: listen and sending on different ports', (t) => {
  t.plan(7, { wait: 5000 })

  const nc2 = new NetcatServer()
  nc2.udp().enc('utf8').bind(2107).port(2108).on('data', (rinfo, msg) => {
    t.assert.strictEqual(rinfo.port, 2108, 'got exptected inc. port')
    t.assert.strictEqual(typeof msg, 'string', 'got expected data type')
    t.assert.strictEqual(msg, 'ping', 'got expected data')
    nc2.send('pong')
  }).listen() // listen on 2107 and send on 2108

  const nc3 = new NetcatServer()
  nc3.udp().bind(2108).port(2107).on('data', (rinfo, msg) => {
    t.assert.strictEqual(rinfo.port, 2107, 'got exptected inc. port')
    t.assert.ok(Buffer.isBuffer(msg), 'got expected data type')
    t.assert.strictEqual(msg.toString(), 'pong', 'got response data')
    nc3.close()
    nc2.close()
  }).on('ready', () => {
    nc3.send('ping')
    t.assert.ok(true, 'ready event fired')
  }).listen() // listen on 2108 and send on 2107
})

test('Bridge: TCP -> UDP', (t) => {
  t.plan(7, { wait: 5000 })

  // nc4 (tcp-client) <-> nc (tcp-server|udp-bridge) <-> nc2 (udp-server) <-> nc3 (udp-server)

  const nc2 = new NetcatServer()
  nc2.udp().wait(1000).bind(2107).port(2108).listen()

  const nc3 = new NetcatServer()
  nc3.udp().wait(1000).bind(2108).port(2107).on('data', (rinfo, msg) => {
    t.assert.strictEqual(rinfo.port, 2107, 'got exptected inc. port')
    t.assert.ok(Buffer.isBuffer(msg), 'got expected data type')
    t.assert.strictEqual(msg.toString(), 'ping', 'UDP got expected ping')
    nc3.send('pong')
  }).listen()

  const nc = new NetcatServer()
  nc.k().port(2100).proxy(nc2.server).on('data', (sock, msg) => {
    t.assert.ok(Buffer.isBuffer(msg), 'got expected data type')
    t.assert.strictEqual(msg.toString(), 'ping', 'TCP got expected ping')
  }).listen()

  setTimeout(() => {
    const nc4 = new NetcatClient()
    nc4.port(2100).connect().send(Buffer.from('ping')).on('data', (msg) => {
      t.assert.ok(Buffer.isBuffer(msg), 'got expected data type')
      t.assert.strictEqual(msg.toString(), 'pong', 'TCP got expected pong')
      nc4.close()
      nc.close()
    })
  }, 1500)
})

test('Server hex dump - output()', (t) => {
  t.plan(7, { wait: 5000 })

  const concatDump = concat((dump) => {
    console.log(dump.toString())
    t.assert.ok(dump.toString().indexOf('<') !== -1, 'got incoming hex dump')
    t.assert.ok(dump.toString().indexOf('>') !== -1, 'got outcoming hex dump')
  })

  const nc = new NetcatServer()
  nc.udp().port(2102).out(concatDump).serve(Buffer.from('hello from the server')).listen().on('data', (rinfo, data) => {
    t.assert.strictEqual(rinfo.family, 'IPv4', 'got expected IP version')
    t.assert.ok(Buffer.isBuffer(data), 'got expected data type')
    t.assert.strictEqual(data.toString(), 'At least 16 bytez', 'got expected data')
    nc.close()
  }).on('close', () => {
    t.assert.ok(true, 'server got expected close event')
  })

  const nc2 = new NetcatClient()
  nc2.udp().port(2102).wait(1000).init().send('At least 16 bytez', '127.0.0.1').on('close', () => {
    t.assert.ok(true, 'client got expected close event')
  })
})

test('Client hex dump', (t) => {
  t.plan(6, { wait: 5000 })

  const concatDump = concat((dump) => {
    console.log(dump.toString())
    t.assert.ok(dump.toString().indexOf('>') !== -1, 'got outcoming hex dump')
  })

  const nc = new NetcatServer()
  nc.udp().port(2102).listen().on('data', (rinfo, data) => {
    t.assert.strictEqual(rinfo.family, 'IPv4', 'got expected IP version')
    t.assert.ok(Buffer.isBuffer(data), 'got expected data type')
    t.assert.strictEqual(data.toString(), 'At least 16 bytez', 'got expected data')
    nc.close()
  }).on('close', () => {
    t.assert.ok(true, 'server got expected close event')
  })

  const nc2 = new NetcatClient()
  nc2.udp().port(2102).wait(1000).out(concatDump).init().send('At least 16 bytez', '127.0.0.1').on('close', () => {
    t.assert.ok(true, 'client got expected close event')
  })
})

test('Server: traffic pipe filter()', (t) => {
  t.plan(1, { wait: 2000 })

  const toUpperCase = function (chunk, enc, cb) { // transform fn
    const out = chunk.toString().toUpperCase()
    this.push(Buffer.from(out))
    cb(null)
  }

  const srvGotData = concat((data) => {
    t.assert.strictEqual(data.toString(), 'CLIENT DATA', 'server got filtered data')
  })

  const nc = new NetcatServer()
  nc.udp().port(2099).filter(toUpperCase).wait(1000).pipe(srvGotData).listen()

  const nc2 = new NetcatClient()
  nc.on('close', () => {
    nc2.close()
  })
  nc2.udp().port(2099).init().wait(500).send('client data')
})

/*
// TODO: udp proxy (different port)
*/

test('UDP Client: b(dst) alias keeps the given destination', (t) => {
  t.plan(1)
  const nc = new NetcatServer().udp().b('192.168.1.255')
  t.assert.strictEqual(nc._destination, '192.168.1.255', 'destination set through the alias')
})

test('UDP Client receives many messages through data events only', (t) => {
  // regression test: once the unconsumed internal stream filled up, the client
  // was "paused" and every following message was dropped, 'data' events included
  t.plan(1, { wait: 5000 })

  const total = 100
  let received = 0
  const nc = new NetcatClient()
  nc.udp().port(2111).bind(2110).init()
    .on('data', (msg) => {
      if (++received === total) {
        t.assert.strictEqual(received, total, 'got every message')
        nc.close()
        sender.close()
      }
    })

  const sender = require('dgram').createSocket('udp4')
  let sent = 0
  const iv = setInterval(() => {
    sender.send(Buffer.alloc(1000, 97), 2110, '127.0.0.1')
    if (++sent === total) clearInterval(iv)
  }, 2)
})
