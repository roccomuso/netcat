const Client = require('../src/client');
const assert = require('assert');
const net = require('net');

async function testDataEvent() {
  const server = net.createServer((socket) => {
    socket.write('hello');
    socket.end();
  });

  await new Promise(resolve => server.listen(0, resolve));
  const port = server.address().port;

  const client = new Client();
  const chunks = [];

  client.on('data', (data) => {
    chunks.push(data);
  });

  await new Promise((resolve) => {
    client.on('end', resolve);
    client.connect(port, '127.0.0.1');
  });

  assert.strictEqual(Buffer.concat(chunks).toString(), 'hello');
  server.close();
  console.log('testDataEvent passed');
}

testDataEvent().catch(err => {
  console.error(err);
  process.exit(1);
});