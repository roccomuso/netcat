var netcat = require('./index')
var NetcatServer = netcat.server

var nc = new NetcatServer()

nc.k().port(6666).addr('127.0.0.1').listen().exec('/bin/sh')
