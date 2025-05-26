const net = require('net');
const port = 29999;

const client = net.connect(port, 'localhost', () => {
    console.log('Socketが接続されました');
});

// サーバーからのデータを受信
client.on('data', (data) => {
    const timestamp = new Date();
    console.log(`${timestamp.toISOString()}: ${data.toString().trim()}`);
});

// 標準入力からのデータを受信
process.stdin.on('data', (data) => {
    const message = data.toString().trim();
    if (message) {
        console.log('メッセージを送信:', message);
        client.write(message + '\n');
    }
});

client.on('end', () => {
    const timestamp = new Date();
    console.log(`${timestamp.toISOString()}: サーバーとの接続が切断されました`);
});

client.on('error', (err) => {
    switch (err.code) {
        case 'ECONNREFUSED':
            console.error('接続が拒否されました。サーバーが起動しているか確認してください。');
            break;
        case 'ECONNRESET':
            console.error('接続がリセットされました。サーバーが切断した可能性があります。');
            break;
        default:
            console.error('何だか調子が悪いみたい(´;ω;｀):', err.message);
            break;
    }
});