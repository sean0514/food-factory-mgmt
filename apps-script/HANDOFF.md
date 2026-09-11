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

## 已知限制 / 下一步

1. `COMPANY_INFO`（請款單 Excel 用的公司資訊）目前是空白常數，要請使用者填
2. CSV 只做了匯出，還沒做匯入（實習生系統有共用函式 `handleImportGenericFile`
   等可以參考移植，之後要做的話建議走同一套模式）
3. 沒有自動化測試，所有修改都要手動在瀏覽器測試
4. 沒有 GitHub Actions 自動部署（實習生系統有 `clasp` 部署流程可參考），
   目前部署方式是手動貼進 Apps Script 線上編輯器（見 `README.md`）
5. `addShipment` 用批號比對庫存，若同一批號同一產品因故被拆成多筆
   `ProductInventory`（理論上不會發生，`completeProductionBatch` 有做
   累加合併），扣庫存只會扣到第一筆吻合的紀錄
