const netcat = require('../index')
const NetcatClient = netcat.client

const nc = new NetcatClient()

process.stdin.pipe(nc.addr('127.0.0.1').port(6666).connect().pipe(process.stdout).stream())
