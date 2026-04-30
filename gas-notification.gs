/**
 * ANELLA CAFE トリミング予約 — Gmail通知 GAS
 *
 * ■ デプロイ手順
 * 1. Google Apps Script (https://script.google.com) で新規プロジェクト作成
 * 2. このファイルの内容を貼り付け
 * 3. 「デプロイ」→「新しいデプロイ」→「種類: ウェブアプリ」
 * 4. 実行ユーザー: 自分  /  アクセス: 全員（匿名を含む）
 * 5. デプロイ後に表示される「ウェブアプリのURL」をコピー
 * 6. trimming-reserve.html の GAS_URL 変数に貼り付けてコメントアウトを外す
 *
 * ■ セキュリティトークン
 * トークン: anella2026secret（変更する場合は trimming-reserve.html 側も要変更）
 */

var NOTIFY_EMAIL    = 'anellacafeoita@gmail.com'; // 通知先メールアドレス
var SECURITY_TOKEN  = 'anella2026secret';          // セキュリティトークン
var ADMIN_URL       = 'https://kanetin219-sudo.github.io/anella-cafe/trimming-admin.html';
var CALENDAR_URL    = 'https://kanetin219-sudo.github.io/anella-cafe/trimming-calendar.html';

/**
 * フロントエンドからの予約通知を受け取り Gmail を送信する
 * URL: https://script.google.com/macros/s/{DEPLOY_ID}/exec?token=...&data=...
 */
function doGet(e) {
  try {
    // トークン検証
    if (!e || !e.parameter || e.parameter.token !== SECURITY_TOKEN) {
      return ContentService.createTextOutput('unauthorized').setMimeType(ContentService.MimeType.TEXT);
    }

    var data = JSON.parse(decodeURIComponent(e.parameter.data));
    sendNewReservationEmail(data);
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);

  } catch (err) {
    Logger.log('doGet error: ' + err.toString());
    return ContentService.createTextOutput('error: ' + err.toString()).setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * POST にも対応（fetchでJSONを送る場合）
 */
function doPost(e) {
  try {
    var payload = JSON.parse(e.postData.contents);
    if (payload.token !== SECURITY_TOKEN) {
      return ContentService.createTextOutput('unauthorized').setMimeType(ContentService.MimeType.TEXT);
    }
    sendNewReservationEmail(payload.data);
    return ContentService.createTextOutput('ok').setMimeType(ContentService.MimeType.TEXT);
  } catch (err) {
    Logger.log('doPost error: ' + err.toString());
    return ContentService.createTextOutput('error').setMimeType(ContentService.MimeType.TEXT);
  }
}

/**
 * 新規予約 Gmail 送信
 */
function sendNewReservationEmail(data) {
  var optionNames = '';
  if (data.options && data.options.length > 0) {
    optionNames = data.options.map(function(o) { return o.name; }).join('、');
  } else {
    optionNames = 'なし';
  }

  var subject = '【新規予約】' + data.owner_name + '様 / '
    + data.visit_date + ' ' + data.visit_time + ' / ' + data.course;

  var body = [
    '新規トリミング予約が入りました。',
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    '予約番号：' + data.reservation_number,
    '━━━━━━━━━━━━━━━━━━━━━',
    '来店日時  ：' + data.visit_date + ' ' + data.visit_time,
    '担当者    ：' + data.staff,
    'コース    ：' + data.course,
    '犬種・猫種：' + data.breed,
    'オプション：' + optionNames,
    '合計金額  ：¥' + (data.total_price || 0).toLocaleString(),
    '',
    '【ペット情報】',
    'お名前  ：' + data.pet_name,
    '性別    ：' + data.gender,
    '体重    ：' + data.weight,
    '年齢    ：' + data.pet_age,
    '毛玉    ：' + data.matting,
    '狂犬病ワクチン：' + (data.vaccine_rabies || data.vaccine_status || '不明'),
    '5種混合ワクチン：' + (data.vaccine_5mix || '不明'),
    'スタッフへの伝言：' + (data.staff_note || 'なし'),
    '',
    '【お客様情報】',
    'お名前      ：' + data.owner_name + ' 様',
    '電話番号    ：' + data.phone,
    'LINE表示名  ：' + (data.line_name || 'なし'),
    'メール      ：' + (data.email || 'なし'),
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    '▼ 管理画面',
    ADMIN_URL,
    '▼ カレンダー',
    CALENDAR_URL,
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    '※ このメールは自動送信です。'
  ].join('\n');

  MailApp.sendEmail({
    to:      NOTIFY_EMAIL,
    subject: subject,
    body:    body
  });

  // お客様への予約確認メール
  if (data.email) {
    sendConfirmationEmail(data, optionNames);
  }

  Logger.log('Gmail sent: ' + subject);
}

/**
 * お客様への予約確認メール送信
 */
function sendConfirmationEmail(data, optionNames) {
  var STORE_NAME = 'ANELLA CAFE 大分店';
  var STORE_TEL  = '097-594-9770';

  var subject = '【ご予約確認】' + data.visit_date + ' ' + data.visit_time
    + ' ' + data.pet_name + 'ちゃん — ' + STORE_NAME;

  var body = [
    data.owner_name + ' 様',
    '',
    'この度はご予約いただきありがとうございます。',
    '以下の内容でご予約を承りました。',
    '',
    '━━━━━━━━━━━━━━━━━━━━━',
    '予約番号：' + data.reservation_number,
    '━━━━━━━━━━━━━━━━━━━━━',
    '来店日時  ：' + data.visit_date + ' ' + data.visit_time,
    'コース    ：' + data.course,
    'オプション：' + optionNames,
    'ペット名  ：' + data.pet_name + 'ちゃん',
    '合計（目安）：¥' + (data.total_price || 0).toLocaleString(),
    '━━━━━━━━━━━━━━━━━━━━━',
    '',
    '▼ ご来店時のお願い',
    '・クレートでのご来店をお願いします',
    '・ワクチン接種証明書をご持参ください',
    '',
    '前日・当日にもリマインドメールをお送りします。',
    'ご変更・キャンセルはお電話でご連絡ください。',
    '',
    STORE_NAME,
    'TEL：' + STORE_TEL,
    '',
    '※ このメールは自動送信です。返信はできません。'
  ].join('\n');

  MailApp.sendEmail({
    to:      data.email,
    subject: subject,
    body:    body
  });

  Logger.log('Customer confirmation sent to: ' + data.email);
}

/**
 * 動作テスト用（GASエディタから手動実行して確認）
 */
function testSendEmail() {
  var testData = {
    reservation_number: 'TEST-001',
    visit_date:   '2026-05-01',
    visit_time:   '10:00',
    staff:        'スタッフA',
    course:       'カットコース',
    breed:        'トイ・プードル',
    options:      [{ name: 'マイクロバブル' }, { name: '爪切り' }],
    total_price:  7000,
    pet_name:     'ぽち',
    gender:       '男の子',
    weight:       '3〜5kg',
    pet_age:      '1〜3歳',
    matting:      'なし',
    vaccine_status: '接種済み証明書あり',
    staff_note:   'テスト送信です',
    owner_name:   'テスト 太郎',
    phone:        '09012345678',
    line_name:    'テスト太郎',
    email:        'test@example.com'
  };
  sendNewReservationEmail(testData);
  Logger.log('テスト送信完了');
}
