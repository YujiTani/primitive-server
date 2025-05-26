import * as net from "net";

// 現実的な原始的HTTPサーバー（Node.jsの標準イベントループを使用）
class RealPrimitiveHTTPServer {
  private server: net.Server;
  private port: number;
  private requestCount: number = 0;

  constructor(port: number = 30001) {
    this.port = port;
    this.server = net.createServer();
    this.setupServer();
  }

  private setupServer(): void {
    console.log("🔧 サーバーセットアップ中...");

    // Node.jsの標準イベントループを使用
    this.server.on("connection", (socket: net.Socket) => {
      console.log(
        `🔗 新しい接続 (${socket.remoteAddress}:${socket.remotePort})`,
      );
      this.handleConnection(socket);
    });

    this.server.on("error", (err) => {
      console.error("🚨 サーバーエラー:", err);
    });

    this.server.on("close", () => {
      console.log("🛑 サーバーが閉じられました");
    });
  }

  private handleConnection(socket: net.Socket): void {
    let requestData = "";

    // データを受信した時（Node.jsのイベントループが自動処理）
    socket.on("data", (chunk: Buffer) => {
      requestData += chunk.toString();

      // HTTPリクエストの終端を検出
      if (requestData.includes("\r\n\r\n")) {
        this.handleHTTPRequest(socket, requestData);
        requestData = ""; // リセット
      }
    });

    socket.on("error", (err) => {
      console.error("🚨 ソケットエラー:", err.message);
    });

    socket.on("close", () => {
      console.log("👋 接続終了");
    });

    // タイムアウト設定
    socket.setTimeout(30000, () => {
      console.log("⏰ タイムアウト");
      socket.destroy();
    });
  }

  private handleHTTPRequest(socket: net.Socket, rawRequest: string): void {
    this.requestCount++;
    const requestLine = rawRequest.split("\r\n")[0];
    console.log(`📥 リクエスト #${this.requestCount}: ${requestLine}`);

    // 簡単なルーティング
    const [method, path] = requestLine.split(" ");
    let responseBody: string;
    let statusCode: string;

    switch (path) {
      case "/":
        statusCode = "200 OK";
        responseBody = JSON.stringify(
          {
            message: "Hello from real primitive server!",
            timestamp: new Date().toISOString(),
            method: method,
            path: path,
            requestCount: this.requestCount,
          },
          null,
          2,
        );
        break;

      case "/slow":
        // 重い処理をシミュレート（Node.jsのイベントループをブロックしない）
        statusCode = "200 OK";
        this.simulateSlowOperation(() => {
          responseBody = JSON.stringify(
            {
              message: "Slow operation completed!",
              timestamp: new Date().toISOString(),
              delay: "1000ms",
            },
            null,
            2,
          );
          this.sendHTTPResponse(socket, statusCode, responseBody);
        });
        return; // 早期リターン

      case "/status":
        statusCode = "200 OK";
        responseBody = JSON.stringify(
          {
            status: "running",
            uptime: process.uptime(),
            memory: process.memoryUsage(),
            requestCount: this.requestCount,
          },
          null,
          2,
        );
        break;

      default:
        statusCode = "404 Not Found";
        responseBody = JSON.stringify(
          {
            error: "Not Found",
            path: path,
            timestamp: new Date().toISOString(),
          },
          null,
          2,
        );
    }

    this.sendHTTPResponse(socket, statusCode, responseBody);
  }

  private sendHTTPResponse(
    socket: net.Socket,
    statusCode: string,
    body: string,
  ): void {
    const response = [
      `HTTP/1.1 ${statusCode}`,
      "Content-Type: application/json; charset=utf-8",
      "Content-Length: " + Buffer.byteLength(body, "utf8"),
      "Connection: close",
      "Server: RealPrimitiveServer/1.0",
      "",
      body,
    ].join("\r\n");

    console.log(`📤 レスポンス送信: ${statusCode}`);
    socket.write(response, "utf8");
    socket.end();
  }

  // 非同期処理をシミュレート（Node.jsのイベントループを活用）
  private simulateSlowOperation(callback: () => void): void {
    console.log("⏳ 重い処理を開始...");

    // setTimeoutはNode.jsのイベントループに処理を委譲
    setTimeout(() => {
      console.log("✅ 重い処理完了");
      callback();
    }, 1000);

    // この間、他のリクエストも並行処理される
  }

  start(): void {
    this.server.listen(this.port, () => {
      console.log(`🚀 サーバー起動: http://localhost:${this.port}`);
      console.log("📋 利用可能なエンドポイント:");
      console.log("   GET / - 基本レスポンス");
      console.log("   GET /slow - 遅いレスポンス（1秒待機）");
      console.log("   GET /status - サーバー状態");

      this.showEventLoopInfo();
    });
  }

  private showEventLoopInfo(): void {
    console.log("\n📚 Node.jsイベントループについて:");
    console.log("- このサーバーはNode.js標準のイベントループを使用");
    console.log("- libuvによる非同期I/O処理");
    console.log("- シングルスレッドで並行処理を実現");
    console.log("- /slow エンドポイントで非ブロッキング処理を確認可能\n");
  }

  stop(): void {
    console.log("🛑 サーバー停止中...");
    this.server.close(() => {
      console.log("✅ サーバー停止完了");
    });
  }
}

// 実際のイベントループの動作を可視化
function visualizeEventLoop(): void {
  console.log("\n🔄 Node.jsイベントループフェーズ:");

  // Timer phase
  setTimeout(() => console.log("1️⃣  Timer phase: setTimeout"), 0);

  // Immediate phase
  setImmediate(() => console.log("3️⃣  Check phase: setImmediate"));

  // I/O callbacks
  process.nextTick(() => console.log("2️⃣  nextTick queue"));

  // Promise microtask
  Promise.resolve().then(() => console.log("2️⃣  Promise microtask"));

  console.log("0️⃣  同期処理");
}

// サーバー起動
const server = new RealPrimitiveHTTPServer(30001);

// グレースフルシャットダウン
process.on("SIGINT", () => {
  console.log("\n🔄 シャットダウンシグナル受信");
  server.stop();
  setTimeout(() => process.exit(0), 1000);
});

// イベントループ可視化
visualizeEventLoop();

// サーバー開始
server.start();

// 自動テスト（複数の並行リクエスト）
setTimeout(() => {
  console.log("\n🧪 並行リクエストテスト開始...");

  // 複数のリクエストを同時送信
  for (let i = 1; i <= 3; i++) {
    const socket = net.createConnection(30001, "localhost");
    socket.on("connect", () => {
      socket.write(
        `GET ${i === 2 ? "/slow" : "/"} HTTP/1.1\r\nHost: localhost\r\n\r\n`,
      );
    });
    socket.on("data", (data) => {
      const statusLine = data.toString().split("\r\n")[0];
      console.log(`🧪 テスト${i} レスポンス: ${statusLine}`);
    });
  }
}, 2000);
