# 食品工廠管理系統 — 交接文件

## 現況

這是第一版骨架，7 大業務模組 + 使用者權限系統的資料表結構、核心自動化邏輯、
以及可用的 CRUD 介面都已建立並可運作，但功能深度還沒有到跟「境外實習生管理系統」
一樣打磨（例如列表排序/篩選、CSV 匯出、更細的表單驗證都還沒做）。

## 技術架構

跟「境外實習生管理系統」（`sean0514/tsaipei` repo）完全一樣：
- 後端 `Code.gs`（V8 執行環境）
- 前端 `Index.html`（單一檔案 SPA，原生 JS，無框架）
- 資料庫：Google 試算表，`getSheet_()` 自動建立分頁與表頭
- 前後端溝通：`callServer(fnName, args)` 包裝 `google.script.run`

## 資料表總覽

見 `Code.gs` 的 `SHEET_FIELDS`。共 23 張表，對應 8 大模組：

| 模組 | 資料表 |
|---|---|
| 原料與庫存 | Materials, Suppliers, Purchases, InventoryLogs |
| 生產管理 | ProductionBatches, ProductionMaterialUsage, ProductionExpenses |
| 成品與出貨 | Products, ProductInventory, Customers, Shipments |
| 客戶請款明細 | CustomerInvoices（明細抓 Shipments.invoiceId） |
| 品質/食安 | QCTemplates, QCTemplateItems, QCRecords, QCRecordItems |
| 零用金對帳 | ExpenseCategories, PettyCashTransactions |
| 損益表 | AccountCategories, ManualLedgerEntries, Partners, ProfitPayouts |
| 使用人員 | Users, RolePermissions |

`ProductInventory`、`QCTemplateItems`、`QCRecordItems` 目前資料表已定義，
但前端還沒有對應的管理介面（成本分析/品管流程目前繞過它們直接用進貨單/生產批次算），
是下一階段要補的。

## 重要的自動化邏輯

| 觸發點 | 動作 |
|---|---|
| 新增進貨單 `addPurchase` | 自動建立一筆 `InventoryLogs` 入庫紀錄 |
| 生產批次新增用料 `addProductionMaterialUsage` | 自動建立一筆 `InventoryLogs` 出庫紀錄 |
| 零用金支出且類別勾選「連動原料庫存」`addPettyCashTransaction` | 自動找/建 `Materials`、`Suppliers`，建立 `Purchases` 進貨紀錄（批號＝`PC-日期-原料ID`，因為零星採購通常沒有供應商批號），連動觸發庫存異動 |
| 開立客戶請款單 `createCustomerInvoice` | 抓該客戶+期間內所有 `invoiceId` 為空的 `Shipments`，彙總金額，寫回每筆出貨單的 `invoiceId`（避免重複請款） |
| 批次成本試算 `batchCost` | 即時計算，不落表：原料成本（用料明細×進貨均價）＋ 直接費用 ＋ 當月共同費用依產量比例分攤 |
| 損益表 `incomeStatementMonth` | 即時計算：`AccountCategories.source==='auto'` 的科目會即時彙總其他模組數字（`autoAccountAmount_`），`manual` 科目則加總 `ManualLedgerEntries` |
| 合夥分潤 `computeProfitPayouts` | 依當月淨獲利 × `Partners.sharePct` 算出應分金額，寫入/更新 `ProfitPayouts`（不會自動判斷已付，需要手動 `markPayoutPaid`） |

## 權限系統

跟實習生系統邏輯一致：`RolePermissions` 表是動態權限矩陣，`DEFAULT_PERMISSIONS`
（`Code.gs`）是種子值，`getRolePermissionsMap_()` 每次讀取時自動補上缺的組合。
系統管理員永遠全模組 edit（寫死在 `permFor_()`）。頁面 key 對應權限模組 key 見
`PAGE_MODULE_MAP`（後端）/ `pageModuleKey()`（前端），**新增分頁時要記得同時改兩邊**。

## 已完成（第二輪補齊）

- **成品庫存真的會扣減**：生產批次要先在「生產批次」頁按「完成入庫」
  （`completeProductionBatch`）才會把實際產量計入 `ProductInventory`；
  出貨單 `addShipment` 會檢查該批號庫存是否足夠，不夠會擋下並提示，
  成功後即時扣減庫存。新增「成品庫存」頁面可查詢目前庫存。
- **品管範本真的會驅動檢驗表單**：「檢驗範本」頁面可以幫每個範本新增/刪除
  檢驗項目（項目名稱、標準值/規格、資料型態：數值/合格判定/文字）。
  新增檢驗紀錄時選範本，表單會照範本項目動態產生對應輸入欄，數值型會
  自動依標準值（支援 `>=100`、`<=5`、`>100`、`<5`、`5-10`、`100` 幾種格式）
  判定合格/不合格，不用再手動選（見 `evalQcItemPass_`）。
- **原料成本波動追蹤**：「成本分析」頁面新增原料選單，顯示歷史進貨單價
  清單＋最低/最高/最近一次單價與漲跌提示（後端 `materialPriceTrend`）。
- **CSV 匯出**：所有走 `GENERIC_PAGES` 通用列表的頁面都有「匯出CSV」按鈕
  （純前端把目前畫面資料轉 CSV 下載，不用另外呼叫後端）。

## 已完成（第三輪補齊）

- **CSV 匯入**：通用列表頁面（`GENERIC_PAGES`）現在有「匯入CSV」按鈕，格式跟
  「匯出CSV」產生的檔案一致（用欄位標籤對表頭），逐列呼叫 `genericAdd`，
  單列失敗不會中斷整批，最後回報成功/失敗筆數（見 `importCsvToPage`/`parseCsv`）
- **自動化測試**：`test/gas-mock.js` 用 Node 內建的 `vm` 模組模擬最少必要的
  Apps Script 服務（試算表讀寫、`Utilities`、`CacheService`），讓 `Code.gs`
  可以直接被載入執行；`test/run.js` 針對核心商業邏輯斷言（品管合格判定、
  密碼雜湊、權限矩陣、進貨庫存連動、批次成本試算、成品出貨扣庫存、零用金
  連動原料庫存、以及先前修過的 QC 表名 bug 的迴歸測試），跑 `node test/run.js`
  即可，共 23 個測試。**沒有**測試到需要真實 Google 服務的部分
  （`generateCustomerInvoiceXlsx` 用到 `DriveApp`/`UrlFetchApp`/
  `SpreadsheetApp.create`，這些在模擬環境裡沒有實作，只能手動在瀏覽器測）
- **CI**：`.github/workflows/ci.yml` 在 push/PR 到 main 時跑語法檢查＋
  `test/run.js`；`.github/workflows/deploy.yml`（沿用實習生系統的做法）
  在 push 到 main 時用 `clasp` 把 `apps-script/` 推上去並更新既有部署，
  **需要先設定三個 Secrets 才會動**（`CLASPRC_JSON`/`CLASP_SCRIPT_ID`/
  `CLASP_DEPLOYMENT_ID`），設定步驟寫在 `deploy.yml` 檔案開頭的註解裡

## 已知限制 / 下一步

1. `COMPANY_INFO`（請款單 Excel 用的公司資訊）目前是空白常數，要請使用者填
2. CI 自動部署還沒真的跑過（需要使用者本機執行 `clasp login`/`clasp pull`
   拿到 Secrets 填進 GitHub 才能生效，見 `deploy.yml` 開頭註解）
3. `addShipment` 用批號比對庫存，若同一批號同一產品因故被拆成多筆
   `ProductInventory`（理論上不會發生，`completeProductionBatch` 有做
   累加合併），扣庫存只會扣到第一筆吻合的紀錄
4. `generateCustomerInvoiceXlsx`、品管範本裡涉及真實 Google 服務的路徑，
   自動化測試無法覆蓋，改動後仍需手動在瀏覽器測試
