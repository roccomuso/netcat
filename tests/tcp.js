'use strict'

const test = require('tape')
const fs = require('fs')
const concat = require('concat-stream')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client

/*
Tests:
.listen()
double .listen() (EADDR in use expected)
*/

test('Client and Server constructor', function (t) {
  t.plan(2) // plan assertions

  try {
    var nc = new NetcatServer()
    var nc2 = new NetcatClient()
    t.ok(nc, 'Server constructor')
    t.ok(nc2, 'Client constructor')
  } catch (e) {
    t.fail(e)
  }

})

test('Server basic methods', function(t){
  t.plan(14)

  try {
    var nc = new NetcatServer()
    /* checking default values */
    t.equal(nc._port, null, 'port null by default')
    t.equal(nc._protocol, 'tcp', 'protocol is tcp by default')
    t.equal(nc._address, '0.0.0.0', '0.0.0.0 default address')
    t.equal(nc._keepalive, false, 'no keepalive')
    t.equal(Object.keys(nc._clients).length, 0, 'no clients')
    /* set methods */
    nc.udp()
    t.equal(nc._protocol, 'udp', 'setting udp as protocol')
    nc.tcp()
    t.equal(nc._protocol, 'tcp', 'setting tcp as protocol')
    nc.address('192.168.1.101')
    t.equal(nc._address, '192.168.1.101', 'setting address xxx')
    nc.addr('0.0.0.0')
    t.equal(nc._address, '0.0.0.0', 'using addr alias')
    nc.port(2389)
    t.equal(nc._port, 2389, 'setting port 2389')
    nc.keepalive()
    t.equal(nc._keepalive, true, 'set keepalive true')
    nc.k(false)
    t.equal(nc._keepalive, false, 'set keepalive false')
    nc.listen()
    t.ok(nc.server, 'server listen')
    nc.close(function(){
      t.ok(true, 'close server')
    })

  } catch (e) {
    t.fail(e)
  }

})

test('Client basic methods', function(t){
  t.plan(12)

  try {
    var srv = new NetcatServer().port(2390).listen() // server
    var nc = new NetcatClient()
    /* checking default values */
    t.equal(nc._port, null, 'port null by default')
    t.equal(nc._protocol, 'tcp', 'protocol is tcp by default')
    t.equal(nc._address, '127.0.0.1', '127.0.0.1 default address')
    t.equal(nc._interval, false, 'no interval by default')
    /* set methods */
    nc.udp()
    t.equal(nc._protocol, 'udp', 'setting udp as protocol')
    nc.tcp()
    t.equal(nc._protocol, 'tcp', 'setting tcp as protocol')
    nc.address('localhost')
    t.equal(nc._address, 'localhost', 'setting address localhost')
    nc.addr('127.0.0.1')
    t.equal(nc._address, '127.0.0.1', 'using addr alias')
    nc.port(2390)
    t.equal(nc._port, 2390, 'setting port 2390')
    nc.connect(function(){
      t.ok(nc.client, 'client connected')
      t.ok(nc.stream(), 'stream available')
      nc.close(function(){
        srv.close()
        t.ok(true, 'close server')
      })
    })

  } catch (e) {
    t.fail(e)
  }

})


test('TCP Client Server connection', function(t){
  t.plan(1)

  var nc = new NetcatServer()
  var nc2 = new NetcatClient()

  nc.port(2389).listen().on('data', function(socket, data){
    t.ok(socket.id, 'Socket got an ID assigned')
    t.equal(data.toString(), 'Hello World', 'Got expected string')
    close()
  })

  nc2.addr('127.0.0.1').port(2389).connect(function(){
    this.write('Hello World')
  })

  function close(){
    nc.close(function(){
      t.ok(true, 'close server')
    })
  }

})

/*
test('Client: send data', function(t){
  t.plan(1)
  // TODO: send raw (Buffer) data
  // TODO: send plain-text data

})

test('Receive file with pipe()', function(t){
  t.plan(1)

  var concatStream = concat(function(file){

  })

})

test('Serve a file with serve()', function(t){
  t.plan(1)
  nc.port(2389).k().listen().serve('Client.js').pipe(fs.createWriteStream('output.txt'))
})

test('Serving file with keepalive', function(t){
  t.plan(1)

})

test('Serving stream with keepalive', function(t){
  t.plan(1)

})

test('Concat multiple nc stream istances with serve()', function(t){
  t.plan(1)

})

*/
