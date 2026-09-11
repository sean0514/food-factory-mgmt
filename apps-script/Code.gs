/**
 * 食品工廠管理系統 — 後端
 * 架構沿用「境外實習生管理系統」：Apps Script + Google 試算表，單一 Code.gs + Index.html。
 */

// 網頁應用程式的進入點，部署為網頁應用程式時 Apps Script 會呼叫這個函式
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('食品工廠管理系統')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============ 基礎設定 ============

var ROLES = ['系統管理員', '廠長主管', '倉管人員', '產線人員', '品管人員', '業務出貨人員', '會計人員'];

// 每張表的欄位定義：key 是程式裡用的欄位名，label 是試算表表頭（中文）
var SHEET_FIELDS = {
  Materials: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '原料名稱'},
    {key: 'category', label: '分類'},
    {key: 'unit', label: '單位'},
    {key: 'defaultSupplierId', label: '常用供應商ID'},
    {key: 'safetyStock', label: '安全庫存量'},
    {key: 'storageCondition', label: '儲存條件'},
    {key: 'note', label: '備註'}
  ],
  Suppliers: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '供應商名稱'},
    {key: 'contact', label: '聯絡人'},
    {key: 'phone', label: '電話'},
    {key: 'address', label: '地址'},
    {key: 'taxId', label: '統編'}
  ],
  Purchases: [
    {key: 'id', label: 'ID'},
    {key: 'purchaseNo', label: '進貨單號'},
    {key: 'supplierId', label: '供應商ID'},
    {key: 'date', label: '進貨日期'},
    {key: 'materialId', label: '原料ID'},
    {key: 'batchNo', label: '原料批號'},
    {key: 'quantity', label: '數量'},
    {key: 'unitPrice', label: '單價'},
    {key: 'amount', label: '金額'},
    {key: 'expiryDate', label: '效期'},
    {key: 'inspectionStatus', label: '驗收狀態'},
    {key: 'source', label: '來源'},
    {key: 'note', label: '備註'}
  ],
  InventoryLogs: [
    {key: 'id', label: 'ID'},
    {key: 'materialId', label: '原料ID'},
    {key: 'batchNo', label: '批號'},
    {key: 'type', label: '異動類型'},
    {key: 'quantity', label: '數量'},
    {key: 'date', label: '日期'},
    {key: 'refType', label: '關聯類型'},
    {key: 'refId', label: '關聯單據ID'},
    {key: 'operator', label: '操作人'},
    {key: 'note', label: '備註'}
  ],
  ProductionBatches: [
    {key: 'id', label: 'ID'},
    {key: 'batchNo', label: '生產批號'},
    {key: 'productId', label: '產品ID'},
    {key: 'date', label: '生產日期'},
    {key: 'line', label: '產線'},
    {key: 'responsible', label: '負責人'},
    {key: 'plannedQty', label: '計畫產量'},
    {key: 'actualQty', label: '實際產量'},
    {key: 'status', label: '狀態'},
    {key: 'note', label: '備註'}
  ],
  ProductionMaterialUsage: [
    {key: 'id', label: 'ID'},
    {key: 'batchNo', label: '生產批號'},
    {key: 'materialId', label: '原料ID'},
    {key: 'materialBatchNo', label: '使用原料批號'},
    {key: 'quantity', label: '使用數量'}
  ],
  ProductionExpenses: [
    {key: 'id', label: 'ID'},
    {key: 'batchNo', label: '生產批號'},
    {key: 'month', label: '月份'},
    {key: 'type', label: '費用類型'},
    {key: 'amount', label: '金額'},
    {key: 'allocation', label: '分攤方式'},
    {key: 'note', label: '備註'}
  ],
  Products: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '品名'},
    {key: 'spec', label: '規格'},
    {key: 'unit', label: '單位'},
    {key: 'shelfLifeDays', label: '保存期限(天)'},
    {key: 'price', label: '售價'}
  ],
  ProductInventory: [
    {key: 'id', label: 'ID'},
    {key: 'batchNo', label: '成品批號'},
    {key: 'productId', label: '產品ID'},
    {key: 'quantity', label: '數量'},
    {key: 'expiryDate', label: '效期'},
    {key: 'location', label: '儲位'}
  ],
  Customers: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '客戶名稱'},
    {key: 'contact', label: '聯絡人'},
    {key: 'phone', label: '電話'},
    {key: 'address', label: '地址'},
    {key: 'taxId', label: '統編'}
  ],
  Shipments: [
    {key: 'id', label: 'ID'},
    {key: 'shipmentNo', label: '出貨單號'},
    {key: 'customerId', label: '客戶ID'},
    {key: 'date', label: '出貨日期'},
    {key: 'productId', label: '成品ID'},
    {key: 'batchNo', label: '成品批號'},
    {key: 'quantity', label: '數量'},
    {key: 'unitPrice', label: '單價'},
    {key: 'amount', label: '金額'},
    {key: 'tax', label: '稅金'},
    {key: 'total', label: '總計'},
    {key: 'invoiceId', label: '請款單ID'},
    {key: 'note', label: '備註'}
  ],
  CustomerInvoices: [
    {key: 'id', label: 'ID'},
    {key: 'invoiceNo', label: '請款單號'},
    {key: 'customerId', label: '客戶ID'},
    {key: 'periodStart', label: '期間起'},
    {key: 'periodEnd', label: '期間迄'},
    {key: 'totalAmount', label: '總金額'},
    {key: 'status', label: '狀態'},
    {key: 'issueDate', label: '開單日期'},
    {key: 'receivedDate', label: '收款日期'},
    {key: 'note', label: '備註'}
  ],
  QCTemplates: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '範本名稱'},
    {key: 'appliesTo', label: '適用對象'}
  ],
  QCTemplateItems: [
    {key: 'id', label: 'ID'},
    {key: 'templateId', label: '範本ID'},
    {key: 'itemName', label: '檢驗項目'},
    {key: 'spec', label: '標準值/規格'},
    {key: 'dataType', label: '資料型態'}
  ],
  QCRecords: [
    {key: 'id', label: 'ID'},
    {key: 'templateId', label: '範本ID'},
    {key: 'refType', label: '關聯類型'},
    {key: 'refBatchNo', label: '關聯批號'},
    {key: 'inspector', label: '檢驗人'},
    {key: 'date', label: '檢驗日期'},
    {key: 'result', label: '總結果'},
    {key: 'note', label: '備註'}
  ],
  QCRecordItems: [
    {key: 'id', label: 'ID'},
    {key: 'recordId', label: '檢驗紀錄ID'},
    {key: 'templateItemId', label: '範本項目ID'},
    {key: 'value', label: '實際值'},
    {key: 'pass', label: '是否合格'}
  ],
  ExpenseCategories: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '類別名稱'},
    {key: 'linkInventory', label: '連動原料庫存'}
  ],
  PettyCashTransactions: [
    {key: 'id', label: 'ID'},
    {key: 'date', label: '日期'},
    {key: 'vendor', label: '廠商'},
    {key: 'categoryId', label: '類別ID'},
    {key: 'itemName', label: '品名'},
    {key: 'direction', label: '收支別'},
    {key: 'quantity', label: '數量'},
    {key: 'unitPrice', label: '單價'},
    {key: 'amount', label: '金額'},
    {key: 'tax', label: '稅金'},
    {key: 'total', label: '總計'},
    {key: 'paymentMethod', label: '付款方式'},
    {key: 'invoiceDate', label: '收到發票日'},
    {key: 'remittanceDate', label: '匯款日'},
    {key: 'linkedMaterialId', label: '連動原料ID'},
    {key: 'linkedPurchaseId', label: '連動進貨ID'},
    {key: 'note', label: '備註'}
  ],
  AccountCategories: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '科目名稱'},
    {key: 'type', label: '類型'},
    {key: 'source', label: '資料來源'},
    {key: 'autoSource', label: '自動來源對應'}
  ],
  ManualLedgerEntries: [
    {key: 'id', label: 'ID'},
    {key: 'month', label: '月份'},
    {key: 'categoryId', label: '科目ID'},
    {key: 'counterparty', label: '對象'},
    {key: 'amount', label: '金額'},
    {key: 'note', label: '備註'}
  ],
  Partners: [
    {key: 'id', label: 'ID'},
    {key: 'name', label: '合夥人姓名'},
    {key: 'sharePct', label: '分潤比例(%)'}
  ],
  ProfitPayouts: [
    {key: 'id', label: 'ID'},
    {key: 'month', label: '月份'},
    {key: 'partnerId', label: '合夥人ID'},
    {key: 'dueAmount', label: '應分金額'},
    {key: 'paidAmount', label: '已給付金額'},
    {key: 'paidDate', label: '給付日期'},
    {key: 'status', label: '狀態'}
  ],
  Users: [
    {key: 'id', label: 'ID'},
    {key: 'username', label: '帳號'},
    {key: 'passwordHash', label: '密碼雜湊'},
    {key: 'salt', label: 'Salt'},
    {key: 'name', label: '姓名'},
    {key: 'role', label: '角色'},
    {key: 'active', label: '啟用'}
  ],
  RolePermissions: [
    {key: 'module', label: '模組'},
    {key: 'role', label: '角色'},
    {key: 'level', label: '權限等級'}
  ]
};

// 頁面 key -> 權限模組 key（不同名才需要在這裡列）
var PAGE_MODULE_MAP = {
  materials: 'inventory',
  suppliers: 'inventory',
  purchases: 'inventory',
  inventoryLogs: 'inventory',
  productionBatches: 'production',
  productionExpenses: 'production',
  products: 'shipping',
  productInventory: 'shipping',
  customers: 'shipping',
  shipments: 'shipping',
  customerInvoices: 'billing',
  qcTemplates: 'qc',
  qcRecords: 'qc',
  costAnalysis: 'cost',
  pettyCash: 'pettyCash',
  incomeStatement: 'incomeStatement',
  partners: 'incomeStatement',
  users: 'users',
  expenseCategories: 'pettyCash',
  accountCategories: 'incomeStatement',
  manualLedgerEntries: 'incomeStatement',
  qcTemplateItems: 'qc'
};

var PERMISSION_MODULES = ['dashboard', 'inventory', 'production', 'shipping', 'billing', 'qc', 'cost', 'pettyCash', 'incomeStatement', 'users'];

var PERMISSION_MODULE_LABELS = {
  dashboard: '儀表板',
  inventory: '原料與庫存',
  production: '生產管理',
  shipping: '成品與出貨',
  billing: '客戶請款明細',
  qc: '品質/食安',
  cost: '成本分析',
  pettyCash: '零用金對帳',
  incomeStatement: '損益表',
  users: '使用人員'
};

var DEFAULT_PERMISSIONS = {}; // module -> role -> level ('edit'/'view'/'none')，缺的會在 getRolePermissionsMap_ 自動補預設值
(function seedDefaults() {
  PERMISSION_MODULES.forEach(function(m) {
    DEFAULT_PERMISSIONS[m] = {};
    ROLES.forEach(function(r) {
      var level = 'view';
      if (r === '倉管人員' && m === 'inventory') level = 'edit';
      if (r === '產線人員' && m === 'production') level = 'edit';
      if (r === '業務出貨人員' && (m === 'shipping' || m === 'billing')) level = 'edit';
      if (r === '品管人員' && m === 'qc') level = 'edit';
      if (r === '會計人員' && (m === 'cost' || m === 'pettyCash' || m === 'incomeStatement' || m === 'billing')) level = 'edit';
      if (r === '廠長主管') level = 'view';
      if (m === 'users' && r !== '系統管理員') level = 'none';
      DEFAULT_PERMISSIONS[m][r] = level;
    });
  });
})();

// ============ 試算表存取 ============

function getSs_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  var ss = getSs_();
  var sheet = ss.getSheetByName(name);
  var fields = SHEET_FIELDS[name];
  if (!sheet) {
    sheet = ss.insertSheet(name);
    sheet.appendRow(fields.map(function(f) { return f.label; }));
  } else if (sheet.getLastRow() === 0) {
    sheet.appendRow(fields.map(function(f) { return f.label; }));
  }
  return sheet;
}

function sheetToObjects_(name) {
  var sheet = getSheet_(name);
  var fields = SHEET_FIELDS[name];
  var lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, fields.length).getValues();
  return values.map(function(row, idx) {
    var obj = {_row: idx + 2};
    fields.forEach(function(f, i) {
      var v = row[i];
      if (v instanceof Date) v = Utilities.formatDate(v, 'Asia/Taipei', 'yyyy-MM-dd');
      obj[f.key] = v;
    });
    return obj;
  });
}

function objectToRow_(name, obj) {
  var fields = SHEET_FIELDS[name];
  return fields.map(function(f) {
    var v = obj[f.key];
    return v === undefined || v === null ? '' : v;
  });
}

function nextId_(name) {
  var rows = sheetToObjects_(name);
  var max = 0;
  rows.forEach(function(r) {
    var n = parseInt(String(r.id).replace(/[^0-9]/g, ''), 10);
    if (!isNaN(n) && n > max) max = n;
  });
  return String(max + 1);
}

function appendObject_(name, obj) {
  var sheet = getSheet_(name);
  sheet.appendRow(objectToRow_(name, obj));
  return obj;
}

function updateObjectById_(name, id, patch) {
  var rows = sheetToObjects_(name);
  var target = rows.filter(function(r) { return String(r.id) === String(id); })[0];
  if (!target) throw new Error('找不到資料：' + id);
  var merged = {};
  Object.keys(target).forEach(function(k) { if (k !== '_row') merged[k] = target[k]; });
  Object.keys(patch).forEach(function(k) { merged[k] = patch[k]; });
  var sheet = getSheet_(name);
  var fields = SHEET_FIELDS[name];
  sheet.getRange(target._row, 1, 1, fields.length).setValues([objectToRow_(name, merged)]);
  return merged;
}

function deleteObjectById_(name, id) {
  var rows = sheetToObjects_(name);
  var target = rows.filter(function(r) { return String(r.id) === String(id); })[0];
  if (!target) return false;
  getSheet_(name).deleteRow(target._row);
  return true;
}

// ============ 權限系統 ============

function getRolePermissionsMap_() {
  var sheet = getSheet_('RolePermissions');
  var rows = sheetToObjects_('RolePermissions');
  var map = {};
  rows.forEach(function(r) {
    if (!map[r.module]) map[r.module] = {};
    map[r.module][r.role] = r.level;
  });
  var toAppend = [];
  PERMISSION_MODULES.forEach(function(m) {
    if (!map[m]) map[m] = {};
    ROLES.forEach(function(r) {
      if (!map[m][r]) {
        var lvl = (DEFAULT_PERMISSIONS[m] && DEFAULT_PERMISSIONS[m][r]) || 'view';
        map[m][r] = lvl;
        toAppend.push([m, r, lvl]);
      }
    });
  });
  if (toAppend.length) {
    var startRow = sheet.getLastRow() + 1;
    sheet.getRange(startRow, 1, toAppend.length, 3).setValues(toAppend);
  }
  return map;
}

function permFor_(role, moduleKey) {
  if (role === '系統管理員') return 'edit';
  var map = getRolePermissionsMap_();
  return (map[moduleKey] && map[moduleKey][role]) || 'none';
}

function pageModuleKey_(page) {
  return PAGE_MODULE_MAP[page] || page;
}

function requireEdit_(session, page) {
  var moduleKey = pageModuleKey_(page);
  var level = permFor_(session.role, moduleKey);
  if (level !== 'edit') throw new Error('沒有編輯權限：' + moduleKey);
}

function updateRolePermission(token, module, role, level) {
  var session = requireSession_(token);
  if (permFor_(session.role, 'users') !== 'edit') throw new Error('沒有權限');
  if (role === '系統管理員') throw new Error('系統管理員權限不可修改');
  var sheet = getSheet_('RolePermissions');
  var rows = sheetToObjects_('RolePermissions');
  var target = rows.filter(function(r) { return r.module === module && r.role === role; })[0];
  if (target) {
    sheet.getRange(target._row, 3).setValue(level);
  } else {
    sheet.appendRow([module, role, level]);
  }
  return getRolePermissionsMap_();
}

// ============ 帳號 / Session ============

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + password);
  return raw.map(function(b) { return (b < 0 ? b + 256 : b).toString(16).padStart(2, '0'); }).join('');
}

function makeSalt_() {
  return Utilities.getUuid();
}

function login(username, password) {
  var users = sheetToObjects_('Users');
  var user = users.filter(function(u) { return u.username === username && String(u.active) !== 'false'; })[0];
  if (!user) throw new Error('帳號或密碼錯誤');
  var hash = hashPassword_(password, user.salt);
  if (hash !== user.passwordHash) throw new Error('帳號或密碼錯誤');
  var token = Utilities.getUuid();
  var session = {userId: user.id, username: user.username, name: user.name, role: user.role};
  CacheService.getScriptCache().put('session_' + token, JSON.stringify(session), 21600); // 6 小時
  return {token: token, user: session};
}

function requireSession_(token) {
  var raw = CacheService.getScriptCache().get('session_' + token);
  if (!raw) throw new Error('登入逾時，請重新登入');
  return JSON.parse(raw);
}

function addUser(token, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'users');
  var salt = makeSalt_();
  var obj = {
    id: nextId_('Users'),
    username: data.username,
    passwordHash: hashPassword_(data.password, salt),
    salt: salt,
    name: data.name,
    role: data.role,
    active: true
  };
  return appendObject_('Users', obj);
}

function updateUser(token, id, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'users');
  var patch = {name: data.name, role: data.role, active: data.active};
  if (data.password) {
    var salt = makeSalt_();
    patch.salt = salt;
    patch.passwordHash = hashPassword_(data.password, salt);
  }
  return updateObjectById_('Users', id, patch);
}

function deleteUser(token, id) {
  var session = requireSession_(token);
  requireEdit_(session, 'users');
  return deleteObjectById_('Users', id);
}

// 第一次執行時如果 Users 是空的，自動建立一個系統管理員帳號 admin/admin123
function ensureSeedAdmin_() {
  var users = sheetToObjects_('Users');
  if (users.length === 0) {
    var salt = makeSalt_();
    appendObject_('Users', {
      id: '1', username: 'admin', passwordHash: hashPassword_('admin123', salt), salt: salt,
      name: '系統管理員', role: '系統管理員', active: true
    });
  }
}

// ============ 整批資料 / 通用 CRUD ============

var LIST_TABLES = ['Materials', 'Suppliers', 'Purchases', 'InventoryLogs', 'ProductionBatches',
  'ProductionMaterialUsage', 'ProductionExpenses', 'Products', 'ProductInventory', 'Customers',
  'Shipments', 'CustomerInvoices', 'QCTemplates', 'QCTemplateItems', 'QCRecords', 'QCRecordItems',
  'ExpenseCategories', 'PettyCashTransactions', 'AccountCategories', 'ManualLedgerEntries',
  'Partners', 'ProfitPayouts', 'Users', 'RolePermissions'];

function getAllData(token) {
  ensureSeedAdmin_();
  var session = requireSession_(token);
  var data = {};
  LIST_TABLES.forEach(function(t) {
    if (t === 'Users') {
      data.users = sheetToObjects_('Users').map(function(u) {
        return {id: u.id, username: u.username, name: u.name, role: u.role, active: u.active};
      });
      return;
    }
    data[t.charAt(0).toLowerCase() + t.slice(1)] = sheetToObjects_(t);
  });
  var permissions = {};
  PERMISSION_MODULES.forEach(function(m) { permissions[m] = permFor_(session.role, m); });
  var result = {user: session, permissions: permissions};
  Object.keys(data).forEach(function(k) { result[k] = data[k]; });
  if (permissions.users !== 'none') {
    result.roleMatrix = getRolePermissionsMap_();
  }
  return result;
}

function genericAdd(token, table, data) {
  var session = requireSession_(token);
  requireEdit_(session, table);
  data.id = nextId_(cap_(table));
  return appendObject_(cap_(table), data);
}

function genericUpdate(token, table, id, data) {
  var session = requireSession_(token);
  requireEdit_(session, table);
  return updateObjectById_(cap_(table), id, data);
}

function genericDelete(token, table, id) {
  var session = requireSession_(token);
  requireEdit_(session, table);
  return deleteObjectById_(cap_(table), id);
}

// 前端傳來的 table key 是 lower-camel（例如 qcTemplates），對應到 SHEET_FIELDS 的實際表名
// （不能單純把第一個字母大寫，因為像 QCTemplates 這種開頭是大寫縮寫的表名對不上）
var TABLE_NAME_OVERRIDES_ = {qcTemplates: 'QCTemplates', qcTemplateItems: 'QCTemplateItems', qcRecords: 'QCRecords', qcRecordItems: 'QCRecordItems'};
function cap_(s) {
  if (TABLE_NAME_OVERRIDES_[s]) return TABLE_NAME_OVERRIDES_[s];
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ============ 原料 / 庫存 ============

function addPurchase(token, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'inventory');
  data.id = nextId_('Purchases');
  data.amount = (Number(data.quantity) || 0) * (Number(data.unitPrice) || 0);
  data.source = data.source || '進貨單';
  appendObject_('Purchases', data);
  appendObject_('InventoryLogs', {
    id: nextId_('InventoryLogs'), materialId: data.materialId, batchNo: data.batchNo,
    type: '入庫', quantity: data.quantity, date: data.date, refType: '進貨單', refId: data.id,
    operator: session.name, note: '進貨單 ' + (data.purchaseNo || '')
  });
  return data;
}

function materialStock_(materialId) {
  var logs = sheetToObjects_('InventoryLogs').filter(function(l) { return String(l.materialId) === String(materialId); });
  var qty = 0;
  logs.forEach(function(l) {
    var n = Number(l.quantity) || 0;
    if (l.type === '入庫') qty += n;
    else qty -= n;
  });
  return qty;
}

function materialStockList(token) {
  requireSession_(token);
  var materials = sheetToObjects_('Materials');
  return materials.map(function(m) {
    return {materialId: m.id, name: m.name, unit: m.unit, safetyStock: m.safetyStock, stock: materialStock_(m.id)};
  });
}

function materialPriceTrend(token, materialId) {
  requireSession_(token);
  return sheetToObjects_('Purchases')
    .filter(function(p) { return String(p.materialId) === String(materialId); })
    .sort(function(a, b) { return new Date(a.date) - new Date(b.date); })
    .map(function(p) { return {date: p.date, unitPrice: Number(p.unitPrice) || 0, purchaseNo: p.purchaseNo, batchNo: p.batchNo}; });
}

// ============ 生產管理 ============

function nextBatchNo_(table, dateStr) {
  var d = dateStr ? new Date(dateStr) : new Date();
  var prefix = Utilities.formatDate(d, 'Asia/Taipei', 'yyyyMMdd');
  var rows = sheetToObjects_(table);
  var maxSeq = 0;
  rows.forEach(function(r) {
    if (r.batchNo && String(r.batchNo).indexOf(prefix) === 0) {
      var seq = parseInt(String(r.batchNo).split('-')[1], 10);
      if (!isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  });
  return prefix + '-' + String(maxSeq + 1).padStart(3, '0');
}

function addProductionBatch(token, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'production');
  data.id = nextId_('ProductionBatches');
  data.batchNo = data.batchNo || nextBatchNo_('ProductionBatches', data.date);
  data.status = data.status || '生產中';
  return appendObject_('ProductionBatches', data);
}

function addProductionMaterialUsage(token, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'production');
  data.id = nextId_('ProductionMaterialUsage');
  appendObject_('ProductionMaterialUsage', data);
  appendObject_('InventoryLogs', {
    id: nextId_('InventoryLogs'), materialId: data.materialId, batchNo: data.materialBatchNo,
    type: '出庫', quantity: data.quantity, date: new Date(), refType: '生產批次', refId: data.batchNo,
    operator: session.name, note: '生產用料'
  });
  return data;
}

function completeProductionBatch(token, batchNo) {
  var session = requireSession_(token);
  requireEdit_(session, 'production');
  var batch = sheetToObjects_('ProductionBatches').filter(function(b) { return b.batchNo === batchNo; })[0];
  if (!batch) throw new Error('找不到生產批次：' + batchNo);
  if (batch.status === '完成') throw new Error('該批次已完成入庫，不可重複入庫');
  var product = sheetToObjects_('Products').filter(function(p) { return String(p.id) === String(batch.productId); })[0];
  var qty = Number(batch.actualQty) || 0;
  if (!qty) throw new Error('實際產量為 0，請先填實際產量');
  var expiryDate = '';
  if (product && product.shelfLifeDays) {
    var d = new Date(batch.date);
    d.setDate(d.getDate() + Number(product.shelfLifeDays));
    expiryDate = Utilities.formatDate(d, 'Asia/Taipei', 'yyyy-MM-dd');
  }
  var existing = sheetToObjects_('ProductInventory').filter(function(i) { return i.batchNo === batchNo && String(i.productId) === String(batch.productId); })[0];
  if (existing) {
    updateObjectById_('ProductInventory', existing.id, {quantity: (Number(existing.quantity) || 0) + qty});
  } else {
    appendObject_('ProductInventory', {
      id: nextId_('ProductInventory'), batchNo: batchNo, productId: batch.productId,
      quantity: qty, expiryDate: expiryDate, location: ''
    });
  }
  return updateObjectById_('ProductionBatches', batch.id, {status: '完成'});
}

// ============ 成本分析 ============

function materialAvgUnitPrice_(materialId, batchNo) {
  var purchases = sheetToObjects_('Purchases').filter(function(p) {
    return String(p.materialId) === String(materialId) && (!batchNo || p.batchNo === batchNo);
  });
  if (!purchases.length) return 0;
  var sum = 0, qty = 0;
  purchases.forEach(function(p) { sum += Number(p.unitPrice) || 0; qty++; });
  return qty ? sum / qty : 0;
}

function batchCost(token, batchNo) {
  requireSession_(token);
  var usage = sheetToObjects_('ProductionMaterialUsage').filter(function(u) { return u.batchNo === batchNo; });
  var materialCost = 0;
  usage.forEach(function(u) {
    var price = materialAvgUnitPrice_(u.materialId, u.materialBatchNo);
    materialCost += price * (Number(u.quantity) || 0);
  });
  var batch = sheetToObjects_('ProductionBatches').filter(function(b) { return b.batchNo === batchNo; })[0];
  var month = batch ? String(batch.date).slice(0, 7) : '';
  var directExpense = 0;
  sheetToObjects_('ProductionExpenses').filter(function(e) { return e.batchNo === batchNo; })
    .forEach(function(e) { directExpense += Number(e.amount) || 0; });

  var commonExpense = 0;
  var monthExpenses = sheetToObjects_('ProductionExpenses').filter(function(e) { return !e.batchNo && e.month === month; });
  if (monthExpenses.length) {
    var monthBatches = sheetToObjects_('ProductionBatches').filter(function(b) { return String(b.date).slice(0, 7) === month; });
    var totalQty = 0;
    monthBatches.forEach(function(b) { totalQty += Number(b.actualQty) || 0; });
    var thisQty = Number(batch && batch.actualQty) || 0;
    var totalCommon = 0;
    monthExpenses.forEach(function(e) { totalCommon += Number(e.amount) || 0; });
    commonExpense = totalQty ? totalCommon * (thisQty / totalQty) : 0;
  }
  var totalCost = materialCost + directExpense + commonExpense;
  var actualQty = Number(batch && batch.actualQty) || 0;
  var unitCost = actualQty ? totalCost / actualQty : 0;
  var product = batch ? sheetToObjects_('Products').filter(function(p) { return String(p.id) === String(batch.productId); })[0] : null;
  var price = product ? Number(product.price) || 0 : 0;
  return {
    batchNo: batchNo, materialCost: materialCost, directExpense: directExpense, commonExpense: commonExpense,
    totalCost: totalCost, actualQty: actualQty, unitCost: unitCost, price: price, unitMargin: price - unitCost
  };
}

function monthlyCostReport(token, month) {
  requireSession_(token);
  var batches = sheetToObjects_('ProductionBatches').filter(function(b) { return String(b.date).slice(0, 7) === month; });
  var rows = batches.map(function(b) { return batchCost(token, b.batchNo); });
  var totals = rows.reduce(function(acc, r) {
    acc.materialCost += r.materialCost; acc.directExpense += r.directExpense;
    acc.commonExpense += r.commonExpense; acc.totalCost += r.totalCost;
    return acc;
  }, {materialCost: 0, directExpense: 0, commonExpense: 0, totalCost: 0});
  return {month: month, rows: rows, totals: totals};
}

// ============ 成品出貨 ============

function addShipment(token, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'shipping');
  var qty = Number(data.quantity) || 0;
  var inv = sheetToObjects_('ProductInventory').filter(function(i) {
    return String(i.productId) === String(data.productId) && i.batchNo === data.batchNo;
  })[0];
  if (!inv) throw new Error('找不到該成品批號的庫存紀錄（可能尚未完成入庫）：' + data.batchNo);
  var stockQty = Number(inv.quantity) || 0;
  if (stockQty < qty) throw new Error('庫存不足：批號 ' + data.batchNo + ' 目前庫存 ' + stockQty + '，出貨數量 ' + qty);
  data.id = nextId_('Shipments');
  data.shipmentNo = data.shipmentNo || ('SH' + Utilities.formatDate(new Date(data.date || new Date()), 'Asia/Taipei', 'yyyyMMdd') + '-' + data.id);
  data.amount = qty * (Number(data.unitPrice) || 0);
  data.total = data.amount + (Number(data.tax) || 0);
  appendObject_('Shipments', data);
  updateObjectById_('ProductInventory', inv.id, {quantity: stockQty - qty});
  return data;
}

function productInventorySummary(token) {
  requireSession_(token);
  var products = sheetToObjects_('Products');
  return sheetToObjects_('ProductInventory').map(function(i) {
    var p = products.filter(function(x) { return String(x.id) === String(i.productId); })[0];
    return {id: i.id, batchNo: i.batchNo, productId: i.productId, productName: p ? p.name : i.productId,
      quantity: i.quantity, expiryDate: i.expiryDate, location: i.location};
  });
}

// ============ 客戶請款明細 ============

function createCustomerInvoice(token, customerId, periodStart, periodEnd) {
  var session = requireSession_(token);
  requireEdit_(session, 'billing');
  var shipments = sheetToObjects_('Shipments').filter(function(s) {
    return String(s.customerId) === String(customerId) && !s.invoiceId &&
      s.date >= periodStart && s.date <= periodEnd;
  });
  if (!shipments.length) throw new Error('該期間內找不到未請款的出貨紀錄');
  var totalAmount = 0;
  shipments.forEach(function(s) { totalAmount += Number(s.total) || 0; });
  var invoiceId = nextId_('CustomerInvoices');
  var invoice = {
    id: invoiceId,
    invoiceNo: 'INV' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyyMMdd') + '-' + invoiceId,
    customerId: customerId, periodStart: periodStart, periodEnd: periodEnd,
    totalAmount: totalAmount, status: '已請款', issueDate: Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy-MM-dd'),
    receivedDate: '', note: ''
  };
  appendObject_('CustomerInvoices', invoice);
  shipments.forEach(function(s) { updateObjectById_('Shipments', s.id, {invoiceId: invoiceId}); });
  return invoice;
}

function markInvoiceReceived(token, invoiceId, receivedDate) {
  var session = requireSession_(token);
  requireEdit_(session, 'billing');
  return updateObjectById_('CustomerInvoices', invoiceId, {status: '已收款', receivedDate: receivedDate});
}

function getInvoiceDetail(token, invoiceId) {
  requireSession_(token);
  var invoice = sheetToObjects_('CustomerInvoices').filter(function(i) { return String(i.id) === String(invoiceId); })[0];
  if (!invoice) throw new Error('找不到請款單');
  var items = sheetToObjects_('Shipments').filter(function(s) { return String(s.invoiceId) === String(invoiceId); });
  return {invoice: invoice, items: items};
}

var COMPANY_INFO = {
  name: '（請於 COMPANY_INFO 常數填入公司名稱）',
  address: '',
  taxId: '',
  bank: ''
};

function generateCustomerInvoiceXlsx(token, invoiceId) {
  requireSession_(token);
  var detail = getInvoiceDetail(token, invoiceId);
  var customer = sheetToObjects_('Customers').filter(function(c) { return String(c.id) === String(detail.invoice.customerId); })[0];
  var products = sheetToObjects_('Products');
  var tempSs = SpreadsheetApp.create('請款單_' + detail.invoice.invoiceNo);
  var sheet1 = tempSs.getSheets()[0];
  sheet1.setName('請款單');
  sheet1.appendRow(['請款單號', detail.invoice.invoiceNo]);
  sheet1.appendRow(['客戶', customer ? customer.name : '']);
  sheet1.appendRow(['期間', detail.invoice.periodStart + ' ~ ' + detail.invoice.periodEnd]);
  sheet1.appendRow(['總金額', detail.invoice.totalAmount]);
  sheet1.appendRow(['公司', COMPANY_INFO.name]);
  sheet1.appendRow(['統編', COMPANY_INFO.taxId]);
  sheet1.appendRow(['銀行資訊', COMPANY_INFO.bank]);

  var sheet2 = tempSs.insertSheet('出貨明細');
  sheet2.appendRow(['出貨單號', '出貨日期', '成品', '批號', '數量', '單價', '金額', '稅金', '總計']);
  detail.items.forEach(function(s) {
    var p = products.filter(function(pp) { return String(pp.id) === String(s.productId); })[0];
    sheet2.appendRow([s.shipmentNo, s.date, p ? p.name : s.productId, s.batchNo, s.quantity, s.unitPrice, s.amount, s.tax, s.total]);
  });

  var url = 'https://docs.google.com/spreadsheets/d/' + tempSs.getId() + '/export?format=xlsx';
  var token_ = ScriptApp.getOAuthToken();
  var response = UrlFetchApp.fetch(url, {headers: {Authorization: 'Bearer ' + token_}});
  var blob = response.getBlob().setName(detail.invoice.invoiceNo + '.xlsx');
  var base64 = Utilities.base64Encode(blob.getBytes());
  DriveApp.getFileById(tempSs.getId()).setTrashed(true);
  return {filename: blob.getName(), base64: base64};
}

// ============ 品質/食安 ============

// 依範本項目的資料型態/標準值，判斷單一檢驗項目是否合格
function evalQcItemPass_(dataType, spec, value) {
  if (dataType === '合格判定') return String(value) === '合格' || value === true || value === 'true';
  if (dataType === '數值') {
    var v = Number(value);
    if (isNaN(v) || !spec) return true; // 無標準值可比對時，不阻擋（視為記錄用）
    spec = String(spec).trim();
    var m;
    if ((m = spec.match(/^>=\s*(-?\d+(\.\d+)?)$/))) return v >= Number(m[1]);
    if ((m = spec.match(/^<=\s*(-?\d+(\.\d+)?)$/))) return v <= Number(m[1]);
    if ((m = spec.match(/^>\s*(-?\d+(\.\d+)?)$/))) return v > Number(m[1]);
    if ((m = spec.match(/^<\s*(-?\d+(\.\d+)?)$/))) return v < Number(m[1]);
    if ((m = spec.match(/^(-?\d+(\.\d+)?)\s*[~-]\s*(-?\d+(\.\d+)?)$/))) return v >= Number(m[1]) && v <= Number(m[3]);
    if ((m = spec.match(/^(-?\d+(\.\d+)?)$/))) return v === Number(m[1]);
    return true;
  }
  return true; // 文字型項目僅記錄，不判定合格/不合格
}

function addQcRecord(token, record, items) {
  var session = requireSession_(token);
  requireEdit_(session, 'qc');
  record.id = nextId_('QCRecords');
  var templateItems = sheetToObjects_('QCTemplateItems');
  items.forEach(function(it) {
    var tplItem = templateItems.filter(function(t) { return String(t.id) === String(it.templateItemId); })[0];
    it.pass = tplItem ? evalQcItemPass_(tplItem.dataType, tplItem.spec, it.value) : (it.pass === true || it.pass === 'true');
  });
  var allPass = items.every(function(it) { return it.pass === true; });
  record.result = allPass ? '合格' : '不合格';
  appendObject_('QCRecords', record);
  items.forEach(function(it) {
    it.id = nextId_('QCRecordItems');
    it.recordId = record.id;
    appendObject_('QCRecordItems', it);
  });
  return record;
}

// ============ 零用金對帳 ============

function pettyCashList(token) {
  requireSession_(token);
  var rows = sheetToObjects_('PettyCashTransactions').sort(function(a, b) { return new Date(a.date) - new Date(b.date); });
  var balance = 0;
  return rows.map(function(r) {
    var total = Number(r.total) || 0;
    balance += r.direction === '支出' ? -total : total;
    r.runningBalance = balance;
    return r;
  });
}

function addPettyCashTransaction(token, data) {
  var session = requireSession_(token);
  requireEdit_(session, 'pettyCash');
  data.id = nextId_('PettyCashTransactions');
  data.amount = (Number(data.quantity) || 0) * (Number(data.unitPrice) || 0);
  data.total = data.amount + (Number(data.tax) || 0);
  var category = sheetToObjects_('ExpenseCategories').filter(function(c) { return String(c.id) === String(data.categoryId); })[0];
  if (category && String(category.linkInventory) === 'true' && data.direction === '支出') {
    var materials = sheetToObjects_('Materials');
    var material = materials.filter(function(m) { return m.name === data.itemName; })[0];
    if (!material) {
      material = appendObject_('Materials', {id: nextId_('Materials'), name: data.itemName, category: category.name, unit: '', note: '零用金自動建立'});
    }
    var suppliers = sheetToObjects_('Suppliers');
    var supplier = suppliers.filter(function(s) { return s.name === data.vendor; })[0];
    if (!supplier && data.vendor) {
      supplier = appendObject_('Suppliers', {id: nextId_('Suppliers'), name: data.vendor});
    }
    var purchase = addPurchase(token, {
      purchaseNo: '', supplierId: supplier ? supplier.id : '', date: data.date,
      materialId: material.id, batchNo: 'PC-' + data.date + '-' + material.id,
      quantity: data.quantity, unitPrice: data.unitPrice, expiryDate: '', inspectionStatus: '合格',
      source: '零用金支出', note: '零用金自動建立進貨紀錄'
    });
    data.linkedMaterialId = material.id;
    data.linkedPurchaseId = purchase.id;
  }
  return appendObject_('PettyCashTransactions', data);
}

// ============ 損益表 ============

function monthKeys_(rows, field) {
  var set = {};
  rows.forEach(function(r) { if (r[field]) set[String(r[field]).slice(0, 7)] = true; });
  return Object.keys(set);
}

function autoAccountAmount_(autoSource, month) {
  if (autoSource === 'shipmentIncome') {
    return sheetToObjects_('Shipments').filter(function(s) { return String(s.date).slice(0, 7) === month; })
      .reduce(function(sum, s) { return sum + (Number(s.total) || 0); }, 0);
  }
  if (autoSource === 'materialCost') {
    return sheetToObjects_('Purchases').filter(function(p) { return String(p.date).slice(0, 7) === month; })
      .reduce(function(sum, p) { return sum + (Number(p.amount) || 0); }, 0);
  }
  if (autoSource === 'pettyCashOther') {
    return sheetToObjects_('PettyCashTransactions').filter(function(t) {
      return String(t.date).slice(0, 7) === month && t.direction === '支出' && !t.linkedPurchaseId;
    }).reduce(function(sum, t) { return sum + (Number(t.total) || 0); }, 0);
  }
  if (autoSource === 'productionExpense') {
    return sheetToObjects_('ProductionExpenses').filter(function(e) { return String(e.month).slice(0, 7) === month; })
      .reduce(function(sum, e) { return sum + (Number(e.amount) || 0); }, 0);
  }
  return 0;
}

function incomeStatementMonth(token, month) {
  requireSession_(token);
  var categories = sheetToObjects_('AccountCategories');
  var manualEntries = sheetToObjects_('ManualLedgerEntries').filter(function(e) { return e.month === month; });
  var lines = categories.map(function(c) {
    var amount = 0;
    if (c.source === 'auto') {
      amount = autoAccountAmount_(c.autoSource, month);
    } else {
      amount = manualEntries.filter(function(e) { return String(e.categoryId) === String(c.id); })
        .reduce(function(sum, e) { return sum + (Number(e.amount) || 0); }, 0);
    }
    return {categoryId: c.id, name: c.name, type: c.type, amount: amount};
  });
  var income = sumByType_(lines, '收入');
  var variable = sumByType_(lines, '變動成本');
  var fixed = sumByType_(lines, '固定成本');
  var grossProfit = income - variable;
  var netProfit = grossProfit - fixed;
  return {
    month: month, lines: lines, income: income, variableCost: variable, fixedCost: fixed,
    grossProfit: grossProfit, grossMargin: income ? grossProfit / income : 0,
    netProfit: netProfit, netMargin: income ? netProfit / income : 0
  };
}

function sumByType_(lines, type) {
  return lines.filter(function(l) { return l.type === type; }).reduce(function(sum, l) { return sum + l.amount; }, 0);
}

function incomeStatementYear(token, year) {
  requireSession_(token);
  var months = [];
  for (var m = 1; m <= 12; m++) months.push(year + '-' + String(m).padStart(2, '0'));
  return months.map(function(month) { return incomeStatementMonth(token, month); });
}

function computeProfitPayouts(token, month) {
  var session = requireSession_(token);
  requireEdit_(session, 'incomeStatement');
  var statement = incomeStatementMonth(token, month);
  var partners = sheetToObjects_('Partners');
  var existing = sheetToObjects_('ProfitPayouts').filter(function(p) { return p.month === month; });
  partners.forEach(function(p) {
    var due = statement.netProfit * (Number(p.sharePct) || 0) / 100;
    var record = existing.filter(function(e) { return String(e.partnerId) === String(p.id); })[0];
    if (record) {
      updateObjectById_('ProfitPayouts', record.id, {dueAmount: due});
    } else {
      appendObject_('ProfitPayouts', {
        id: nextId_('ProfitPayouts'), month: month, partnerId: p.id, dueAmount: due,
        paidAmount: 0, paidDate: '', status: '未付'
      });
    }
  });
  return sheetToObjects_('ProfitPayouts').filter(function(p) { return p.month === month; });
}

function markPayoutPaid(token, id, paidAmount, paidDate) {
  var session = requireSession_(token);
  requireEdit_(session, 'incomeStatement');
  var payout = sheetToObjects_('ProfitPayouts').filter(function(p) { return String(p.id) === String(id); })[0];
  var due = Number(payout.dueAmount) || 0;
  var status = Number(paidAmount) >= due ? '已付' : (Number(paidAmount) > 0 ? '部分給付' : '未付');
  return updateObjectById_('ProfitPayouts', id, {paidAmount: paidAmount, paidDate: paidDate, status: status});
}
