'use strict'

const fs = require('fs')
const path = require('path')
const concat = require('concat-stream')
const test = require('tape')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client

test('UDP Server basic methods', function (t) {
  t.plan(8)

  var nc = new NetcatServer()
  t.equal(nc._protocol, 'tcp', 'protocol is tcp by default')

  // calling udp-only methods
  try {
    nc.send('hi')
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'send() is udp only')
  }

  try {
    nc.loopback()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'loopback() is udp only')
  }

  try {
    nc.broadcast()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'broadcast() is udp only')
  }

  nc.udp()
  t.equal(nc._protocol, 'udp', 'setting udp as protocol')
  // calling tcp-only methods
  try {
    nc.getClients()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'getClients() is tcp only')
  }

  try {
    nc.proxy()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'proxy() is tcp only')
  }

  try {
    nc.listen()
    t.fail('port should be mandatory in UDP')
  } catch (e) {
    t.ok(e, 'port is mandatory')
  }
})

test('Client basic methods', function (t) {
  t.plan(9)

  var nc = new NetcatClient()
  t.equal(nc._protocol, 'tcp', 'protocol is tcp by default')

  // calling udp-only methods
  try {
    nc.init()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'init() is udp only')
  }

  try {
    nc.loopback()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'loopback() is udp only')
  }

  try {
    nc.destination()
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'destination() is udp only')
  }

  nc.udp()
  t.equal(nc._protocol, 'udp', 'setting udp as protocol')
  // calling tcp-only methods
  try {
    nc.connect()
    t.fail('cannot call tcp-only methods in udp mode')
  } catch (e) {
    t.ok(e, 'connect() is tcp only')
  }

  try {
    nc.retry()
    t.fail('cannot call tcp-only methods in udp mode')
  } catch (e) {
    t.ok(e, 'retry() is tcp only')
  }

  try {
    nc.end()
    t.fail('cannot call tcp-only methods in udp mode')
  } catch (e) {
    t.ok(e, 'end() is tcp only')
  }

  try {
    nc.init()
    t.fail('port should be mandatory in UDP')
  } catch (e) {
    t.ok(e, 'port is mandatory')
  }
})

test('Server listen and client send packets', function (t) {
  t.plan(5)
  t.timeoutAfter(5000)

  var nc = new NetcatServer()
  nc.udp().port(2100).listen().on('data', function (rinfo, data) {
    t.equal(rinfo.family, 'IPv4', 'got expected IP version')
    t.ok(Buffer.isBuffer(data), 'got expected data type')
    t.equal(data.toString(), 'hello', 'got expected data')
    nc.close()
  }).on('close', function () {
    t.ok(true, 'server got expected close event')
  })

  var nc2 = new NetcatClient()
  nc2.udp().port(2100).wait(1000).init().send('hello', '127.0.0.1').on('close', function () {
    t.ok(true, 'client got expected close event')
  })
})

test('Server rx encoding utf8', function (t) {
  t.plan(4)
  t.timeoutAfter(3000)

  var nc = new NetcatServer()
  t.equal(nc._encoding, null, 'no encoding by default')

  nc.udp().enc('utf8').port(2101).listen().on('data', function (rinfo, data) {
    t.equal(nc._encoding, 'utf8', 'server got expected encoding set')
    t.equal(typeof data, 'string', 'got expected data type')
    t.equal(data, 'hello', 'server got expected data')
    nc.close()
    nc2.close()
  })

  var nc2 = new NetcatClient()
  nc2.udp().port(2101).init().send('hello', '127.0.0.1')
})

test('Server sending a packet with loopback', function (t) {
  t.plan(4)
  t.timeoutAfter(3000)

  var nc = new NetcatServer()
  t.equal(nc._loopback, false, 'no loopback by default')
  nc.udp().port(2103).serve(Buffer.from('hello myself')).on('data', function (rinfo, msg) {
    t.fail('got unexpected msg')
  }).listen()

  var nc2 = new NetcatServer()
  nc2.udp().port(2104).loopback().wait(1000).serve(Buffer.from('hello myself')).on('data', function (rinfo, msg) {
    t.equal(nc2._loopback, true, 'loopback is true')
    t.ok(rinfo.loopback, 'got loopback msg')
    t.equal(msg.toString(), 'hello myself', 'got expected loopback msg')
    nc.close()
  }).listen()
})

test('Transfer a file (stream)', function (t) {
  t.plan(2)
  t.timeoutAfter(5000)

  var nc = new NetcatServer()
  var testFile = path.join(__dirname, 'udp.js')
  var inputFile = fs.readFileSync(testFile)

  var concatStream = concat(function (file) {
    t.equal(file.toString(), inputFile.toString(), 'server got expected file')
  })

  // waitTime to close after 1 sec of inactivity since the last msg
  nc.udp().port(2105).wait(1000).listen().pipe(concatStream)
    .on('close', function () {
      t.ok(true, 'server closed event')
      nc2.close()
    })

  var nc2 = new NetcatClient()
  nc2.udp().destination('127.0.0.1').port(2105).init()
  fs.createReadStream(testFile).pipe(nc2.stream())
})

test('Server: listen and sending on different ports', function (t) {
  t.timeoutAfter(5000)
  t.plan(7)

  var nc2 = new NetcatServer()
  nc2.udp().enc('utf8').bind(2107).port(2108).on('data', function (rinfo, msg) {
    t.equal(rinfo.port, 2108, 'got exptected inc. port')
    t.equal(typeof msg, 'string', 'got expected data type')
    t.equal(msg, 'ping', 'got expected data')
    nc2.send('pong')
  }).listen() // listen on 2107 and send on 2108

  var nc3 = new NetcatServer()
  nc3.udp().bind(2108).port(2107).on('data', function (rinfo, msg) {
    t.equal(rinfo.port, 2107, 'got exptected inc. port')
    t.ok(Buffer.isBuffer(msg), 'got expected data type')
    t.equal(msg.toString(), 'pong', 'got response data')
    nc3.close()
    nc2.close()
  }).on('ready', function () {
    nc3.send('ping')
    t.ok(true, 'ready event fired')
  }).listen() // listen on 2108 and send on 2107
})

test('Bridge: TCP -> UDP', function (t) {
  t.plan(7)
  t.timeoutAfter(5000)

  // nc4 (tcp-client) <-> nc (tcp-server|udp-bridge) <-> nc2 (udp-server) <-> nc3 (udp-server)

  var nc2 = new NetcatServer()
  nc2.udp().wait(1000).bind(2107).port(2108).listen()

  var nc3 = new NetcatServer()
  nc3.udp().wait(1000).bind(2108).port(2107).on('data', function (rinfo, msg) {
    t.equal(rinfo.port, 2107, 'got exptected inc. port')
    t.ok(Buffer.isBuffer(msg), 'got expected data type')
    t.equal(msg.toString(), 'ping', 'UDP got expected ping')
    nc3.send('pong')
  }).listen()

  var nc = new NetcatServer()
  nc.k().port(2100).proxy(nc2.server).on('data', function (sock, msg) {
    t.ok(Buffer.isBuffer(msg), 'got expected data type')
    t.equal(msg.toString(), 'ping', 'TCP got expected ping')
  }).listen()

  setTimeout(function () {
    var nc4 = new NetcatClient()
    nc4.port(2100).connect().send(Buffer.from('ping')).on('data', function (msg) {
      t.ok(Buffer.isBuffer(msg), 'got expected data type')
      t.equal(msg.toString(), 'pong', 'TCP got expected pong')
      nc4.close()
      nc.close()
    })
  }, 1500)
})

test('Server hex dump - output()', function (t) {
  t.plan(7)
  t.timeoutAfter(5000)

  var concatDump = concat(function (dump) {
    console.log(dump.toString())
    t.ok(dump.toString().indexOf('<') !== -1, 'got incoming hex dump')
    t.ok(dump.toString().indexOf('>') !== -1, 'got outcoming hex dump')
  })

  var nc = new NetcatServer()
  nc.udp().port(2102).out(concatDump).serve(Buffer.from('hello from the server')).listen().on('data', function (rinfo, data) {
    t.equal(rinfo.family, 'IPv4', 'got expected IP version')
    t.ok(Buffer.isBuffer(data), 'got expected data type')
    t.equal(data.toString(), 'At least 16 bytez', 'got expected data')
    nc.close()
  }).on('close', function () {
    t.ok(true, 'server got expected close event')
  })

  var nc2 = new NetcatClient()
  nc2.udp().port(2102).wait(1000).init().send('At least 16 bytez', '127.0.0.1').on('close', function () {
    t.ok(true, 'client got expected close event')
  })
})

test('Client hex dump', function (t) {
  t.plan(6)
  t.timeoutAfter(5000)

  var concatDump = concat(function (dump) {
    console.log(dump.toString())
    t.ok(dump.toString().indexOf('>') !== -1, 'got outcoming hex dump')
  })

  var nc = new NetcatServer()
  nc.udp().port(2102).listen().on('data', function (rinfo, data) {
    t.equal(rinfo.family, 'IPv4', 'got expected IP version')
    t.ok(Buffer.isBuffer(data), 'got expected data type')
    t.equal(data.toString(), 'At least 16 bytez', 'got expected data')
    nc.close()
  }).on('close', function () {
    t.ok(true, 'server got expected close event')
  })

  var nc2 = new NetcatClient()
  nc2.udp().port(2102).wait(1000).out(concatDump).init().send('At least 16 bytez', '127.0.0.1').on('close', function () {
    t.ok(true, 'client got expected close event')
  })
})

test('Server: traffic pipe filter()', function (t) {
  t.plan(1)
  t.timeoutAfter(2000)

  var toUpperCase = function (chunk, enc, cb) { // transform fn
    var out = chunk.toString().toUpperCase()
    this.push(Buffer.from(out))
    cb(null)
  }

  var srvGotData = concat(function (data) {
    t.equal(data.toString(), 'CLIENT DATA', 'server got filtered data')
  })

  var nc = new NetcatServer()
  nc.udp().port(2099).filter(toUpperCase).wait(1000).pipe(srvGotData).listen()

  var nc2 = new NetcatClient()
  nc2.udp().port(2099).init().wait(500).send('client data')
})

/*
// TODO: udp proxy (different port)
*/
