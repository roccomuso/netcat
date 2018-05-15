var netcat = require('./index')
var NetcatServer = netcat.server

var nc = new NetcatServer()

nc.k().port(6767).listen().serve(process.stdin).pipe(process.stdout)
