const eachSeries = require('async-each-series')

module.exports = function (client, portsInterval, cb) {
  var ports = []
  /* get and validate ports range */
  if (Number.isInteger(portsInterval)) {
    ports.push(portsInterval) // single port
  } else if (typeof portsInterval === 'string') {
    var i = portsInterval.split('-')
    var lowEnd = +i[0]
    var highEnd = +i[1]
    if (isNaN(lowEnd) || isNaN(highEnd)) throw Error('Scan: invalid ports range')
    while (lowEnd <= highEnd) {
      ports.push(lowEnd++)
    }
  } else if (Array.isArray(portsInterval)) {
    ports = portsInterval.map(function (p) {
      if (isNaN(+p)) throw Error('Scan: invalid port in the given array')
      return +p
    })
  } else {
    throw Error('Scan: provide a valid port.')
  }
  /* start the scan */
  startScan(client, ports, cb)
}

function startScan (client, ports, cb) {
  var outcome = {}

  eachSeries(ports, function (port, done) {
    client.port(port).connect()
      .once('connect', function () {
        outcome[port] = 'open'
        client.close()
      }).once('err', function (err) {
        outcome[err.port] = 'closed'
        client.close()
      }).once('close', function () {
        done()
      })
  }, function () {
    cb && cb(outcome)
  })
}
