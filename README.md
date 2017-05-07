# netcat
Netcat client and server modules written in pure Javascript for Node.js.

**Under active development... stay out**

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

## CLI usage

> This module implements all the basic netcat's features.


    $ # Listen for inbound
    $ netcat -l -p port [- options] [hostname] [port]



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
-wsecs               timeout for connects and final net reads
-z                   zero-I/O mode [used for scanning]
```

## Known limitations

None

