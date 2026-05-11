const netcat = require('../index')
const NetcatServer = netcat.server

const nc = new NetcatServer()

nc.k().port(6666).addr('127.0.0.1').listen().exec('/bin/sh')
