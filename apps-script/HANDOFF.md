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

## 已完成（第五輪：下拉選單連動 + 日期改成純下拉選單 + 介面美化）

- **進貨單**：選「原料」會自動帶出該原料的常用供應商（`Materials.defaultSupplierId`，
  在「原料主檔」表單新增了這個欄位，是通用列表表單引擎第一次支援 `type:'select'`
  跨表參照欄位，見 `GENERIC_PAGES` / `openGenericForm` / `genericFieldDisplay_`）
- **生產批次用料明細**：原本「原料批號」是自由輸入文字，改成選了原料後動態抓
  `materialBatchStock(token, materialId)`（後端新函式，依 `InventoryLogs` 算出
  該原料目前還有庫存的批號清單），下拉選單只列得出有庫存的批號並顯示剩餘量，
  避免打錯字或選到已經用完的批號
- **日期欄位全部從 `<input type="date">` 改成年/月/日三個 `<select>` 下拉選單**
  （`dateSelectHTML(id, value, optional)` / `dateSelectValue(id)`，定義在
  `Index.html` 前段）。原因是使用者實際部署後反映原生日期輸入框點了沒反應，
  改成純下拉選單比較保險、不依賴瀏覽器的原生日期選擇器。**這是全站慣例**，
  之後新增任何日期欄位都應該用這組函式，不要再用 `<input type="date">`
- **整體視覺重新設計**：CSS 變數統一色票、側邊欄改深色現代風格、卡片加陰影、
  表格加 hover/zebra 效果、按鈕加 hover/active 過場、彈出視窗加陰影與 focus
  outline、新增狀態彩色標籤 `tag(text, map)`（合格/不合格、生產批次狀態、
  請款狀態、QC 結果、零用金收支別、使用者啟用狀態、權限矩陣的 edit/view/none
  都改用顏色標籤呈現），登入頁也重新排版

## 已完成（第四輪：編輯/刪除/CSV 全頁面補齊，含首次真實部署踩到的坑）

實際走過一次從零部署（`clasp create` → `clasp push` → `clasp deploy` → 設定
GitHub Actions 自動部署）抓到兩個嚴重到系統完全打不開/登不進去的 bug：
- **`doGet` 進入點漏寫**：Apps Script 網頁應用程式一定要有 `doGet(e)` 函式，
  少了它部署出來的 `/exec` 網址只會顯示「找不到指令碼函式：doGet」。本機測試
  （`test/run.js`）测不到這個，因為測試直接呼叫後端函式，不會經過網頁應用程式
  的請求路徑——**如果之後要做類似的「進入點」函式，記得這類東西測試永遠測不到，
  只能實際部署後在瀏覽器測**。
- **`ensureSeedAdmin_` 雞生蛋蛋生雞**：原本只有 `getAllData()`（需要先登入才能呼叫）
  會建立預設 `admin` 帳號，導致全新試算表永遠無法登入。已改成 `login()` 一開始
  就呼叫 `ensureSeedAdmin_()`。已補迴歸測試（全新 sandbox 直接呼叫 `login` 不經過
  任何前置設定）。

功能面：
- **使用人員頁面補上編輯**：原本只有新增，沒有改密碼/角色/停用帳號的入口
  （這是使用者第一次登入後要改密碼時才發現漏做的）。
- **進貨單/生產批次/出貨單/零用金對帳都補上編輯與刪除**，原則是「會影響庫存/
  金流連動的欄位鎖住不能改」：
  - 進貨單：數量/原料/供應商鎖住（改了會跟已寫入的 `InventoryLogs` 對不起來），
    其他欄位可編輯，`updatePurchase` 會重算金額
  - 生產批次：**已完成入庫（`狀態==='完成'`）的批次不可編輯或刪除**（實際產量
    已經計入 `ProductInventory`），未完成的可以自由編輯除了產品以外的欄位
  - 出貨單：客戶/成品/批號/數量鎖住，`deleteShipment` 會把數量還原回成品庫存，
    **已經開立請款單的出貨不可刪除**（避免請款金額跟出貨明細對不起來）
  - 零用金：可以完整編輯，但編輯不會回頭調整已經連動建立的進貨/庫存紀錄
    （如果那筆有勾連動原料庫存），這是已知限制
  - 品管檢驗紀錄：**不提供編輯**（每筆綁定當初的範本項目結構，事後改容易錯亂），
    只能刪除重填
- **所有列表型頁面都加上「匯出CSV」**，通用列表頁（`GENERIC_PAGES`）額外有
  「匯入CSV」（逐列呼叫 `genericAdd`，格式跟匯出一致，單列失敗不中斷整批）
- 「成品庫存」「成本分析」「損益表」這幾個是**即時計算出來的報表**，只給匯出，
  不給編輯——資料本身不是存在表裡的，編輯沒有意義

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
