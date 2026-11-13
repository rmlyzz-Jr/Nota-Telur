/**
 * APLIKASI CETAK NOTA TELUR - PT RAFASYA PUTRA USTANTO
 * Google Apps Script + Google Sheets  (VERSI API untuk GitHub Pages / PWA)
 *
 * Cara pakai: buka Google Sheets > Extensions > Apps Script,
 * tempel file ini sebagai Code.gs (ganti seluruh isi lama).
 * File HTML "Index" TIDAK wajib lagi (boleh dibiarkan, tetap berfungsi).
 *
 * Deploy ulang: Deploy > Manage deployments > Edit (ikon pensil)
 *   > Version: New version > Deploy.   (URL /exec tetap sama)
 * Pengaturan: Execute as = Me, Who has access = Anyone.
 */

var NAMA_SHEET = 'Rekap';
var PERUSAHAAN = 'PT RAFASYA PUTRA USTANTO';
var LOGO_URL = 'https://rmlyzz-jr.github.io/SRPU-app/assets/images/logo-rpu.png';
var HEADERS = ['No Nota', 'Dibuat', 'Tanggal', 'Hari', 'Nama',
  'Besar Qty', 'Besar Harga', 'Besar Total',
  'Kecil Qty', 'Kecil Harga', 'Kecil Total',
  'Grand Total', 'Satuan'];
var HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/* Fungsi yang boleh dipanggil dari aplikasi GitHub */
var API_FUNGSI = {
  getInfoAwal: function () { return getInfoAwal(); },
  hariUntuk: function (a) { return hariUntuk(a[0]); },
  simpanNota: function (a) { return simpanNota(a[0]); },
  getRekap: function (a) { return getRekap(a[0], a[1]); },
  hapusNota: function (a) { return hapusNota(a[0]); },
  buatPdf: function (a) { return buatPdf(a[0]); }
};

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(e) {
  // Cek koneksi dari aplikasi GitHub: ...?action=ping
  if (e && e.parameter && e.parameter.action === 'ping') {
    return json_({ ok: true, data: 'pong' });
  }
  // Tampilan lama (jika file HTML "Index" masih dipakai)
  return HtmlService.createHtmlOutputFromFile('Index')
    .setTitle('Nota - ' + PERUSAHAAN)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/** Pintu API: body JSON {fn:'namaFungsi', args:[...]} */
function doPost(e) {
  try {
    var req = JSON.parse(e.postData.contents);
    var f = API_FUNGSI[req.fn];
    if (!f) throw new Error('Fungsi tidak dikenal: ' + req.fn);
    return json_({ ok: true, data: f(req.args || []) });
  } catch (err) {
    return json_({ ok: false, error: String(err && err.message ? err.message : err) });
  }
}

/* ---------- Helper ---------- */

function getSpreadsheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  if (ss) return ss;
  // Jika script berdiri sendiri (bukan terikat Sheet), buat spreadsheet otomatis
  var props = PropertiesService.getScriptProperties();
  var id = props.getProperty('SS_ID');
  if (id) return SpreadsheetApp.openById(id);
  ss = SpreadsheetApp.create('Rekap Nota - ' + PERUSAHAAN);
  props.setProperty('SS_ID', ss.getId());
  return ss;
}

function getSheet_() {
  var ss = getSpreadsheet_();
  var sh = ss.getSheetByName(NAMA_SHEET);
  if (!sh) {
    sh = ss.insertSheet(NAMA_SHEET);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#1e3a8a').setFontColor('#ffffff');
    sh.setFrozenRows(1);
    sh.getRange('A:A').setNumberFormat('@');
    sh.getRange('C:C').setNumberFormat('@');
  }
  return sh;
}

function hariDari_(tglStr) {
  var p = String(tglStr).split('-');
  var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
  return HARI[d.getDay()];
}

function tglText_(v) {
  if (v instanceof Date) {
    return Utilities.formatDate(v, Session.getScriptTimeZone(), 'yyyy-MM-dd');
  }
  return String(v);
}

function angka_(v) {
  var n = parseFloat(String(v).replace(',', '.'));
  return isNaN(n) || n < 0 ? 0 : n;
}

function rupiah_(n) {
  return 'Rp ' + Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

function qtyText_(n) {
  return String(Math.round(n * 100) / 100).replace('.', ',');
}

function tglIndo_(tglStr) {
  var bln = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli',
    'Agustus', 'September', 'Oktober', 'November', 'Desember'];
  var p = String(tglStr).split('-');
  return Number(p[2]) + ' ' + bln[Number(p[1]) - 1] + ' ' + p[0];
}

function esc_(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function rowToObj_(r) {
  return {
    noNota: String(r[0]),
    dibuat: r[1] instanceof Date
      ? Utilities.formatDate(r[1], Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm') : String(r[1]),
    tanggal: tglText_(r[2]),
    hari: String(r[3]),
    nama: String(r[4]),
    besarQty: Number(r[5]) || 0,
    besarHarga: Number(r[6]) || 0,
    besarTotal: Number(r[7]) || 0,
    kecilQty: Number(r[8]) || 0,
    kecilHarga: Number(r[9]) || 0,
    kecilTotal: Number(r[10]) || 0,
    grandTotal: Number(r[11]) || 0,
    satuan: String(r[12] || 'Kg')
  };
}

/* ---------- API untuk frontend ---------- */

function getInfoAwal() {
  var tz = Session.getScriptTimeZone();
  var now = new Date();
  var tgl = Utilities.formatDate(now, tz, 'yyyy-MM-dd');
  return { tanggal: tgl, hari: hariDari_(tgl), logo: LOGO_URL, perusahaan: PERUSAHAAN };
}

function hariUntuk(tglStr) {
  return hariDari_(tglStr);
}

/** Simpan nota baru; total dihitung ulang di server. Mengembalikan data nota. */
function simpanNota(d) {
  var nama = String(d.nama || '').trim();
  if (!nama) throw new Error('Nama wajib diisi.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d.tanggal))) throw new Error('Tanggal tidak valid.');

  var bQty = angka_(d.besarQty), bHarga = angka_(d.besarHarga);
  var kQty = angka_(d.kecilQty), kHarga = angka_(d.kecilHarga);
  if (bQty * bHarga + kQty * kHarga <= 0) {
    throw new Error('Isi minimal salah satu jenis telur (jumlah dan harga).');
  }
  var satuan = ['Kg', 'Butir', 'Tray', 'Peti'].indexOf(d.satuan) >= 0 ? d.satuan : 'Kg';
  var bTotal = bQty * bHarga, kTotal = kQty * kHarga;

  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_();
    var prefix = 'RPU-' + String(d.tanggal).replace(/-/g, '') + '-';
    var last = sh.getLastRow();
    var seq = 1;
    if (last > 1) {
      var ids = sh.getRange(2, 1, last - 1, 1).getValues();
      var maks = 0;
      for (var i = 0; i < ids.length; i++) {
        var id = String(ids[i][0]);
        if (id.indexOf(prefix) === 0) {
          maks = Math.max(maks, parseInt(id.substring(prefix.length), 10) || 0);
        }
      }
      seq = maks + 1;
    }
    var noNota = prefix + ('000' + seq).slice(-3);
    var dibuat = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm:ss');
    var hari = hariDari_(d.tanggal);
    var row = [noNota, dibuat, d.tanggal, hari, nama,
      bQty, bHarga, bTotal, kQty, kHarga, kTotal, bTotal + kTotal, satuan];
    var rowIdx = last + 1;
    sh.getRange(rowIdx, 1, 1, row.length).setValues([row]);
    sh.getRange(rowIdx, 7, 1, 1).setNumberFormat('#,##0');
    sh.getRange(rowIdx, 8, 1, 1).setNumberFormat('#,##0');
    sh.getRange(rowIdx, 10, 1, 3).setNumberFormat('#,##0');
    return rowToObj_(row);
  } finally {
    lock.releaseLock();
  }
}

/** Ambil rekap, filter opsional dari/sampai (yyyy-MM-dd). */
function getRekap(dari, sampai) {
  var sh = getSheet_();
  var last = sh.getLastRow();
  if (last < 2) return { rows: [], total: 0 };
  var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  var rows = [], total = 0;
  for (var i = 0; i < vals.length; i++) {
    var o = rowToObj_(vals[i]);
    if (!o.noNota) continue;
    if (dari && o.tanggal < dari) continue;
    if (sampai && o.tanggal > sampai) continue;
    rows.push(o);
    total += o.grandTotal;
  }
  rows.sort(function (a, b) {
    return a.tanggal === b.tanggal ? (a.noNota < b.noNota ? 1 : -1) : (a.tanggal < b.tanggal ? 1 : -1);
  });
  return { rows: rows, total: total };
}

function hapusNota(noNota) {
  var lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    var sh = getSheet_();
    var last = sh.getLastRow();
    if (last < 2) return false;
    var ids = sh.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]) === String(noNota)) {
        sh.deleteRow(i + 2);
        return true;
      }
    }
    return false;
  } finally {
    lock.releaseLock();
  }
}

/* ---------- PDF ---------- */

function getLogoData_() {
  try {
    var cache = CacheService.getScriptCache();
    var c = cache.get('logo64');
    if (c) return c;
    var res = UrlFetchApp.fetch(LOGO_URL, { muteHttpExceptions: true });
    if (res.getResponseCode() === 200) {
      var blob = res.getBlob();
      var data = 'data:' + blob.getContentType() + ';base64,' + Utilities.base64Encode(blob.getBytes());
      if (data.length < 95000) cache.put('logo64', data, 21600);
      return data;
    }
  } catch (e) { /* abaikan, pakai URL langsung */ }
  return LOGO_URL;
}

function buatHtmlNota_(o) {
  var logo = getLogoData_();
  var s = esc_(o.satuan);
  var baris = '';
  if (o.besarQty > 0) {
    baris += '<tr><td>BESAR</td><td class="c">' + qtyText_(o.besarQty) + ' ' + s +
      '</td><td class="r">' + rupiah_(o.besarHarga) + '</td><td class="r">' + rupiah_(o.besarTotal) + '</td></tr>';
  }
  if (o.kecilQty > 0) {
    baris += '<tr><td>KECIL</td><td class="c">' + qtyText_(o.kecilQty) + ' ' + s +
      '</td><td class="r">' + rupiah_(o.kecilHarga) + '</td><td class="r">' + rupiah_(o.kecilTotal) + '</td></tr>';
  }
  return '<!DOCTYPE html><html><head><meta charset="utf-8"><style>' +
    'body{font-family:Arial,Helvetica,sans-serif;font-size:12px;color:#111;margin:0;padding:24px;}' +
    '.head{width:100%;border-bottom:3px solid #1e3a8a;padding-bottom:10px;margin-bottom:14px;}' +
    '.head td{vertical-align:middle;}' +
    '.firm{font-size:18px;font-weight:bold;color:#1e3a8a;}' +
    '.sub{font-size:11px;color:#555;}' +
    '.judul{font-size:15px;font-weight:bold;text-align:right;color:#1e3a8a;}' +
    '.info{width:100%;margin-bottom:12px;}' +
    '.info td{padding:2px 0;}' +
    'table.items{width:100%;border-collapse:collapse;margin-top:6px;}' +
    'table.items th{background:#1e3a8a;color:#fff;padding:7px;border:1px solid #1e3a8a;text-align:left;}' +
    'table.items td{padding:7px;border:1px solid #bbb;}' +
    '.r{text-align:right;}.c{text-align:center;}' +
    '.gt td{font-weight:bold;font-size:13px;background:#eef2ff;border:1px solid #1e3a8a;padding:8px;}' +
    '.ttd{width:100%;margin-top:36px;}' +
    '.ttd td{text-align:center;width:50%;}' +
    '.foot{margin-top:24px;font-size:10px;color:#777;text-align:center;}' +
    '</style></head><body>' +
    '<table class="head"><tr>' +
    '<td style="width:80px"><img src="' + logo + '" style="height:64px"></td>' +
    '<td><div class="firm">' + PERUSAHAAN + '</div><div class="sub">Distributor Telur</div></td>' +
    '<td class="judul">NOTA PENJUALAN</td></tr></table>' +
    '<table class="info">' +
    '<tr><td style="width:90px">No. Nota</td><td>: ' + esc_(o.noNota) + '</td></tr>' +
    '<tr><td>Hari, Tanggal</td><td>: ' + esc_(o.hari) + ', ' + tglIndo_(o.tanggal) + '</td></tr>' +
    '<tr><td>Nama</td><td>: <b>' + esc_(o.nama) + '</b></td></tr></table>' +
    '<table class="items"><tr><th>Jenis Telur</th><th class="c">Qty</th><th class="r">Harga</th><th class="r">Total</th></tr>' +
    baris +
    '<tr class="gt"><td colspan="3" class="r">TOTAL</td><td class="r" style="color:#dc2626;font-weight:bold;">' + rupiah_(o.grandTotal) + '</td></tr>' +
    '</table>' +
    '<table class="ttd"><tr><td>Penerima<br><br><br><br>( ............................ )</td>' +
    '<td>Hormat kami<br><br><br><br>( ............................ )</td></tr></table>' +
    '<div class="foot">Terima kasih atas kepercayaan Anda. Barang yang sudah dibeli tidak dapat ditukar.</div>' +
    '</body></html>';
}

/** Buat PDF dari nota yang sudah tersimpan; mengembalikan {nama, base64}. */
function buatPdf(noNota) {
  var sh = getSheet_();
  var last = sh.getLastRow();
  if (last < 2) throw new Error('Data nota tidak ditemukan.');
  var vals = sh.getRange(2, 1, last - 1, HEADERS.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]) === String(noNota)) {
      var o = rowToObj_(vals[i]);
      var blob = HtmlService.createHtmlOutput(buatHtmlNota_(o)).getBlob()
        .getAs('application/pdf');
      var nama = 'Nota_' + o.noNota + '_' + o.nama.replace(/[^A-Za-z0-9]+/g, '_') + '.pdf';
      return { nama: nama, base64: Utilities.base64Encode(blob.getBytes()) };
    }
  }
  throw new Error('Data nota tidak ditemukan.');
}
