'use strict'

const test = require('tape')
const fs = require('fs')
const os = require('os')
const path = require('path')
const concat = require('concat-stream')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client


test('UDP Server basic methods', function (t) {
  t.plan(6)

  var nc = new NetcatServer()
  t.equal(nc._protocol, 'tcp', 'protocol is tcp by default')

  // calling udp-only methods
  try {
    nc.send('hi')
    t.fail('cannot call udp-only methods in tcp mode')
  } catch (e) {
    t.ok(e, 'send() is udp only')
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

/*
test('Client basic methods', function (t) {
  // TODO

})

*/
