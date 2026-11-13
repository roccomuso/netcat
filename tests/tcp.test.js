'use strict'

const test = require('node:test')
const fs = require('fs')
const os = require('os')
const net = require('net')
const stream = require('stream')
const { concat } = require('./helpers')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client

test('Client and Server constructor', (t) => {
  t.plan(2) // plan assertions

  try {
    const nc = new NetcatServer()
    const nc2 = new NetcatClient()
    t.assert.ok(nc, 'Server constructor')
    t.assert.ok(nc2, 'Client constructor')
  } catch (e) {
    t.assert.fail(e)
  }
})

test('Server basic methods', (t) => {
  t.plan(17, { wait: 5000 })

  try {
    const nc = new NetcatServer()
    const ncVerbose = new NetcatServer({ verbose: true })
    const ncQuiet = new NetcatServer()
    t.assert.notStrictEqual(ncVerbose.debug, ncQuiet.debug, 'verbose debug does not leak to other server instances')
    /* checking default values */
    t.assert.strictEqual(nc._port, null, 'port null by default')
    t.assert.strictEqual(nc._protocol, 'tcp', 'protocol is tcp by default')
    t.assert.strictEqual(nc._address, '0.0.0.0', '0.0.0.0 default address')
    t.assert.strictEqual(nc._keepalive, false, 'no keepalive')
    t.assert.strictEqual(Object.keys(nc._clients).length, 0, 'no clients')
    t.assert.ok(nc._filter, 'filter is a passthrough stream')
    /* set methods */
    nc.udp()
    t.assert.strictEqual(nc._protocol, 'udp', 'setting udp as protocol')
    nc.tcp()
    t.assert.strictEqual(nc._protocol, 'tcp', 'setting tcp as protocol')
    nc.address('192.168.1.101')
    t.assert.strictEqual(nc._address, '192.168.1.101', 'setting address xxx')
    nc.addr('0.0.0.0')
    t.assert.strictEqual(nc._address, '0.0.0.0', 'using addr alias')
    nc.port(2389)
    t.assert.strictEqual(nc._port, 2389, 'setting port 2389')
    nc.keepalive()
    t.assert.strictEqual(nc._keepalive, true, 'set keepalive true')
    nc.k(false)
    t.assert.strictEqual(nc._keepalive, false, 'set keepalive false')
    nc.exec('/bin/sh')
    t.assert.strictEqual(nc._exec, '/bin/sh', 'setting exec to /bin/sh')
    nc.exec(null)

    nc.listen()
    t.assert.ok(nc.server, 'server listen')
    nc.close(() => {
      t.assert.ok(true, 'close server')
    })
  } catch (e) {
    console.log(e)
    t.assert.fail(e)
  }
})

test('Client basic methods', (t) => {
  t.plan(18, { wait: 5000 })

  try {
    const srv = new NetcatServer().port(2390).listen() // server
    const nc = new NetcatClient()
    const ncVerbose = new NetcatClient({ verbose: true })
    const ncQuiet = new NetcatClient()
    t.assert.notStrictEqual(ncVerbose.debug, ncQuiet.debug, 'verbose debug does not leak to other client instances')
    /* checking default values */
    t.assert.strictEqual(nc._port, null, 'port null by default')
    t.assert.strictEqual(nc._protocol, 'tcp', 'protocol is tcp by default')
    t.assert.strictEqual(nc._address, '127.0.0.1', '127.0.0.1 default address')
    t.assert.strictEqual(nc._interval, false, 'no interval by default')
    t.assert.ok(nc._filter, 'filter is a passthrough stream')
    /* set methods */
    nc.udp()
    t.assert.strictEqual(nc._protocol, 'udp', 'setting udp as protocol')
    nc.tcp()
    t.assert.strictEqual(nc._protocol, 'tcp', 'setting tcp as protocol')
    nc.address('localhost')
    t.assert.strictEqual(nc._address, 'localhost', 'setting address localhost')
    nc.addr('127.0.0.1')
    t.assert.strictEqual(nc._address, '127.0.0.1', 'using addr alias')
    nc.port(2390)
    t.assert.strictEqual(nc._port, 2390, 'setting port 2390')
    nc.retry(0)
    t.assert.strictEqual(nc._retry, 0, 'setting retry to 0')
    nc.exec('/bin/sh')
    t.assert.strictEqual(nc._exec, '/bin/sh', 'setting exec to /bin/sh')
    nc.exec(null)
    t.assert.doesNotThrow(() => {
      new NetcatClient().close()
    }, 'closing before connect is safe')

    nc.connect(() => {
      t.assert.ok(nc.client, 'client connected')
      t.assert.ok(nc.stream(), 'stream available')
      nc.close(() => {
        t.assert.ok(true, 'close client')
        srv.close(() => {
          t.assert.ok(true, 'close server')
        })
      })
    })
  } catch (e) {
    console.log(e)
    t.assert.fail(e)
  }
})

test('TCP Client Server connection', (t) => {
  t.plan(4, { wait: 5000 })

  const nc = new NetcatServer()
  const nc2 = new NetcatClient()

  nc.port(2391).listen().on('data', (socket, data) => {
    t.assert.ok(socket.id, 'Socket got an ID assigned')
    t.assert.strictEqual(data.toString(), 'Hello World', 'got expected string')
    close()
  })

  nc2.addr('127.0.0.1').port(2391).connect(function () {
    t.assert.strictEqual(this, nc2, 'Got client instance')
    console.log('Sending message')
    this.send('Hello World')
  })

  function close () {
    nc.close(() => {
      t.assert.ok(true, 'close server')
    })
  }
})

test('Client: send raw buffer', (t) => {
  t.plan(5, { wait: 4000 })

  const nc = new NetcatServer()
  const nc2 = new NetcatClient()

  nc.port(2291).listen().on('data', (socket, data) => {
    t.assert.ok(socket.id, 'Socket got an ID assigned')
    t.assert.ok(Buffer.isBuffer(data), 'got expected data type (Buffer)')
    t.assert.deepStrictEqual(data, Buffer.from('hello world'), 'got expected data')
    close()
  })

  nc2.addr('127.0.0.1').port(2291).connect(function () {
    t.assert.strictEqual(this, nc2, 'Got client instance')
    console.log('Sending Buffer')
    this.send(Buffer.from('hello world'))
  })

  function close () {
    nc.close(() => {
      t.assert.ok(true, 'close server')
    })
  }
})

test('Test different data Encoding', (t) => {
  t.plan(14, { wait: 4000 })

  const nc = new NetcatServer()
  const nc2 = new NetcatClient()
  const nc3 = new NetcatServer()
  const nc4 = new NetcatClient()

  // server utf8
  nc.port(2387).enc('utf8').serve(Buffer.from('pong')).listen().on('data', (socket, data) => {
    t.assert.strictEqual(socket.remoteAddress, '127.0.0.1', 'got exptected remote addr')
    t.assert.strictEqual(typeof data, 'string', 'got expected data type (utf8)')
    t.assert.strictEqual(data, 'hello world', 'got expected data')
    close(nc)
  })

  // client Buffer
  nc2.port(2387).connect(function () {
    t.assert.strictEqual(this, nc2, 'Got client instance')
    this.send(Buffer.from('hello world'))
  }).on('data', (d) => {
    t.assert.ok(Buffer.isBuffer(d), 'client: got exptected data type (Buffer)')
    t.assert.strictEqual('pong', d.toString(), 'client: got exptected data')
  })

  // server hex
  nc3.port(2388).enc('hex').serve(Buffer.from('foo')).listen().on('data', (socket, data) => {
    t.assert.strictEqual(socket.remoteAddress, '127.0.0.1', 'got exptected remote addr')
    t.assert.strictEqual(typeof data, 'string', 'got expected data type (hex)')
    t.assert.strictEqual(data, Buffer.from('hello world').toString('hex'), 'got expected data')
    close(nc3)
  })

  // client hex
  nc4.port(2388).enc('hex').connect(function () {
    t.assert.strictEqual(this, nc4, 'Got client instance')
    this.send(Buffer.from('hello world'))
  }).on('data', (d) => {
    t.assert.strictEqual(typeof d, 'string', 'client: got exptected data type (hex)')
    t.assert.strictEqual(d, Buffer.from('foo').toString('hex'), 'client: got exptected data')
  })

  function close (nc) {
    nc.close(() => {
      t.assert.ok(true, 'close server')
    })
  }
})

test('Transfer a file (stream)', (t) => {
  t.plan(2, { wait: 4000 })

  const nc = new NetcatServer()
  const testFile = __filename
  const inputFile = fs.readFileSync(testFile)

  const concatStream = concat((file) => {
    t.assert.strictEqual(file.toString(), inputFile.toString(), 'server got expected file')
  })

  nc.port(2191).listen().pipe(concatStream).on('close', () => {
    t.assert.ok(true, 'server closed (no keepalive)')
  })

  const nc2 = new NetcatClient()
  fs.createReadStream(testFile).pipe(nc2.addr('127.0.0.1').port(2191).connect().stream())
})

test('Serving a file with serve()', (t) => {
  t.plan(2, { wait: 4000 })

  const testFile = __filename
  const inputFile = fs.readFileSync(testFile)

  const nc = new NetcatServer()
  nc.port(2392).listen().serve(testFile).on('close', () => {
    t.assert.ok(true, 'server closed (no keepalive)')
  })

  const concatStream = concat((file) => {
    t.assert.strictEqual(file.toString(), inputFile.toString(), 'client got expected file')
  })

  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').port(2392).connect().pipe(concatStream)
})

test('Client output() hex dump', (t) => {
  t.plan(4, { wait: 4000 })

  const nc = new NetcatServer()

  const concatDump = concat((dump) => {
    console.log(dump.toString())
    t.assert.ok(dump.toString().indexOf('<') !== -1, 'got incoming hex dump')
    t.assert.ok(dump.toString().indexOf('>') !== -1, 'got outcoming hex dump')
  })

  let flag = true
  nc.port(2091).listen().on('close', () => {
    t.assert.ok(true, 'server closed')
  }).on('data', (sock, msg) => {
    if (flag) {
      sock.write('ciao ciao')
      t.assert.ok(true, 'server replied to the client sock')
      flag = false
    }
  })

  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').wait(1500).out(concatDump).port(2091).connect().send('At least 16 bytez')
})

test('Server output() hex dump', (t) => {
  t.plan(7, { wait: 4000 })

  const nc = new NetcatServer()

  const concatDump = concat((dump) => {
    console.log(dump.toString())
    t.assert.ok(dump.toString().indexOf('<') !== -1, 'got incoming hex dump')
    t.assert.ok(dump.toString().indexOf('>') !== -1, 'got outcoming hex dump')
    nc.close()
  })

  let flag = true
  nc.port(2092).k().out(concatDump).listen().on('close', () => {
    t.assert.ok(true, 'server closed')
  }).on('data', (sock, msg) => {
    t.assert.strictEqual(msg.toString(), 'Data coming from the client', 'got data from client')
    if (flag) {
      sock.write('At least 16 bytez of data')
      t.assert.ok(true, 'server replied to the client sock')
      flag = false
    }
    nc.close()
  })

  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').wait(1500).port(2092).connect().send('Data coming from the client').on('data', (d) => {
    t.assert.strictEqual(d.toString(), 'At least 16 bytez of data', 'client got right response')
  })
})

test('Serving a file using keepalive to multiple clients', (t) => {
  const nClients = 10 // 10 clients
  t.plan(nClients + 1, { wait: 5000 })
  let k = 0

  const testFile = __filename
  const inputFile = fs.readFileSync(testFile)

  const nc = new NetcatServer()
  nc.port(2393).keepalive().listen().serve(testFile)

  const NCs = {}
  for (let i = 0; i < nClients; i++) {
    NCs[i] = new NetcatClient()
    NCs[i].addr('127.0.0.1').port(2393).connect().pipe(concat((file) => {
      t.assert.strictEqual(file.toString(), inputFile.toString(), 'client got expected file')
      if (++k === nClients) {
        nc.close(() => {
          t.assert.ok(true, 'server closed')
        })
      }
    }))
  }
})

test('Serving an instance of stream', (t) => {
  t.plan(2, { wait: 4000 })

  const testFile = __filename
  const inputFile = fs.readFileSync(testFile)
  const inputStream = fs.createReadStream(testFile)

  const nc = new NetcatServer()
  nc.port(2492).listen().serve(inputStream).on('close', () => {
    t.assert.ok(true, 'server closed (no keepalive)')
  })

  const concatStream = concat((file) => {
    t.assert.strictEqual(file.toString(), inputFile.toString(), 'client got expected stream')
  })

  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').port(2492).connect().pipe(concatStream)
})

test('Serving a stream using keepalive to multiple clients', (t) => {
  const nClients = 10 // 10 clients
  t.plan(nClients * 2 + 1, { wait: 5000 })
  let k = 0

  const testFile = __filename
  const inputFile = fs.readFileSync(testFile)
  const inputStream = fs.createReadStream(testFile)

  const nc = new NetcatServer()
  nc.port(2394).k().listen().serve(inputStream).on('clientClose', (socket) => {
    t.assert.ok(socket, 'socket client close event catched')
  })

  const NCs = {}
  for (let i = 0; i < nClients; i++) {
    NCs[i] = new NetcatClient()
    NCs[i].addr('127.0.0.1').port(2394).connect().pipe(concat((file) => {
      t.assert.strictEqual(file.toString(), inputFile.toString(), 'client got expected file')
      if (++k === nClients) {
        nc.close(() => {
          t.assert.ok(true, 'server closed')
        })
      }
    }))
  }
})

test('Serving a raw Buffer', (t) => {
  t.plan(2, { wait: 4000 })

  const nc = new NetcatServer()
  nc.port(2592).listen().serve(Buffer.from('Hello World')).on('close', () => {
    t.assert.ok(true, 'server closed (no keepalive)')
  })

  const concatStream = concat((buf) => {
    t.assert.strictEqual(buf.toString(), 'Hello World', 'client got expected Buffer')
  })

  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').port(2592).connect().pipe(concatStream)
})

test('Server waitTime parameter', (t) => {
  t.plan(6, { wait: 4000 })

  const nc = new NetcatServer()
  nc.port(2593).k().wait(1000).listen().serve(Buffer.from('Hello World')).on('waitTimeout', () => {
    t.assert.ok(true, 'server closed (by waitTime)')
  }).on('close', () => {
    t.assert.ok(true, 'server got close event')
  }).on('data', (sock, buf) => {
    t.assert.ok(sock, 'got socket instance')
    t.assert.strictEqual(buf.toString(), 'yoyo', 'got expected data from client')
  })

  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').port(2593).connect().send('yoyo').on('data', (d) => {
    t.assert.strictEqual(d.toString(), 'Hello World', 'got expected data from server')
  }).on('close', () => {
    t.assert.ok(true, 'client got close event (because server closed)')
  })
})

test('Client waitTime parameter', (t) => {
  t.plan(6, { wait: 4000 })

  const nc = new NetcatServer()
  nc.port(2594).k().listen().serve(Buffer.from('Hello World')).on('waitTimeout', () => {
    t.assert.fail('server should not be closed by waitTime')
  }).on('close', () => {
    t.assert.ok(true, 'server got close event')
  }).on('data', (sock, buf) => {
    t.assert.ok(sock, 'got socket instance')
    t.assert.strictEqual(buf.toString(), 'yoyo', 'got expected data from client')
  })

  // client close after 2 sec of inactivity
  const nc2 = new NetcatClient()
  nc2.addr('127.0.0.1').wait(2000).port(2594).connect().send('yoyo').on('data', (d) => {
    t.assert.strictEqual(d.toString(), 'Hello World', 'got expected data from server')
  }).on('waitTimeout', () => {
    t.assert.ok(true, 'client closed (by waitTime)')
    nc.close()
  }).on('close', () => {
    t.assert.ok(true, 'client got close event')
  })
})

test('Server exec()', (t) => {
  t.plan(3, { wait: 5000 })

  const cmd = (os.platform() === 'win32') ? 'cat.exe' : 'cat'
  const opts = (os.platform() === 'win32') ? { cwd: __dirname } : {}

  const nc = new NetcatServer()
  nc.port(2400).listen()
    .exec(cmd, null, opts)
    .on('close', () => {
      t.assert.ok(true, 'server closed (no keepalive)')
    })
  t.assert.strictEqual(nc._exec, cmd, 'spawning process')

  const nc2 = new NetcatClient()
  nc2.port(2400).connect(() => {
    setTimeout(() => nc2.send('Hello World'), 1000)
  }).on('data', (buf) => { // one chunk
    t.assert.strictEqual(buf.toString(), 'Hello World', 'got expected stdout')
    nc2.close()
  })
})

test('Server exec() with an already-ended served stream', (t) => {
  // regression test: nc CLI always calls .serve(process.stdin); in a
  // non-interactive context stdin ends immediately, which used to end the
  // socket before the exec'd child's output could be written to it
  t.plan(1, { wait: 5000 })

  const cmd = (os.platform() === 'win32') ? 'echo.exe' : 'echo'
  const args = (os.platform() === 'win32') ? [] : ['hello from exec']
  const opts = (os.platform() === 'win32') ? { cwd: __dirname } : {}

  const emptyStream = new stream.PassThrough()
  emptyStream.end() // simulate a closed/non-interactive stdin

  const nc = new NetcatServer()
  nc.port(2402).listen().serve(emptyStream).exec(cmd, args, opts)

  const nc2 = new NetcatClient()
  nc2.port(2402).connect().on('data', (buf) => {
    t.assert.strictEqual(buf.toString().trim(), 'hello from exec', 'got exec output despite the served stream ending immediately')
    nc2.close()
    nc.close()
  })
})

test('Client exec()', (t) => {
  t.plan(5, { wait: 5000 })

  const cmd = (os.platform() === 'win32') ? 'cat.exe' : 'cat'
  const opts = (os.platform() === 'win32') ? { cwd: __dirname } : null

  const nc = new NetcatServer()
  nc.port(2401).listen()
    .once('connection', (socket) => {
      t.assert.ok(socket, 'client connected')
      socket.write('Hello World')
    })
    .once('data', (sock, buf) => { // one chunk
      t.assert.ok(sock, 'got socket instance')
      t.assert.strictEqual(buf.toString(), 'Hello World', 'got expected stdout')
      nc.close()
    })
    .once('close', () => {
      t.assert.ok(true, 'server closed (no keepalive)')
    })

  const nc2 = new NetcatClient()
  nc2.port(2401).exec(cmd, null, opts).connect()
  t.assert.strictEqual(nc2._exec, cmd, 'exec set')
})

test('Client retry() connections', (t) => {
  let iteration = 12
  t.plan(iteration * 4, { wait: 4000 })

  const clientGotData = new stream.Transform({
    transform (chunk, enc, next) {
      t.assert.strictEqual(chunk.toString(), 'test data from server', 'client got data')
      next(null, chunk)
    }
  })

  const nc = new NetcatServer()
  nc.k().port(2403).listen().serve(Buffer.from('test data from server')).on('data', (socket, data) => {
    t.assert.strictEqual(data.toString(), 'test data from client', 'server got data')
    if (--iteration > 0) {
      socket.destroy() // disconnect client
    } else {
      nc.close()
      nc2.close()
    }
  })

  const nc2 = new NetcatClient()
  nc2.port(2403).retry(150).connect(function () {
    this.send('test data from client')
    t.assert.ok(this, 'client connected')
  }).pipe(clientGotData).on('close', function () {
    t.assert.ok(this, 'client disconnected')
  })
})

test('Server/Client: traffic pipe filter()', (t) => {
  t.plan(2, { wait: 2000 })

  const toUpperCase = function (chunk, enc, cb) { // transform fn
    const out = chunk.toString().toUpperCase()
    this.push(Buffer.from(out))
    cb(null)
  }

  const srvGotData = concat((data) => {
    t.assert.strictEqual(data.toString(), 'CLIENT DATA', 'server got filtered data')
  })

  const nc = new NetcatServer()
  nc.port(2402).filter(toUpperCase).serve(Buffer.from('server data')).pipe(srvGotData).listen()

  const clientGotData = concat((data) => {
    t.assert.strictEqual(data.toString(), 'SERVER DATA', 'client got filtered data')
  })

  const nc2 = new NetcatClient()
  nc2.port(2402).filter(toUpperCase).connect(function () {
    this.send('client data')
  }).pipe(clientGotData)
})

/*
// BUG: filters not applied on the emitted data. Because of github.com/roccomuso/netcat/issues/4
test('Server/Client: traffic on data filter()', function (t) {
  t.plan(2, { wait: 2000 })

  const toUpperCase = function (chunk, enc, cb) { // transform fn
    const out = chunk.toString().toUpperCase()
    this.push(Buffer.from(out))
    cb(null)
  }

  const nc = new NetcatServer()
  nc.port(2402).filter(toUpperCase).serve(Buffer.from('server data')).on('data', function (socket, data) {
    t.assert.strictEqual(data.toString(), 'CLIENT DATA', 'server got filtered data')
    nc.close()
  }).listen()

  const nc2 = new NetcatClient()
  nc2.port(2402).filter(toUpperCase).connect(function () {
    this.send('client data')
  }).on('data', function (data) {
    t.assert.strictEqual(data.toString(), 'SERVER DATA', 'client got filtered data')
  })
})
*/

test('Proxy server', (t) => {
  t.plan(1, { wait: 5000 })

  const nc = new NetcatServer()
  const nc2 = new NetcatClient()
  const srv = new NetcatServer()
  const client = new NetcatClient()

  // target server
  srv.port(2222).serve(Buffer.from('Cool stuff')).listen()
  // proxy server
  nc2.addr('127.0.0.1').port(2222).connect()
  nc.port(8080).k().listen().proxy(nc2.stream())
  // client
  client.addr('127.0.0.1').port(8080).connect().on('data', (d) => {
    t.assert.strictEqual(d.toString(), 'Cool stuff', 'got expected data from proxy server')
    client.close()
    nc.close()
    nc2.close()
    srv.close()
  })
})

test('Port scan', (t) => {
  t.plan(7, { wait: 5000 })

  // spawn a few servers
  const nc = new NetcatServer().port(3001).listen()
  const nc2 = new NetcatServer().port(3002).listen()
  const nc3 = new NetcatServer().port(3003).listen()

  // scan ports
  const client = new NetcatClient()
  client.tcp().addr('127.0.0.1').scan('3001-3006', (ports) => {
    t.assert.strictEqual(Object.keys(ports).length, 6, 'got expected number of ports')
    t.assert.strictEqual(ports['3001'], 'open', 'expect 3001 port to be open')
    t.assert.strictEqual(ports['3002'], 'open', 'expect 3002 port to be open')
    t.assert.strictEqual(ports['3003'], 'open', 'expect 3003 port to be open')
    t.assert.strictEqual(ports['3004'], 'closed', 'expect 3004 port to be closed')
    t.assert.strictEqual(ports['3005'], 'closed', 'expect 3005 port to be closed')
    t.assert.strictEqual(ports['3006'], 'closed', 'expect 3006 port to be closed')
    nc.close()
    nc2.close()
    nc3.close()
  })
})

test('Port scan: closed ports followed by an open one', (t) => {
  // regression test: closed-port scans used to leave a dangling 'connect'
  // listener on the shared client, which a later successful connect would
  // spuriously re-trigger, mislabeling earlier closed ports as 'open'
  t.plan(2, { wait: 5000 })

  const nc = new NetcatServer().port(3106).listen()

  const client = new NetcatClient()
  client.tcp().addr('127.0.0.1').scan('3101-3106', (ports) => {
    t.assert.deepStrictEqual(
      ports,
      { 3101: 'closed', 3102: 'closed', 3103: 'closed', 3104: 'closed', 3105: 'closed', 3106: 'open' },
      'each port reported independently, with no leaked "open" results'
    )
    t.assert.strictEqual(Object.keys(ports).indexOf('undefined'), -1, 'no undefined key from a missing err.port')
    nc.close()
  })
})

test('Client receives a large payload through data events only', (t) => {
  // regression test for issue #11: without pipe(), the internal filter was
  // never drained, backpressure paused the socket and 'data' stopped at ~128KB
  t.plan(1, { wait: 5000 })

  const total = 5 * 1024 * 1024
  const nc = new NetcatServer().port(3201).listen().serve(Buffer.alloc(total, 97))

  let received = 0
  const client = new NetcatClient()
  client.addr('127.0.0.1').port(3201).connect()
    .on('data', (chunk) => { received += chunk.length })
    .on('close', () => {
      t.assert.strictEqual(received, total, 'received the whole payload')
      nc.close()
    })
})

test('Server receives a large payload through data events only', (t) => {
  t.plan(1, { wait: 5000 })

  const total = 5 * 1024 * 1024
  let received = 0
  const nc = new NetcatServer()
  nc.port(3202).listen()
    .on('data', (socket, chunk) => { received += chunk.length })
    .on('close', () => {
      t.assert.strictEqual(received, total, 'received the whole payload')
    })
    .on('ready', () => {
      new NetcatClient().addr('127.0.0.1').port(3202).connect().end(Buffer.alloc(total, 97))
    })
})

test('Server: a later serve() replaces the previous input', (t) => {
  t.plan(1, { wait: 3000 })

  const nc = new NetcatServer()
  nc.port(3203).serve(__filename).serve(Buffer.from('from buffer')).listen()
    .on('ready', () => {
      new NetcatClient().addr('127.0.0.1').port(3203).connect()
        .pipe(concat((buf) => {
          t.assert.strictEqual(buf.toString(), 'from buffer', 'the buffer is served, not the file')
          nc.close()
        }))
    })
})

test('Port scan: several open ports sending data, reusing the client afterwards', (t) => {
  // each probe uses its own socket: open ports that send data (or keep the
  // connection open) must not leak into the client's stream, filter or events
  t.plan(4, { wait: 5000 })

  const servers = [3301, 3303, 3305].map((port) =>
    new NetcatServer().k().port(port).listen().serve(Buffer.from('banner ' + port)))

  const client = new NetcatClient()
  client.on('data', () => t.assert.fail('scan data must not reach the client'))
  const start = Date.now()
  client.addr('127.0.0.1').interval(100).scan('3301-3305', (ports) => {
    t.assert.deepStrictEqual(ports, { 3301: 'open', 3302: 'closed', 3303: 'open', 3304: 'closed', 3305: 'open' }, 'open and closed ports')
    t.assert.ok(Date.now() - start >= 400, 'interval() waits between ports')
    client.removeAllListeners('data')
    client.interval(0).port(3303).connect()
      .pipe(concat((buf) => {
        t.assert.strictEqual(buf.toString(), 'banner 3303', 'client still works after a scan')
        servers.forEach((s) => s.close())
      }))
      .on('connect', () => client.end())
    t.assert.throws(() => client.scan('a-b'), /invalid ports range/, 'invalid range throws synchronously')
  })
})

test('Server: served stream cache is dropped past serveCacheLimit', (t) => {
  t.plan(2, { wait: 5000 })

  const input = new stream.PassThrough()
  const nc = new NetcatServer({ serveCacheLimit: 10 })
  nc.k().port(3311).listen().serve(input).on('ready', () => {
    new NetcatClient().addr('127.0.0.1').port(3311).connect().pipe(concat((buf) => {
      t.assert.strictEqual(buf.toString(), 'early data, more than 10 bytes|late data', 'first client got everything')
    }))
    setTimeout(() => {
      input.write('early data, more than 10 bytes|')
      setTimeout(() => {
        new NetcatClient().addr('127.0.0.1').port(3311).connect().pipe(concat((buf) => {
          t.assert.strictEqual(buf.toString(), 'late data', 'late client only got the data still to come')
          nc.close()
        }))
        setTimeout(() => input.end('late data'), 200)
      }, 200)
    }, 200)
  })
})

test('Client: waitTime() is reset by incoming traffic too', (t) => {
  t.plan(2, { wait: 5000 })

  let sent = 0
  const nc = new NetcatServer()
  nc.port(3321).listen().on('connection', (socket) => {
    const iv = setInterval(() => {
      if (++sent > 5) return clearInterval(iv)
      socket.write('tick')
    }, 200)
  })

  const start = Date.now()
  const client = new NetcatClient()
  client.addr('127.0.0.1').port(3321).wait(500).connect()
    .on('data', () => {})
    .on('waitTimeout', () => {
      t.assert.ok(sent > 5, 'no timeout while the server keeps sending')
      t.assert.ok(Date.now() - start >= 1200, 'timed out only after the traffic stopped')
      nc.close()
    })
})

test('Client: error event, but no error while retrying', (t) => {
  t.plan(2, { wait: 5000 })

  new NetcatClient().addr('127.0.0.1').port(3331).connect()
    .on('error', (err) => t.assert.strictEqual(err.code, 'ECONNREFUSED', 'connection refused emits error'))

  const retrying = new NetcatClient()
  retrying.addr('127.0.0.1').port(3332).retry(100).connect()
    .on('error', () => t.assert.fail('no error while retrying'))
    .on('connect', () => {
      t.assert.ok(true, 'connected once the server was up')
      retrying.close(() => nc.close())
    })
  const nc = new NetcatServer()
  setTimeout(() => nc.port(3332).k().listen(), 300)
})

test('Server: client socket errors are emitted as clientError', (t) => {
  t.plan(2, { wait: 5000 })

  const nc = new NetcatServer()
  nc.k().port(3341).listen()
    .on('error', () => t.assert.fail('a client error must not be a server error'))
    .on('clientError', (socket, err) => {
      t.assert.ok(socket.id, 'got the socket')
      t.assert.ok(err instanceof Error, 'got the error')
      nc.close()
    })
    .on('connection', (socket) => socket.emit('error', new Error('boom')))
  new NetcatClient().addr('127.0.0.1').port(3341).connect().on('error', () => {})
})

test('Client: data listener added after connecting', (t) => {
  t.plan(1, { wait: 5000 })

  const nc = new NetcatServer()
  nc.port(3351).listen().on('connection', (socket) => setTimeout(() => socket.end('late'), 200))

  const client = new NetcatClient()
  client.addr('127.0.0.1').port(3351).connect(() => {
    setTimeout(() => client.on('data', (buf) => t.assert.strictEqual(buf.toString(), 'late', 'got data')), 50)
  })
})

test('Server output() is ended once, after the hex dump is flushed', (t) => {
  t.plan(2, { wait: 5000 })

  const out = concat((dump) => {
    t.assert.ok(dump.toString().includes('< '), 'got the incoming dump')
  })
  out.on('error', (err) => t.assert.fail(err.message))
  out.on('finish', () => t.assert.ok(true, 'output finished'))

  const nc = new NetcatServer()
  nc.port(3361).out(out).listen().on('ready', () => {
    new NetcatClient().addr('127.0.0.1').port(3361).connect().end('some bytes')
  })
})

test('Server: reset connections do not leak listeners on the filter', (t) => {
  t.plan(2, { wait: 5000 })

  const nc = new NetcatServer()
  nc.k().port(3371).listen().on('connection', (socket) => socket.destroy())

  let connections = 0
  const next = () => {
    if (++connections > 20) {
      t.assert.strictEqual(nc._filter.listenerCount('unpipe'), 0, 'no pipe listeners left on the filter')
      t.assert.strictEqual(Object.keys(nc.getClients()).length, 0, 'no clients left')
      return nc.close()
    }
    net.connect(3371, '127.0.0.1').on('error', () => {}).on('close', next)
  }
  nc.on('ready', next)
})

test('Server: socket ids are 7 random chars', (t) => {
  t.plan(1, { wait: 5000 })

  const ids = new Set()
  const nc = new NetcatServer()
  nc.k().port(3381).listen()
    .on('connection', (socket) => {
      ids.add(socket.id)
      if (ids.size === 10) {
        t.assert.ok([...ids].every((id) => /^[0-9a-hpsxz]{7}$/.test(id)), 'expected format, all distinct')
        nc.close()
      }
    })
    .on('ready', () => {
      for (let i = 0; i < 10; i++) new NetcatClient().addr('127.0.0.1').port(3381).connect().on('error', () => {})
    })
})
