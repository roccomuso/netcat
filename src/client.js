const net = require('net');
const { EventEmitter } = require('events');

class Client extends EventEmitter {
  constructor(options) {
    super();
    this.socket = new net.Socket();
    this.socket.on('data', (data) => {
      this.emit('data', data);
    });
    this.socket.on('end', () => this.emit('end'));
    this.socket.on('error', (err) => this.emit('error', err));
  }

  connect(port, host) {
    this.socket.connect(port, host);
  }

  pipe(dest) {
    return this.socket.pipe(dest);
  }

  write(data) {
    return this.socket.write(data);
  }
}

module.exports = Client;