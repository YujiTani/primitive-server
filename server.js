"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
// 現実的な原始的HTTPサーバー（Node.jsの標準イベントループを使用）
var RealPrimitiveHTTPServer = /** @class */ (function () {
    function RealPrimitiveHTTPServer(port) {
        if (port === void 0) { port = 30001; }
        this.requestCount = 0;
        this.port = port;
        this.server = net.createServer();
        this.setupServer();
    }
    RealPrimitiveHTTPServer.prototype.setupServer = function () {
        var _this = this;
        console.log("🔧 サーバーセットアップ中...");
        // Node.jsの標準イベントループを使用
        this.server.on("connection", function (socket) {
            console.log("\uD83D\uDD17 \u65B0\u3057\u3044\u63A5\u7D9A (".concat(socket.remoteAddress, ":").concat(socket.remotePort, ")"));
            _this.handleConnection(socket);
        });
        this.server.on("error", function (err) {
            console.error("🚨 サーバーエラー:", err);
        });
        this.server.on("close", function () {
            console.log("🛑 サーバーが閉じられました");
        });
    };
    RealPrimitiveHTTPServer.prototype.handleConnection = function (socket) {
        var _this = this;
        var requestData = "";
        // データを受信した時（Node.jsのイベントループが自動処理）
        socket.on("data", function (chunk) {
            requestData += chunk.toString();
            // HTTPリクエストの終端を検出
            if (requestData.includes("\r\n\r\n")) {
                _this.handleHTTPRequest(socket, requestData);
                requestData = ""; // リセット
            }
        });
        socket.on("error", function (err) {
            console.error("🚨 ソケットエラー:", err.message);
        });
        socket.on("close", function () {
            console.log("👋 接続終了");
        });
        // タイムアウト設定
        socket.setTimeout(30000, function () {
            console.log("⏰ タイムアウト");
            socket.destroy();
        });
    };
    RealPrimitiveHTTPServer.prototype.handleHTTPRequest = function (socket, rawRequest) {
        var _this = this;
        this.requestCount++;
        var requestLine = rawRequest.split("\r\n")[0];
        console.log("\uD83D\uDCE5 \u30EA\u30AF\u30A8\u30B9\u30C8 #".concat(this.requestCount, ": ").concat(requestLine));
        // 簡単なルーティング
        var _a = requestLine.split(" "), method = _a[0], path = _a[1];
        var responseBody;
        var statusCode;
        switch (path) {
            case "/":
                statusCode = "200 OK";
                responseBody = JSON.stringify({
                    message: "Hello from real primitive server!",
                    timestamp: new Date().toISOString(),
                    method: method,
                    path: path,
                    requestCount: this.requestCount,
                }, null, 2);
                break;
            case "/slow":
                // 重い処理をシミュレート（Node.jsのイベントループをブロックしない）
                statusCode = "200 OK";
                this.simulateSlowOperation(function () {
                    responseBody = JSON.stringify({
                        message: "Slow operation completed!",
                        timestamp: new Date().toISOString(),
                        delay: "1000ms",
                    }, null, 2);
                    _this.sendHTTPResponse(socket, statusCode, responseBody);
                });
                return; // 早期リターン
            case "/status":
                statusCode = "200 OK";
                responseBody = JSON.stringify({
                    status: "running",
                    uptime: process.uptime(),
                    memory: process.memoryUsage(),
                    requestCount: this.requestCount,
                }, null, 2);
                break;
            default:
                statusCode = "404 Not Found";
                responseBody = JSON.stringify({
                    error: "Not Found",
                    path: path,
                    timestamp: new Date().toISOString(),
                }, null, 2);
        }
        this.sendHTTPResponse(socket, statusCode, responseBody);
    };
    RealPrimitiveHTTPServer.prototype.sendHTTPResponse = function (socket, statusCode, body) {
        var response = [
            "HTTP/1.1 ".concat(statusCode),
            "Content-Type: application/json; charset=utf-8",
            "Content-Length: " + Buffer.byteLength(body, "utf8"),
            "Connection: close",
            "Server: RealPrimitiveServer/1.0",
            "",
            body,
        ].join("\r\n");
        console.log("\uD83D\uDCE4 \u30EC\u30B9\u30DD\u30F3\u30B9\u9001\u4FE1: ".concat(statusCode));
        socket.write(response, "utf8");
        socket.end();
    };
    // 非同期処理をシミュレート（Node.jsのイベントループを活用）
    RealPrimitiveHTTPServer.prototype.simulateSlowOperation = function (callback) {
        console.log("⏳ 重い処理を開始...");
        // setTimeoutはNode.jsのイベントループに処理を委譲
        setTimeout(function () {
            console.log("✅ 重い処理完了");
            callback();
        }, 1000);
        // この間、他のリクエストも並行処理される
    };
    RealPrimitiveHTTPServer.prototype.start = function () {
        var _this = this;
        this.server.listen(this.port, function () {
            console.log("\uD83D\uDE80 \u30B5\u30FC\u30D0\u30FC\u8D77\u52D5: http://localhost:".concat(_this.port));
            console.log("📋 利用可能なエンドポイント:");
            console.log("   GET / - 基本レスポンス");
            console.log("   GET /slow - 遅いレスポンス（1秒待機）");
            console.log("   GET /status - サーバー状態");
            _this.showEventLoopInfo();
        });
    };
    RealPrimitiveHTTPServer.prototype.showEventLoopInfo = function () {
        console.log("\n📚 Node.jsイベントループについて:");
        console.log("- このサーバーはNode.js標準のイベントループを使用");
        console.log("- libuvによる非同期I/O処理");
        console.log("- シングルスレッドで並行処理を実現");
        console.log("- /slow エンドポイントで非ブロッキング処理を確認可能\n");
    };
    RealPrimitiveHTTPServer.prototype.stop = function () {
        console.log("🛑 サーバー停止中...");
        this.server.close(function () {
            console.log("✅ サーバー停止完了");
        });
    };
    return RealPrimitiveHTTPServer;
}());
// 実際のイベントループの動作を可視化
function visualizeEventLoop() {
    console.log("\n🔄 Node.jsイベントループフェーズ:");
    // Timer phase
    setTimeout(function () { return console.log("1️⃣  Timer phase: setTimeout"); }, 0);
    // Immediate phase
    setImmediate(function () { return console.log("3️⃣  Check phase: setImmediate"); });
    // I/O callbacks
    process.nextTick(function () { return console.log("2️⃣  nextTick queue"); });
    // Promise microtask
    Promise.resolve().then(function () { return console.log("2️⃣  Promise microtask"); });
    console.log("0️⃣  同期処理");
}
// サーバー起動
var server = new RealPrimitiveHTTPServer(30001);
// グレースフルシャットダウン
process.on("SIGINT", function () {
    console.log("\n🔄 シャットダウンシグナル受信");
    server.stop();
    setTimeout(function () { return process.exit(0); }, 1000);
});
// イベントループ可視化
visualizeEventLoop();
// サーバー開始
server.start();
// 自動テスト（複数の並行リクエスト）
setTimeout(function () {
    console.log("\n🧪 並行リクエストテスト開始...");
    var _loop_1 = function (i) {
        var socket = net.createConnection(30001, "localhost");
        socket.on("connect", function () {
            socket.write("GET ".concat(i === 2 ? "/slow" : "/", " HTTP/1.1\r\nHost: localhost\r\n\r\n"));
        });
        socket.on("data", function (data) {
            var statusLine = data.toString().split("\r\n")[0];
            console.log("\uD83E\uDDEA \u30C6\u30B9\u30C8".concat(i, " \u30EC\u30B9\u30DD\u30F3\u30B9: ").concat(statusLine));
        });
    };
    // 複数のリクエストを同時送信
    for (var i = 1; i <= 3; i++) {
        _loop_1(i);
    }
}, 2000);
