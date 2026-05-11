const eachSeries = require('async-each-series')

module.exports = function (client, portsInterval, cb) {
  let ports = []
  /* get and validate ports range */
  if (Number.isInteger(portsInterval)) {
    ports.push(portsInterval) // single port
  } else if (typeof portsInterval === 'string') {
    const i = portsInterval.split('-')
    let lowEnd = +i[0]
    const highEnd = +i[1]
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
  const outcome = {}

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
