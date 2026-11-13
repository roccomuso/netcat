'use strict'
const os = require('node:os')
const { spawn } = require('node:child_process')
const { finished } = require('node:stream/promises')
const hex = require('hexer')
const debugExec = require('debug')('netcat:exec')

/* Spawn the exec() command: inStream -> process stdin, stdout/stderr -> outStream */
function spawnProcess (nc, inStream, outStream) {
  if (!nc._exec) return
  const { debug } = nc
  debug('Spawning', nc._exec)
  let sh
  if (nc._exec.includes('|')) {
    const isWin = os.platform() === 'win32'
    const cmd = isWin ? 'cmd.exe' : 'sh'
    const cmdO = isWin ? '/C' : '-c'
    debug('multiple commands detected, executing under shell:', cmd, cmdO)
    sh = spawn(cmd, [cmdO, nc._exec], nc._execOptions)
  } else {
    sh = spawn(nc._exec, nc._execArgs, nc._execOptions)
  }
  sh.on('exit', (code, signal) => debug(nc._exec, 'exit with', code, signal))
  sh.on('error', (err) => {
    debug(nc._exec, 'failed:', err)
    nc.emit('error', err)
  })
  inStream.pipe(sh.stdin) // incoming data
  sh.stdout.pipe(outStream) // response
  sh.stderr.pipe(outStream)

  sh.stdout.on('data', (d) => debugExec('stdout:', d.toString()))
  sh.stderr.on('data', (e) => debugExec('stderr:', e.toString()))
}

/* Debug function used in verbose mode: logs to stderr */
function verboseDebug (...args) {
  process.stderr.write(args.join(' ') + '\n')
}

/* (Re)start the inactivity timer of waitTime(): call it on any traffic */
function waitTimer (nc) {
  if (!nc._waitTime) return
  clearTimeout(nc._timer)
  nc._timer = setTimeout(() => {
    nc.emit('waitTimeout')
    nc.debug('Closed by waitTimer')
    nc.close()
  }, nc._waitTime)
}

/* Hex dump of the traffic written to the output() stream.
 * The output stream is ended once both dumps are flushed (never stdout/stderr). */
class HexDump {
  constructor (output) {
    this.output = output
    this.incoming = hex.Transform({ prefix: '< ' })
    this.outgoing = hex.Transform({ prefix: '> ' })
    this.incoming.pipe(output, { end: false })
    this.outgoing.pipe(output, { end: false })
  }

  async end () {
    if (this._ended) return
    this._ended = true
    this.incoming.end()
    this.outgoing.end()
    await Promise.all([finished(this.incoming), finished(this.outgoing)])
    if (this.output !== process.stdout && this.output !== process.stderr) this.output.end()
  }
}

/* Lazily create the hex dump: output() may be called after listen()/connect() */
function hexDump (nc) {
  if (!nc._output) return null
  if (!nc._hexDump || nc._hexDump._ended || nc._hexDump.output !== nc._output) nc._hexDump = new HexDump(nc._output)
  return nc._hexDump
}

module.exports = { spawnProcess, verboseDebug, waitTimer, hexDump }
