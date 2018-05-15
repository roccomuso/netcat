var netcat = require('./')
var NetcatClient = netcat.client

// NB: it requires sudo!
var nc2 = new NetcatClient()
nc2.unixSocket('/var/run/docker.sock').enc('utf8')
  .on('data', function (res) {
    console.log(res)
  })
  .connect()
  .send('GET /images/json HTTP/1.0\r\n\r\n')
