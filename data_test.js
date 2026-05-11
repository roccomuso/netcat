var CHUNK_SIZE = 333 // NOTE: `CHUNK_SIZE` must be divisible by 3 for base64 math tests to work!
var CHUNK_COUNT = 79 // 1-74 WORK - WHY DOEST >= 75 (or ~32kb) die if read via event emitter?
var CHUNKINTERVAL = 30 // ms

// Add 10MS overhead for crypto.random and STDOUT
var T_TIMEOUT = (CHUNKINTERVAL + 15) * CHUNK_COUNT

const test = require('tape')
const crypto = require('crypto')
const stream = require('stream')
const Netcat = require('../')
const NetcatServer = Netcat.server
const NetcatClient = Netcat.client

// Byte length to base 64length for tests
// base64Length = 4 * ( nBytes / 3)
var testSize = 4 * ((CHUNK_SIZE * CHUNK_COUNT) / 3)

function chunkSever (t, port, openCb, cb) {
  var sentCount = 0
  var chunkedServer = new stream.PassThrough()

  setInterval(function () {
    if (++sentCount <= CHUNK_COUNT) {
      chunkedServer.write(crypto.randomBytes(CHUNK_SIZE).toString('base64'))
    } else {
      clearInterval(this)
      chunkedServer.end()
    }
  }, CHUNKINTERVAL)

  var nc = new NetcatServer()
  nc.port(port).listen()
    .on('ready', function () {
      openCb()
    })
    .serve(chunkedServer).on('close', function () {
      t.ok(true, 'server closed (no keepalive)')
      cb()
    })
}

test('Client receives big chunks via writeStream by pipe', function (t) {
  t.plan(2 + CHUNK_COUNT)
  t.timeoutAfter(T_TIMEOUT)
  var recvBytes = []
  chunkSever(t, 2595, function () {
    var resChunkCount = 1
    var writeStream = new stream.Writable({
      write: function (chunk, encoding, next) {
        var recv = chunk.toString()
        recvBytes += recv
        t.ok(recv.length >= 4 * (CHUNK_SIZE / 3),
          `ChunkCount: ${resChunkCount} with ` +
          `length: ${recv.length} matched or exceeded ${4 * (CHUNK_SIZE / 3)}`)
        ++resChunkCount
        next()
      }
    })
    var ncc = new NetcatClient()
    ncc.addr('127.0.0.1').port(2595).connect().pipe(writeStream)
  }, function () {
    t.equal(recvBytes.length, testSize, `Client unbuffered ${recvBytes.length} of ${testSize} bytes from server`)
  })
})

test('Client receives big chunks via eventEmitter inheritance', function (t) {
  t.plan(2 + CHUNK_COUNT)
  t.timeoutAfter(T_TIMEOUT)
  var recvBytes = []
  chunkSever(t, 2596, function () {
    var resChunkCount = 1
    var ncc = new NetcatClient()
    ncc.addr('127.0.0.1').port(2596).connect()
      .on('error', function (error) {
        console.log('ERROR: ' + error.toString())
      })
      .on('data', function (chunk) {
        var recv = chunk.toString()
        recvBytes += recv
        t.ok(recv.length >= 4 * (CHUNK_SIZE / 3),
          `ChunkCount: ${resChunkCount} with ` +
          `length: ${recv.length} matched or exceeded ${4 * (CHUNK_SIZE / 3)}`)
        ++resChunkCount
      })
  }, function () {
    t.equal(recvBytes.length, testSize, `Client unbuffered ${recvBytes.length} of ${testSize} bytes from server`)
  })
})
