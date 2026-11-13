'use strict'
const net = require('node:net')
const { setTimeout: sleep } = require('node:timers/promises')

function parsePorts (portsInterval) {
  if (Number.isInteger(portsInterval)) return [portsInterval] // single port
  if (typeof portsInterval === 'string') {
    const [low, high] = portsInterval.split('-').map(Number)
    if (isNaN(low) || isNaN(high)) throw Error('Scan: invalid ports range')
    return Array.from({ length: Math.max(high - low + 1, 0) }, (_, i) => low + i)
  }
  if (Array.isArray(portsInterval)) {
    return portsInterval.map((p) => {
      if (isNaN(+p)) throw Error('Scan: invalid port in the given array')
      return +p
    })
  }
  throw Error('Scan: provide a valid port.')
}

/* Each port gets its own short-lived socket, independent from the client's
 * connection, filter and listeners: the scan can't interfere with them. */
function probe (host, port) {
  return new Promise((resolve) => {
    const socket = net.connect({ host, port })
    socket.once('connect', () => {
      socket.destroy()
      resolve('open')
    })
    socket.once('error', () => resolve('closed'))
  })
}

/* Scan the ports one after the other, waiting interval() ms between them */
async function scan (client, ports) {
  const outcome = {}
  for (const [i, port] of ports.entries()) {
    if (i > 0 && client._interval) await sleep(client._interval)
    client.debug('scanning port', port)
    outcome[port] = await probe(client._address, port)
  }
  return outcome
}

/* Invalid ports throw synchronously, the scan result is returned as a Promise */
module.exports = function portScan (client, portsInterval) {
  return scan(client, parsePorts(portsInterval))
}
