/**
 * 春豬工作室｜客製材料包詢問收件程式（Google Apps Script）
 *
 * 功能：
 * 1. 接收官網表單送來的詢問，寫入 Google 試算表「客製詢問」工作表。
 * 2. 參考圖片存到雲端硬碟資料夾，試算表記錄圖片連結（資料夾權限僅店家本人）。
 * 3. 寫入成功才回傳 ok:true；網站只有收到 ok:true 才顯示「已送出」。
 * 4. 選用：設定 NOTIFY_EMAIL 後，每筆新詢問寄通知信給店家。
 *
 * 部署步驟見 apps-script/README.md。
 */

const SHEET_NAME = '客製詢問';
const FOLDER_NAME = '春豬官網｜客製詢問圖片';
// 填入要收通知的信箱，例如 'haruistudio@gmail.com'；留空則不寄信
const NOTIFY_EMAIL = '';

const HEADERS = ['編號', '送出時間', '處理狀態', '姓名', 'Email', '電話', '偏好聯絡', '參考款式', '想調整的內容', '手作經驗', '現有工具', '期望日期', '其他說明', '參考圖片', '來源頁面'];
const MAX_IMAGES = 3;
const MAX_BYTES = 3 * 1024 * 1024;
const TYPES = ['image/jpeg', 'image/png', 'image/webp'];

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const d = JSON.parse(e.postData.contents);
    const err = validate_(d);
    if (err) return json_({ ok: false, error: err });

    lock.waitLock(20000);
    const sheet = getSheet_();
    const id = 'H' + Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyMMdd') + '-' + Utilities.getUuid().slice(0, 4).toUpperCase();

    const links = (d.images || []).map(function (img, i) {
      const blob = Utilities.newBlob(Utilities.base64Decode(img.data), img.type, id + '-' + (i + 1) + '-' + String(img.name).replace(/[^\w.-]/g, '_'));
      if (blob.getBytes().length > MAX_BYTES) throw new Error('image too large');
      return getFolder_().createFile(blob).getUrl();
    });

    sheet.appendRow([
      id,
      Utilities.formatDate(new Date(), 'Asia/Taipei', 'yyyy/MM/dd HH:mm'),
      '新詢問',
      d.name, d.email || '', d.phone ? "'" + d.phone : '', d.preferred,
      d.reference, d.changes, d.experience, (d.tools || []).join('、'),
      d.desiredDate || '', d.notes || '', links.join('\n'), d.page || ''
    ]);
    SpreadsheetApp.flush();

    if (NOTIFY_EMAIL) {
      try {
        MailApp.sendEmail(NOTIFY_EMAIL, '【官網】新的客製材料包詢問 ' + id,
          '姓名：' + d.name + '\n參考款式：' + d.reference + '\n想調整：' + d.changes + '\n\n請到試算表查看完整內容：\n' + SpreadsheetApp.getActive().getUrl());
      } catch (mailErr) { /* 寄信失敗不影響收件 */ }
    }
    return json_({ ok: true, id: id });
  } catch (x) {
    return json_({ ok: false, error: 'server error' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

function doGet() {
  return json_({ ok: true, service: 'harui-inquiry' });
}

function validate_(d) {
  const s = function (v, max) { return typeof v === 'string' && v.trim().length > 0 && v.length <= max; };
  if (!s(d.name, 100)) return 'name';
  if (!d.email && !d.phone) return 'contact';
  if (d.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(d.email)) return 'email';
  if (d.phone && !/^(09\d{8}|0[2-8]\d{7,8}|\+8869\d{8}|\+886[2-8]\d{7,8})$/.test(d.phone)) return 'phone';
  if (['Email', '電話'].indexOf(d.preferred) < 0) return 'preferred';
  if (!s(d.reference, 200)) return 'reference';
  if (!s(d.changes, 2000) || d.changes.trim().length < 10) return 'changes';
  if (['沒做過', '做過一兩件', '常做'].indexOf(d.experience) < 0) return 'experience';
  if (d.consent !== true) return 'consent';
  if (d.notes && d.notes.length > 2000) return 'notes';
  const imgs = d.images || [];
  if (imgs.length > MAX_IMAGES) return 'images';
  for (var i = 0; i < imgs.length; i++) if (TYPES.indexOf(imgs[i].type) < 0) return 'images';
  return '';
}

function getSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(HEADERS);
    sh.setFrozenRows(1);
    sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold');
    const rule = SpreadsheetApp.newDataValidation().requireValueInList(['新詢問', '已回覆', '已報價', '已成立', '不接單'], true).build();
    sh.getRange(2, 3, 1000, 1).setDataValidation(rule);
  }
  return sh;
}

function getFolder_() {
  const it = DriveApp.getFoldersByName(FOLDER_NAME);
  return it.hasNext() ? it.next() : DriveApp.createFolder(FOLDER_NAME);
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

/** 在編輯器手動執行一次，完成授權並建立工作表 */
function setup() {
  getSheet_();
  getFolder_();
}
