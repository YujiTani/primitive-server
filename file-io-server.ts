import * as net from 'net';
import * as fs from 'fs';
import * as path from 'path';

// ファイルI/Oの観点からWebサーバーを理解するデモ
class FileIOWebServer {
  private server: net.Server;
  private port: number;
  private logFile: string;

  constructor(port: number = 30002
  ) {
    this.port = port;
    this.logFile = './server.log';
    this.server = net.createServer();
    this.setupServer();
    this.initLogFile();
  }

  private initLogFile(): void {
    // ログファイルの初期化（ファイル書き込み）
    const initMessage = `=== サーバー起動 ${new Date().toISOString()} ===\n`;
    fs.appendFileSync(this.logFile, initMessage);
    console.log('📝 ログファイル初期化完了');
  }

  private setupServer(): void {
    this.server.on('connection', (socket: net.Socket) => {
      console.log('\n🔗 新しい接続（ソケット = ファイルディスクリプタ）');
      this.logToFile(`新しい接続: ${socket.remoteAddress}:${socket.remotePort}`);

      this.handleSocketAsFile(socket);
    });
  }

  private handleSocketAsFile(socket: net.Socket): void {
    let requestBuffer = Buffer.alloc(0);

    // ソケットからデータを「読み取り」（ファイル読み込みと同じ概念）
    socket.on('data', (chunk: Buffer) => {
      console.log('📖 ソケットからデータ読み取り:', chunk.length, 'bytes');
      requestBuffer = Buffer.concat([requestBuffer, chunk]);

      // HTTPリクエストの終端検出
      if (requestBuffer.includes('\r\n\r\n')) {
        this.processHTTPRequest(socket, requestBuffer.toString());
      }
    });

    socket.on('error', (err) => {
      this.logToFile(`ソケットエラー: ${err.message}`);
    });

    socket.on('close', () => {
      console.log('🔒 ソケット（ファイル）クローズ');
      this.logToFile('接続終了');
    });
  }

  private processHTTPRequest(socket: net.Socket, request: string): void {
    const requestLine = request.split('\r\n')[0];
    const [method, urlPath] = requestLine.split(' ');

    console.log(`\n📋 リクエスト処理: ${method} ${urlPath}`);
    this.logToFile(`リクエスト: ${requestLine}`);

    // ルーティング = どのファイル操作を行うかの決定
    switch (urlPath) {
      case '/':
        this.serveHomePage(socket);
        break;
      case '/file':
        this.serveFileContent(socket);
        break;
      case '/write':
        this.handleFileWrite(socket, request);
        break;
      case '/logs':
        this.serveLogFile(socket);
        break;
      case '/system':
        this.serveSystemInfo(socket);
        break;
      default:
        this.serve404(socket, urlPath);
    }
  }

  // 静的コンテンツ = メモリ上のデータをソケットに書き込み
  private serveHomePage(socket: net.Socket): void {
    console.log('📄 ホームページを提供（メモリ→ソケット）');

    const htmlContent = `
<!DOCTYPE html>
<html>
<head><title>File I/O Server Demo</title></head>
<body>
    <h1>ファイルI/Oとしてのサーバー通信</h1>
    <p>このサーバーの全ての通信はファイル操作として理解できます：</p>
    <ul>
        <li><a href="/file">ファイル読み込み</a> - 実際のファイルを読んでレスポンス</li>
        <li><a href="/write">ファイル書き込み</a> - データをファイルに保存</li>
        <li><a href="/logs">ログファイル</a> - サーバーログを表示</li>
        <li><a href="/system">システム情報</a> - /proc からシステム情報読み取り</li>
    </ul>
</body>
</html>`;

    this.writeHTTPResponse(socket, '200 OK', 'text/html', htmlContent);
  }

  // 実際のファイル読み込み → ソケット書き込み
  private serveFileContent(socket: net.Socket): void {
    console.log('📂 実ファイル読み込み → ソケット書き込み');

    const filePath = './package.json';

    // 非同期ファイル読み込み（Node.jsのイベントループを活用）
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        console.log('❌ ファイル読み込みエラー');
        this.writeHTTPResponse(socket, '404 Not Found', 'application/json',
          JSON.stringify({ error: 'File not found', path: filePath }));
      } else {
        console.log('✅ ファイル読み込み成功 → ソケットに書き込み');
        this.logToFile(`ファイル提供: ${filePath}`);
        this.writeHTTPResponse(socket, '200 OK', 'application/json', data);
      }
    });
  }

  // POST データ → ファイル書き込み
  private handleFileWrite(socket: net.Socket, request: string): void {
    console.log('💾 データをファイルに書き込み');

    // 簡単なPOSTデータ解析
    const body = request.split('\r\n\r\n')[1] || '{}';
    const timestamp = new Date().toISOString();
    const dataToWrite = `${timestamp}: ${body}\n`;

    // 非同期ファイル書き込み
    fs.appendFile('./user-data.txt', dataToWrite, (err) => {
      if (err) {
        console.log('❌ ファイル書き込みエラー');
        this.writeHTTPResponse(socket, '500 Internal Server Error', 'application/json',
          JSON.stringify({ error: 'Write failed' }));
      } else {
        console.log('✅ ファイル書き込み成功');
        this.logToFile('データ書き込み成功');
        this.writeHTTPResponse(socket, '200 OK', 'application/json',
          JSON.stringify({ message: 'Data written successfully', timestamp }));
      }
    });
  }

  // ログファイル読み込み → ソケット書き込み
  private serveLogFile(socket: net.Socket): void {
    console.log('📋 ログファイル読み込み → ソケット書き込み');

    fs.readFile(this.logFile, 'utf8', (err, data) => {
      if (err) {
        this.writeHTTPResponse(socket, '404 Not Found', 'text/plain', 'Log file not found');
      } else {
        this.writeHTTPResponse(socket, '200 OK', 'text/plain', data);
      }
    });
  }

  // システムファイル読み込み（Linux/Mac）
  private serveSystemInfo(socket: net.Socket): void {
    console.log('🖥️  システムファイル読み込み');

    // プロセス情報は process.* で取得（内部的にはファイルシステムアクセス）
    const systemInfo = {
      platform: process.platform,
      nodeVersion: process.version,
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      cwd: process.cwd()
    };

    this.logToFile('システム情報要求');
    this.writeHTTPResponse(socket, '200 OK', 'application/json',
      JSON.stringify(systemInfo, null, 2));
  }

  private serve404(socket: net.Socket, path: string): void {
    console.log(`❌ 404エラー: ${path}`);
    this.logToFile(`404エラー: ${path}`);

    const errorResponse = {
      error: 'Not Found',
      path: path,
      message: 'The requested resource was not found on this server.'
    };

    this.writeHTTPResponse(socket, '404 Not Found', 'application/json',
      JSON.stringify(errorResponse, null, 2));
  }

  // ソケットへの書き込み（レスポンス送信）
  private writeHTTPResponse(socket: net.Socket, status: string, contentType: string, body: string): void {
    console.log(`📤 ソケットに書き込み: ${status}`);

    const response = [
      `HTTP/1.1 ${status}`,
      `Content-Type: ${contentType}; charset=utf-8`,
      `Content-Length: ${Buffer.byteLength(body, 'utf8')}`,
      'Connection: close',
      '',
      body
    ].join('\r\n');

    // ソケットへの書き込み = ネットワーク経由でクライアントに送信
    socket.write(response, 'utf8');
    socket.end();

    this.logToFile(`レスポンス送信: ${status}`);
  }

  // ログファイルへの書き込み
  private logToFile(message: string): void {
    const logEntry = `${new Date().toISOString()} - ${message}\n`;

    // 非同期ファイル書き込み（ブロッキングを避ける）
    fs.appendFile(this.logFile, logEntry, (err) => {
      if (err) console.error('ログ書き込みエラー:', err);
    });
  }

  start(): void {
    this.server.listen(this.port, () => {
      console.log(`🚀 File I/O Web Server: http://localhost:${this.port}`);
      console.log('\n📚 理解のポイント:');
      console.log('- ネットワーク通信 = ソケット（ファイル）の読み書き');
      console.log('- HTTPリクエスト = ソケットからのデータ読み取り');
      console.log('- HTTPレスポンス = ソケットへのデータ書き込み');
      console.log('- データベース操作 = ファイル（またはソケット）アクセス');
      console.log('- 静的ファイル配信 = ファイル読み込み → ソケット書き込み');

      this.logToFile('サーバー起動完了');
    });

    // 定期的にログファイルの情報を表示
    setInterval(() => {
      fs.stat(this.logFile, (err, stats) => {
        if (!err) {
          console.log(`📊 ログファイルサイズ: ${stats.size} bytes`);
        }
      });
    }, 10000);
  }

  stop(): void {
    console.log('🛑 サーバー停止中...');
    this.logToFile('サーバー停止');
    this.server.close();
  }
}

// サーバー起動
const server = new FileIOWebServer(30002);

process.on('SIGINT', () => {
  console.log('\n👋 シャットダウンシグナル受信');
  server.stop();
  setTimeout(() => process.exit(0), 1000);
});

server.start();
