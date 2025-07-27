# Playwright-MCP E2Eテスト実行スクリプト集

## 基本テンプレート

### 1. アプリケーション起動・初期確認

```javascript
// ================================
// Test Case 1: 基本動作確認
// ================================

// ページ起動
await mcp_playwright_browser_navigate({ 
  url: "http://localhost:5173/" 
});

// 初期ロード待機
await mcp_playwright_browser_wait_for({ time: 3 });

// ページスナップショット
await mcp_playwright_browser_snapshot();

// WebAssembly初期化確認
const messages = await mcp_playwright_browser_console_messages();
console.log("Console messages:", messages);

// WebAssembly加速確認
// 期待: "WebAssembly acceleration enabled!" メッセージ
```

### 2. 並列探索実行テスト

```javascript
// ================================  
// Test Case 2: 並列探索実行
// ================================

// Start Searchボタンクリック
await mcp_playwright_browser_click({
  element: "Start Search button",
  ref: "e543"
});

console.log("🚀 Search started");

// 3秒間の探索進捗監視
await mcp_playwright_browser_wait_for({ time: 3 });

// 進捗状況確認
await mcp_playwright_browser_snapshot();

// さらに5秒監視（合計8秒）
await mcp_playwright_browser_wait_for({ time: 5 });

// 再度進捗確認
await mcp_playwright_browser_snapshot();

// 探索停止
await mcp_playwright_browser_click({
  element: "Stop button",
  ref: "e257" 
});

console.log("⏹️ Search stopped");

// 停止後状態確認
await mcp_playwright_browser_wait_for({ time: 1 });
await mcp_playwright_browser_snapshot();
```

### 3. 特定Seed検証テスト

```javascript
// ================================
// Test Case 3: 特定Seed検証
// ================================

// Target Seedsフィールドをクリア
await mcp_playwright_browser_click({
  element: "Target Seeds input field",
  ref: "e179"
});

// 全選択してクリア
await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_press_key({ key: "Delete" });

// 検証用Seedを入力
await mcp_playwright_browser_type({
  element: "Target Seeds input field",
  ref: "e179",
  text: "0x14B11BA6"
});

// 日付範囲を調整（2066年前後）
await mcp_playwright_browser_click({
  element: "Start Year input",
  ref: "e100"
});

await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "Start Year input", 
  ref: "e100",
  text: "2066"
});

await mcp_playwright_browser_click({
  element: "End Year input",
  ref: "e122"
});

await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "End Year input",
  ref: "e122", 
  text: "2067"
});

// 探索実行
await mcp_playwright_browser_click({
  element: "Start Search button",
  ref: "e543"
});

console.log("🔍 Searching for specific seed: 0x14B11BA6");

// 結果発見まで最大30秒待機
await mcp_playwright_browser_wait_for({ time: 30 });

// 結果確認
await mcp_playwright_browser_snapshot();

// 期待結果: 2066/06/27 03:02:48, Timer0=0xC79
```

### 4. UI操作機能テスト

```javascript
// ================================
// Test Case 4: UI機能テスト  
// ================================

// ROM設定変更テスト
await mcp_playwright_browser_click({
  element: "ROM Version dropdown",
  ref: "e41"
});

// White (W)を選択
await mcp_playwright_browser_click({
  element: "White (W) option",
  ref: "option-w"  // 実際のref値に調整が必要
});

// Region変更テスト  
await mcp_playwright_browser_click({
  element: "ROM Region dropdown",
  ref: "e47"
});

// USA選択
await mcp_playwright_browser_click({
  element: "USA option",
  ref: "option-usa"  // 実際のref値に調整が必要
});

// Worker数調整テスト
await mcp_playwright_browser_click({
  element: "Worker count slider",
  ref: "e201"
});

// スライダーを16に調整（左に移動）
await mcp_playwright_browser_press_key({ key: "ArrowLeft" });
await mcp_playwright_browser_press_key({ key: "ArrowLeft" });

// 設定変更反映確認
await mcp_playwright_browser_snapshot();

console.log("✅ UI configuration changes applied");
```

### 5. 重複Seed検証テスト

```javascript
// ================================
// Test Case 5: 重複Seed検証
// ================================

// Target Seedsフィールドに重複Seedを設定
await mcp_playwright_browser_click({
  element: "Target Seeds input field", 
  ref: "e179"
});

await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "Target Seeds input field",
  ref: "e179", 
  text: "0xFC4AA3AC"
});

// 日付範囲を広く設定（2020-2050年）
await mcp_playwright_browser_click({
  element: "Start Year input",
  ref: "e100"
});

await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "Start Year input",
  ref: "e100",
  text: "2020"
});

await mcp_playwright_browser_click({
  element: "End Year input", 
  ref: "e122"
});

await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "End Year input",
  ref: "e122",
  text: "2050"
});

// 探索実行
await mcp_playwright_browser_click({
  element: "Start Search button",
  ref: "e543"
});

console.log("🔍 Searching for duplicate seed solutions: 0xFC4AA3AC");

// 複数解が見つかるまで最大60秒待機
await mcp_playwright_browser_wait_for({ time: 60 });

// 結果確認
await mcp_playwright_browser_snapshot();

// 期待結果: 
// - 2025/10/18 02:48:49, Timer0=0xC7A
// - 2041/05/25 17:17:59, Timer0=0xC7A
```

### 6. パフォーマンス監視テスト

```javascript
// ================================
// Test Case 6: パフォーマンス監視
// ================================

// パフォーマンス測定開始
const startTime = Date.now();

// 大規模探索開始
await mcp_playwright_browser_click({
  element: "Start Search button",
  ref: "e543"
});

// 1分間の監視
for (let i = 0; i < 12; i++) {
  await mcp_playwright_browser_wait_for({ time: 5 });
  
  // 5秒ごとに状況スナップショット
  await mcp_playwright_browser_snapshot();
  
  // コンソールメッセージ確認
  const messages = await mcp_playwright_browser_console_messages();
  console.log(`Monitoring step ${i + 1}/12:`, messages.slice(-5));
}

// 探索停止
await mcp_playwright_browser_click({
  element: "Stop button",
  ref: "e257"
});

const endTime = Date.now();
const duration = (endTime - startTime) / 1000;

console.log(`⏱️ Performance test completed in ${duration} seconds`);

// 最終状態確認
await mcp_playwright_browser_snapshot();
```

### 7. エラーハンドリング・回復テスト

```javascript
// ================================
// Test Case 7: エラー処理確認
// ================================

// 不正なSeed値入力テスト
await mcp_playwright_browser_click({
  element: "Target Seeds input field",
  ref: "e179"
});

await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "Target Seeds input field",
  ref: "e179",
  text: "invalid_seed_value"
});

// エラー状態確認
await mcp_playwright_browser_snapshot();

// 正常値に修正
await mcp_playwright_browser_press_key({ key: "Control+a" });
await mcp_playwright_browser_type({
  element: "Target Seeds input field", 
  ref: "e179",
  text: "0x12345678"
});

// 回復確認
await mcp_playwright_browser_snapshot();

console.log("✅ Error handling and recovery test completed");
```

### 8. 統合テスト実行スクリプト

```javascript
// ================================
// 統合テスト実行
// ================================

async function runFullE2ETest() {
  try {
    console.log("🚀 Starting comprehensive E2E test suite");
    
    // 1. 基本動作確認
    console.log("1️⃣ Basic functionality test");
    await basicFunctionalityTest();
    
    // 2. 並列探索テスト
    console.log("2️⃣ Parallel search test");
    await parallelSearchTest();
    
    // 3. 特定Seed検証
    console.log("3️⃣ Specific seed verification");
    await specificSeedTest();
    
    // 4. UI機能テスト
    console.log("4️⃣ UI functionality test");
    await uiFunctionalityTest();
    
    // 5. パフォーマンステスト
    console.log("5️⃣ Performance monitoring test");
    await performanceTest();
    
    console.log("✅ All E2E tests completed successfully");
    
  } catch (error) {
    console.error("❌ E2E test failed:", error);
    
    // エラー時のスナップショット
    await mcp_playwright_browser_snapshot();
    
    throw error;
  }
}

// テスト実行
await runFullE2ETest();
```

## エラー監視・デバッグ用

### コンソールエラー監視

```javascript
// コンソールメッセージ全件取得
const allMessages = await mcp_playwright_browser_console_messages();

// エラーレベルメッセージのフィルタリング
const errorMessages = allMessages.filter(msg => 
  msg.includes('ERROR') || 
  msg.includes('Failed') || 
  msg.includes('❌')
);

if (errorMessages.length > 0) {
  console.log("⚠️ Errors detected:", errorMessages);
} else {
  console.log("✅ No errors detected");
}
```

### ネットワーク監視

```javascript
// ネットワークリクエスト監視
const networkRequests = await mcp_playwright_browser_network_requests();

// WebAssembly関連リクエストの確認
const wasmRequests = networkRequests.filter(req => 
  req.url.includes('wasm') || 
  req.url.includes('.wasm')
);

console.log("WebAssembly requests:", wasmRequests);
```

### スクリーンショット付きエラーレポート

```javascript
// エラー発生時の詳細レポート
async function captureErrorReport(testName, error) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  
  // スクリーンショット
  await mcp_playwright_browser_take_screenshot({
    filename: `error-${testName}-${timestamp}.png`,
    fullPage: true
  });
  
  // コンソールログ
  const messages = await mcp_playwright_browser_console_messages();
  
  // ネットワーク状況
  const network = await mcp_playwright_browser_network_requests();
  
  const report = {
    testName,
    timestamp,
    error: error.message,
    consoleMessages: messages.slice(-20), // 最新20件
    networkRequests: network.slice(-10),  // 最新10件
  };
  
  console.log("📋 Error report:", JSON.stringify(report, null, 2));
  
  return report;
}
```

このスクリプト集により、Playwright-MCPを使用した包括的なE2Eテストが実行可能になります。
