// 極簡的 Google Apps Script 執行環境模擬器，讓 Code.gs 可以在 Node 裡被載入測試。
// 只模擬測試會用到的部分（試算表存取、Utilities、CacheService），不是完整模擬。
'use strict';
const crypto = require('crypto');

function makeSheet(name) {
  var rows = [];
  return {
    name: name,
    appendRow: function(row) { rows.push(row.slice()); },
    getLastRow: function() { return rows.length; },
    getRange: function(row, col, numRows, numCols) {
      return {
        getValues: function() {
          var out = [];
          for (var r = 0; r < numRows; r++) {
            var srcRow = rows[row - 1 + r] || [];
            var line = [];
            for (var c = 0; c < numCols; c++) line.push(srcRow[col - 1 + c] === undefined ? '' : srcRow[col - 1 + c]);
            out.push(line);
          }
          return out;
        },
        setValues: function(values) {
          for (var r = 0; r < values.length; r++) {
            while (rows.length <= row - 1 + r) rows.push([]);
            var target = rows[row - 1 + r];
            for (var c = 0; c < values[r].length; c++) target[col - 1 + c] = values[r][c];
          }
        },
        setValue: function(v) { rows[row - 1][col - 1] = v; }
      };
    },
    deleteRow: function(rowIdx) { rows.splice(rowIdx - 1, 1); },
    _rows: rows
  };
}

function createMockSpreadsheetApp() {
  var sheets = {};
  var api = {
    getActiveSpreadsheet: function() {
      return {
        getSheetByName: function(name) { return sheets[name] || null; },
        insertSheet: function(name) {
          var s = makeSheet(name);
          sheets[name] = s;
          return s;
        },
        getSheets: function() { return Object.keys(sheets).map(function(k) { return sheets[k]; }); }
      };
    },
    create: function(name) { throw new Error('SpreadsheetApp.create 未在測試模擬環境中支援：' + name); }
  };
  return api;
}

function createGasGlobals() {
  var cache = {};
  return {
    SpreadsheetApp: createMockSpreadsheetApp(),
    CacheService: {
      getScriptCache: function() {
        return {
          put: function(k, v) { cache[k] = v; },
          get: function(k) { return cache[k] === undefined ? null : cache[k]; }
        };
      }
    },
    Utilities: {
      getUuid: function() { return crypto.randomUUID(); },
      computeDigest: function(algo, str) {
        var hash = crypto.createHash('sha256').update(str).digest();
        return Array.from(hash).map(function(b) { return b > 127 ? b - 256 : b; });
      },
      DigestAlgorithm: {SHA_256: 'SHA_256'},
      formatDate: function(date, tz, pattern) {
        var d = new Date(date);
        var pad = function(n) { return String(n).padStart(2, '0'); };
        if (pattern === 'yyyy-MM-dd') return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
        if (pattern === 'yyyyMMdd') return String(d.getFullYear()) + pad(d.getMonth() + 1) + pad(d.getDate());
        return d.toISOString();
      },
      base64Encode: function(bytes) { return Buffer.from(bytes).toString('base64'); }
    },
    console: console
  };
}

module.exports = {createGasGlobals: createGasGlobals};
