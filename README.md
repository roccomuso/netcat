# netcat [![NPM Version](https://img.shields.io/npm/v/netcat.svg)](https://www.npmjs.com/package/netcat) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

Netcat client and server modules written in pure Javascript for Node.js.

**Under active development... stay out**

This module implements all the basic netcat's features. To use as standalone tool install the [nc](https://github.com/roccomuso/nc) package.

## What you can do

- [ ] Backdoor (Reverse Shell)
- [ ] Honeypot
- [ ] Port forwarding
- [ ] File transfer
- [ ] Web Server
- [ ] Port scanning
- [ ] Banner grabbing

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
  port: null,
  stdout: process.stdout
}
```

## Examples

| JS API                 | CLI equivalent                     |
|---------------------|------------------------------------|
|`nc.port(2389).listen()` | `nc -l -p 2389` |

#### Server and Client connection

| Server                 | Client                     |
|------------------------|------------------------------------|
|`nc.port(2389).listen()`|`nc2.addr('127.0.0.1').port(2389).connect()`|

#### Transfer file

| Server         | Client                    |
|---------------------|------------------------------------|
|`nc.port(2389).listen().pipe(outputStream)`|`inputStream.pipe(nc2.port(2389).connect())`|

## API

...

## CLI usage

For the standalone usage install the `nc` CLI package:

    $ npm install -g nc

Example:

    $ # Listen for inbound
    $ nc -l -p port [- options] [hostname] [port]


Available options:


```
-c shell commands    as `-e’; use /bin/sh to exec [dangerous!!]
-e filename          program to exec after connect [dangerous!!]
-b                   allow broadcasts
-g gateway           source-routing hop point[s], up to 8
-G num               source-routing pointer: 4, 8, 12
-h                   this cruft
-i secs              delay interval for lines sent, ports scanned
-k set               keepalive option on socket
-l                   listen mode, for inbound connects
-n                   numeric-only IP addresses, no DNS
-o file              hex dump of traffic
-p port              local port number
-r                   randomize local and remote ports
-q secs              quit after EOF on stdin and delay of secs
-s addr              local source address
-T tos               set Type Of Service
-t                   answer TELNET negotiation
-u                   UDP mode
-v                   verbose [use twice to be more verbose]
-w secs              timeout for connects and final net reads (client-side)
-z                   zero-I/O mode [used for scanning]
```

## DEBUG

Debug matches the verbose mode.
You can enable it with the `verbose: true` param or the env var `DEBUG=netcat:*`

## Known limitations

None

## Author

Rocco Musolino ([@roccomuso](https://twitter.com/roccomuso))
