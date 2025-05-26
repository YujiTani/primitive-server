import net from 'net';
import { nanoid } from 'nanoid';

const port = 29999;
const clients = [];
// プリミティブなTCPサーバーを作成
const server = net.createServer((socket) => {
  console.log(`新しいクライアントが接続されました`);
  // 接続されたsocketに名前をつけて保存
  const name = nanoid(10);
  console.log(`クライアントに名前を付けました: ${name}`); 
  socket.name = name;
  clients.push(socket);

  // クライアントから書き込まれたデータに対して行う処理
  socket.on('data', (data) => {
    const message = `${socket.name}: ${data.toString().trim()}`;
    const broadcastMessage = (message) => client => client.write(message);
    clients.forEach(broadcastMessage(message));
  });

  // クライアントが切断された時の処理
  socket.on('end', () => {
    const index = clients.indexOf(socket);
    if (index > -1) {
      clients.forEach(client => {
        client.write(`=== サーバーからのメッセージ: ${socket.name}が切断されました ===\n`);
      });
      clients.splice(index, 1);
    }
  });
});

server.listen(port, () => {
  console.log(`Server is listening on port ${port}`);
  let intervalId;
  let interValTime = 5000;

  const startInterval = () => {
    if (intervalId) {
      clearInterval(intervalId);
    }

    if (clients.length === 0) {
      interValTime = 5000;
      intervalId = setInterval(() => {
        console.log('誰かせつぞくしてくれないかな…');
      }, interValTime);
    } else {
      interValTime = 100000;
      intervalId = setInterval(() => {
        clients.forEach(client => {
          client.write('=== Serverの声, みんな、ゆっくりしていってね!! ===\n');
        });
      }, interValTime);
    }
  };

  startInterval();

  // クライアント接続時の処理
  server.on('connection', () => {
    startInterval();
  });

  // サーバーが閉じられたときの処理
  server.on('close', () => {
    if (intervalId) {
      clearInterval(intervalId);
    }
  });
});