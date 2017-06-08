'use strict'

const test = require('tape')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client

test('UDP Server basic methods', function (t) {
  t.plan(7)

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
  t.plan(8)

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
  t.plan(3)
  t.timeoutAfter(5000)

  var nc = new NetcatServer()
  nc.udp().port(2100).listen().on('data', function (rinfo, data) {
    t.equal(rinfo.family, 'IPv4', 'Got expected IP version')
    t.ok(Buffer.isBuffer(data), 'got expected data type')
    t.equal(data.toString(), 'hello', 'got expected data')
    nc.close()
    nc2.close()
  })

  var nc2 = new NetcatClient()
  nc2.udp().port(2100).init().send('hello', '127.0.0.1')
})

/*

test('Client rx encoding utf8', function (t) {
  t.plan(3)
  t.timeoutAfter(3000)

  var nc = new NetcatServer()
  t.equal(nc._encoding, null, 'no encoding by default')

  // TODO

})

test('Send packet with loopback', function (t) {
  // TODO

})

test('Send a broadcast packet', function (t) {
  // TODO

  var nc2 = new NetcatClient()
  nc2.udp().port(2103).init().on('ready', function(){
    nc2.send('hello world', '127.0.0.1')
  })

})

test('Transfer a file (stream)', function (t) {
  // TODO

})

*/
