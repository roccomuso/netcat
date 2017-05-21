# netcat [![NPM Version](https://img.shields.io/npm/v/netcat.svg)](https://www.npmjs.com/package/netcat) [![Build Status](https://travis-ci.org/roccomuso/netcat.svg?branch=master)](https://travis-ci.org/roccomuso/netcat) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

> Netcat client and server modules written in pure Javascript for Node.js.

**Under active development... stay out**

This module implements all the basic netcat's features. To use as standalone tool install the [nc](https://github.com/roccomuso/nc) package.

## What you can do :computer:

- [ ] Backdoor (Reverse Shell)
- [ ] Honeypot
- [ ] Port forwarding
- [ ] File transfer
- [ ] Web Server
- [ ] Port scanning
- [ ] Banner grabbing

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
|`nc.port(2392).listen().serve(Buffer.from('Hello World'))`|`nc2.port(2389).connect().on('data', console.log)`|



## API

#### `port(<port>)`

Netcat can bind to any local port, subject to privilege restrictions and ports that are already in use.

#### `listen()`

#### `keepalive()` or `k()`

When you set the keepalive, the server will stay up and possibly the outStream given to `pipe(outStream)` kept open.

#### `serve()`

The `serve` method accepts either a string (indicating a file name), a Readable stream or a Buffer.
When you pass a readable stream the keepalive method could cause the stream to be consumed at the first request and no more can be served (The stream is not cached in a buffer).

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


- [ ] `-c shell commands    as '-e'; use /bin/sh to exec [dangerous!!]`
- [ ] `-e filename          program to exec after connect [dangerous!!]`
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
- [ ] Hex dump
- [ ] Backdoor shell
- [ ] UDP.

## Known limitations

None

## Author

Rocco Musolino ([@roccomuso](https://twitter.com/roccomuso))
