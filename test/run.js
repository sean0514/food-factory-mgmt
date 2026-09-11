// 輕量測試：把 Code.gs 載進一個模擬的 Apps Script 環境（見 gas-mock.js），
// 針對不需要真實 Google 服務（試算表/Drive/UrlFetch）的核心商業邏輯做斷言。
// 執行：node test/run.js
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');
const {createGasGlobals} = require('./gas-mock');

const code = fs.readFileSync(path.join(__dirname, '..', 'apps-script', 'Code.gs'), 'utf8');
const sandbox = createGasGlobals();
vm.createContext(sandbox);
vm.runInContext(code, sandbox, {filename: 'Code.gs'});

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    fn();
    passed++;
    console.log('  ok  ' + name);
  } catch (e) {
    failed++;
    console.log('  FAIL ' + name + '\n       ' + (e && e.message));
  }
}

console.log('evalQcItemPass_');
test('>=100 邊界內合格', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '>=100', '100'), true));
test('>=100 邊界外不合格', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '>=100', '99'), false));
test('<=5 合格', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '<=5', '5'), true));
test('區間 5-10 內合格', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '5-10', '7'), true));
test('區間 5-10 外不合格', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '5-10', '11'), false));
test('精確值比對', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '100', '100'), true));
test('無標準值時不擋（視為記錄用）', () => assert.strictEqual(sandbox.evalQcItemPass_('數值', '', '999'), true));
test('合格判定型別', () => {
  assert.strictEqual(sandbox.evalQcItemPass_('合格判定', '', '合格'), true);
  assert.strictEqual(sandbox.evalQcItemPass_('合格判定', '', '不合格'), false);
});
test('文字型別一律視為記錄用', () => assert.strictEqual(sandbox.evalQcItemPass_('文字', '', '任何值'), true));

console.log('hashPassword_ / login 基本行為');
test('同密碼同 salt 雜湊一致', () => {
  const h1 = sandbox.hashPassword_('abc123', 'salt-x');
  const h2 = sandbox.hashPassword_('abc123', 'salt-x');
  assert.strictEqual(h1, h2);
});
test('不同 salt 雜湊不同', () => {
  const h1 = sandbox.hashPassword_('abc123', 'salt-x');
  const h2 = sandbox.hashPassword_('abc123', 'salt-y');
  assert.notStrictEqual(h1, h2);
});

console.log('權限系統');
test('系統管理員永遠 edit（即使矩陣裡沒資料）', () => {
  assert.strictEqual(sandbox.permFor_('系統管理員', 'inventory'), 'edit');
  assert.strictEqual(sandbox.permFor_('系統管理員', '不存在的模組'), 'edit');
});
test('倉管人員預設對原料庫存有 edit 權限', () => {
  assert.strictEqual(sandbox.permFor_('倉管人員', 'inventory'), 'edit');
});
test('倉管人員預設對損益表沒有 edit 權限', () => {
  assert.notStrictEqual(sandbox.permFor_('倉管人員', 'incomeStatement'), 'edit');
});

// 建帳號＋登入，取得後續整合測試共用的 token
sandbox.ensureSeedAdmin_();
const session = sandbox.login('admin', 'admin123');
const token = session.token;

console.log('原料 / 進貨 / 庫存');
let materialId, supplierId;
test('新增供應商與原料', () => {
  supplierId = sandbox.genericAdd(token, 'suppliers', {name: '測試供應商'}).id;
  materialId = sandbox.genericAdd(token, 'materials', {name: '測試原料', unit: 'kg'}).id;
  assert.ok(materialId && supplierId);
});
test('新增進貨會建立入庫紀錄且金額=數量*單價', () => {
  const purchase = sandbox.addPurchase(token, {
    supplierId: supplierId, materialId: materialId, date: '2026-01-01',
    batchNo: 'B001', quantity: 10, unitPrice: 20
  });
  assert.strictEqual(purchase.amount, 200);
  assert.strictEqual(sandbox.materialStock_(materialId), 10);
});
test('用料出庫會扣減庫存', () => {
  sandbox.addProductionBatch(token, {productId: '999', date: '2026-01-02', actualQty: 5});
  const batches = sandbox.sheetToObjects_('ProductionBatches');
  const batchNo = batches[0].batchNo;
  sandbox.addProductionMaterialUsage(token, {batchNo: batchNo, materialId: materialId, materialBatchNo: 'B001', quantity: 4});
  assert.strictEqual(sandbox.materialStock_(materialId), 6);
});

console.log('生產批次成本試算');
test('批次成本＝原料成本（無其他費用時）', () => {
  const productId = sandbox.genericAdd(token, 'products', {name: '測試成品', price: 100}).id;
  const batch = sandbox.addProductionBatch(token, {productId: productId, date: '2026-02-01', actualQty: 10});
  sandbox.addProductionMaterialUsage(token, {batchNo: batch.batchNo, materialId: materialId, materialBatchNo: 'B001', quantity: 2});
  const cost = sandbox.batchCost(token, batch.batchNo);
  assert.strictEqual(cost.materialCost, 40); // 2 * 20
  assert.strictEqual(cost.unitCost, 4); // 40 / 10
  assert.strictEqual(cost.unitMargin, 96); // 100 - 4
});

console.log('成品庫存 / 出貨');
test('完成入庫後才能出貨，出貨會扣成品庫存', () => {
  const productId = sandbox.genericAdd(token, 'products', {name: '出貨測試成品', price: 50}).id;
  const customerId = sandbox.genericAdd(token, 'customers', {name: '測試客戶'}).id;
  const batch = sandbox.addProductionBatch(token, {productId: productId, date: '2026-03-01', actualQty: 20});
  assert.throws(() => sandbox.addShipment(token, {customerId: customerId, productId: productId, batchNo: batch.batchNo, date: '2026-03-02', quantity: 1, unitPrice: 50}),
    /尚未完成入庫/);
  sandbox.completeProductionBatch(token, batch.batchNo);
  assert.throws(() => sandbox.addShipment(token, {customerId: customerId, productId: productId, batchNo: batch.batchNo, date: '2026-03-02', quantity: 999, unitPrice: 50}),
    /庫存不足/);
  const shipment = sandbox.addShipment(token, {customerId: customerId, productId: productId, batchNo: batch.batchNo, date: '2026-03-02', quantity: 5, unitPrice: 50, tax: 0});
  assert.strictEqual(shipment.total, 250);
  const inv = sandbox.productInventorySummary(token).filter(i => i.batchNo === batch.batchNo)[0];
  assert.strictEqual(inv.quantity, 15);
});

console.log('零用金對帳（連動原料庫存）');
test('食材類支出自動建立原料/供應商/進貨與庫存', () => {
  const catId = sandbox.genericAdd(token, 'expenseCategories', {name: '食材', linkInventory: 'true'}).id;
  const before = sandbox.sheetToObjects_('Materials').length;
  sandbox.addPettyCashTransaction(token, {
    date: '2026-04-01', vendor: '菜市場阿姨', categoryId: catId, itemName: '新鮮雞蛋',
    direction: '支出', quantity: 10, unitPrice: 8, tax: 0, paymentMethod: '現金'
  });
  const after = sandbox.sheetToObjects_('Materials');
  assert.strictEqual(after.length, before + 1);
  const newMaterial = after.filter(m => m.name === '新鮮雞蛋')[0];
  assert.ok(newMaterial, '應該自動建立「新鮮雞蛋」原料');
  assert.strictEqual(sandbox.materialStock_(newMaterial.id), 10);
});
test('零用金餘額＝收入累計－支出累計', () => {
  const rows = sandbox.pettyCashList(token);
  const manualBalance = rows.reduce((bal, r) => bal + (r.direction === '支出' ? -Number(r.total) : Number(r.total)), 0);
  assert.strictEqual(rows[rows.length - 1].runningBalance, manualBalance);
});

console.log('通用 CRUD 表名解析（迴歸測試：QC* 開頭大寫縮寫表名）');
test('genericAdd/Delete 對 qcTemplates 正常運作（不會因表名轉換錯誤而找不到分頁）', () => {
  const tpl = sandbox.genericAdd(token, 'qcTemplates', {name: '測試範本', appliesTo: '原料'});
  assert.ok(tpl.id);
  assert.strictEqual(sandbox.genericDelete(token, 'qcTemplates', tpl.id), true);
});
test('genericAdd 對 qcTemplateItems 正常運作', () => {
  const tpl = sandbox.genericAdd(token, 'qcTemplates', {name: '測試範本2', appliesTo: '成品'});
  const item = sandbox.genericAdd(token, 'qcTemplateItems', {templateId: tpl.id, itemName: '重量', spec: '>=100', dataType: '數值'});
  assert.ok(item.id);
});

console.log('\n' + passed + ' passed, ' + failed + ' failed');
if (failed > 0) process.exit(1);
