const net = require('net');

const PIPE_PATH = '\\\\.\\pipe\\MSSQL$SQLEXPRESS\\sql\\query';
const TCP_PORT = 1433;

const server = net.createServer((tcpSocket) => {
  console.log('Client connected to TCP 1433, proxying to Named Pipe...');
  const pipeSocket = net.connect(PIPE_PATH, () => {
    console.log('Connected to SQL Server Named Pipe!');
  });

  tcpSocket.pipe(pipeSocket);
  pipeSocket.pipe(tcpSocket);

  tcpSocket.on('error', (err) => {
    console.error('TCP socket error:', err.message);
    pipeSocket.destroy();
  });

  pipeSocket.on('error', (err) => {
    console.error('Pipe socket error:', err.message);
    tcpSocket.destroy();
  });

  tcpSocket.on('close', () => pipeSocket.destroy());
  pipeSocket.on('close', () => tcpSocket.destroy());
});

server.listen(TCP_PORT, '127.0.0.1', () => {
  console.log(`Named Pipe Bridge listening on 127.0.0.1:${TCP_PORT} -> ${PIPE_PATH}`);
});

server.on('error', (err) => {
  console.error('Bridge server error:', err);
});
