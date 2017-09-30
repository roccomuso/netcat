'use strict'
const os = require('os')
const log = require('debug')
const spawn = require('child_process').spawn

/* Used from both Server and Client */
function spawnProcess (inStream, outStream) {
  var self = this
  var debug = self.debug
  var debugExec = log('netcat:exec')
  /* spawn exec */
  if (self._exec) {
    debug('Spawning', self._exec)
    var sh = null
    if (self._exec.indexOf('|') !== -1) {
      var cmd = (os.platform() === 'win32') ? 'cmd.exe' : 'sh'
      var cmdO = (os.platform() === 'win32') ? '/C' : '-c'
      debug('multiple commands detected, executing under shell:', cmd, cmdO)
      sh = spawn(cmd, [cmdO, self._exec], self._execOptions)
    } else {
      sh = spawn(self._exec, self._execArgs, self._execOptions)
    }
    sh.on('exit', function (code, signal) {
      debug(self._exec, 'exit with', code, signal)
    })
    sh.stdin.resume()
    inStream.pipe(sh.stdin) // incoming data
    sh.stdout.pipe(outStream) // response
    sh.stderr.pipe(outStream)

    sh.stdout.on('data', function (d) {
      debugExec('stdout:', d.toString())
    })
    sh.stderr.on('data', function (e) {
      debugExec('stderr:', e.toString())
    })
  }
}

/* Timer for the waitTime method */
function waitTimer (self) {
  self = self || this
  if (self._waitTime) {
    clearTimeout(self._timer)
    self._timer = setTimeout(function () {
      self.emit('waitTimeout')
      self.debug('Closed by waitTimer')
      self.close()
    }, self._waitTime)
  }
}

module.exports = {
  spawnProcess: spawnProcess,
  waitTimer: waitTimer
}
