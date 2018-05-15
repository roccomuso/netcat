var netcat = require('./index')
var NetcatClient = netcat.client

var nc = new NetcatClient()

process.stdin.pipe(nc.addr('192.168.30.7').port(8080).connect().pipe(process.stdout).stream())
