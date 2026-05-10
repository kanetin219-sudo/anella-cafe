/**
 * ANELLA CAFE トリミング予約 — Gmailリマインド・口コミ依頼 GAS
 *
 * ■ セットアップ手順
 * 1. Google Apps Script で新規プロジェクト作成（名前：anella-reminders）
 * 2. このファイルの内容を貼り付け
 * 3. 「プロジェクトの設定」→「スクリプトプロパティ」に以下を追加：
 *    - SUPABASE_URL       : https://abeekodehorlwsmnhoza.supabase.co
 *    - SUPABASE_SERVICE_KEY : Supabase管理画面 Settings > API > service_role キー
 *
 * ■ トリガー設定（時計アイコン > トリガーを追加）
 * 関数名              実行時間
 * sendReminder1      毎日 12:00 — 翌日予約へのリマインド（お客様＋スタッフ）
 * sendReminder2      毎日  8:00 — 当日予約へのリマインド（お客様＋スタッフ）
 * sendReviewRequest  毎日 20:00 — 来店済みへの口コミ依頼
 */

// ── 設定 ─────────────────────────────────────────
var PROP = PropertiesService.getScriptProperties();

function getSupabaseUrl()  { return PROP.getProperty('SUPABASE_URL') || 'https://abeekodehorlwsmnhoza.supabase.co'; }
function getServiceKey()   { return PROP.getProperty('SUPABASE_SERVICE_KEY') || ''; }

var STORE_NAME   = 'ANELLA CAFE 大分店';
var STORE_TEL    = '097-594-9770';
var REVIEW_URL   = 'https://g.page/r/CW2N82Q_zPpJEAE/review';
var STAFF_EMAIL  = 'anellacafeoita@gmail.com';

// ── Supabase ヘルパー ─────────────────────────────

function getReservations(targetDate, statusFilter) {
  var url = getSupabaseUrl() + '/rest/v1/trimming_reservations'
    + '?visit_date=eq.' + targetDate
    + (statusFilter ? '&status=eq.' + encodeURIComponent(statusFilter) : '')
    + '&order=visit_time.asc';

  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'apikey':        getServiceKey(),
      'Authorization': 'Bearer ' + getServiceKey(),
      'Content-Type':  'application/json'
    },
    muteHttpExceptions: true
  });

  if (response.getResponseCode() !== 200) {
    Logger.log('Supabase error: ' + response.getContentText());
    return [];
  }
  return JSON.parse(response.getContentText());
}

function updateReminderFlag(id, field) {
  var url = getSupabaseUrl() + '/rest/v1/trimming_reservations?id=eq.' + id;
  var body = {};
  body[field] = true;

  UrlFetchApp.fetch(url, {
    method: 'PATCH',
    headers: {
      'apikey':        getServiceKey(),
      'Authorization': 'Bearer ' + getServiceKey(),
      'Content-Type':  'application/json',
      'Prefer':        'return=minimal'
    },
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });
}

// ── Gmail 送信ヘルパー ────────────────────────────

function sendEmail(to, subject, body) {
  try {
    MailApp.sendEmail({
      to:      to,
      subject: subject,
      body:    body + '\n\n──────────────\n' + STORE_NAME + '\nTEL：' + STORE_TEL
    });
  } catch (e) {
    Logger.log('Email error: ' + e.toString());
  }
}

// ── メッセージ生成ヘルパー ────────────────────────

function buildReminderMessage(r, dayLabel) {
  var optNames = r.options && r.options.length > 0
    ? r.options.map(function(o) { return o.name; }).join('、')
    : 'なし';

  return [
    '【' + dayLabel + 'のトリミングご予約確認】',
    '',
    r.owner_name + ' 様',
    '',
    dayLabel + 'のご予約内容をお知らせします。',
    '',
    '▼ ご予約内容',
    '日時  ：' + r.visit_date + ' ' + r.visit_time.slice(0, 5),
    '担当  ：' + r.staff,
    'コース：' + r.course,
    'オプション：' + optNames,
    'ペット：' + r.pet_name + '様',
    '',
    '▼ ご来店時のお願い',
    '・クレートでのご来店をお願いします',
    '・ワクチン接種証明書をご持参ください',
    '',
    'ご不明な点はお電話ください。',
    STORE_NAME,
    'TEL：' + STORE_TEL
  ].join('\n');
}

function buildReviewMessage(r) {
  return [
    '【本日はご来店ありがとうございました】',
    '',
    r.owner_name + ' 様',
    '',
    '本日は ' + r.pet_name + 'ちゃんをお連れいただき、',
    'ありがとうございました！',
    'またのご来店を心よりお待ちしております。',
    '',
    '━━━━━━━━━━━━━━━━━━━━',
    '【お願い】Googleの口コミを書いていただけませんか？',
    '━━━━━━━━━━━━━━━━━━━━',
    '',
    '口コミを書いていただくと、こんなメリットがあります。',
    '',
    '✅ 同じ犬種・サイズのわんちゃんを持つ飼い主さんに',
    '　 リアルな情報を届けられます',
    '',
    '✅ 「どこに預けようか…」と悩んでいる飼い主さんの',
    '　 背中を押してあげられます',
    '',
    '✅ ' + r.pet_name + 'ちゃんとの思い出をひとこと残しておくと、',
    '　 後から見返す記念にもなります',
    '',
    '✅ 小さなお店にとって、口コミはとても大きな励みです。',
    '　 スタッフ一同の自信とやる気につながります！',
    '',
    '⭐ 口コミを書いてくださった方には、',
    '　 次回トリミング料金から【500円OFF】いたします。',
    '　 口コミ画面をスタッフにご提示ください。',
    '',
    '▼ 1〜2分で書けます。ぜひお願いします！',
    REVIEW_URL,
    '',
    'いつもありがとうございます。',
    STORE_NAME,
    'TEL：' + STORE_TEL
  ].join('\n');
}

// ── ① sendReminder1: 毎日12:00 翌日予約リマインド ─

function sendReminder1() {
  var tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  var targetDate = Utilities.formatDate(tomorrow, 'Asia/Tokyo', 'yyyy-MM-dd');

  var reservations = getReservations(targetDate, '予約済み');
  Logger.log('Reminder1 対象: ' + reservations.length + '件 (' + targetDate + ')');

  var staffSummary = [];

  reservations.forEach(function(r) {
    if (r.reminder1_sent) return;

    var message = buildReminderMessage(r, '明日');

    if (r.email) {
      sendEmail(
        r.email,
        '【明日のご予約確認】' + r.visit_time.slice(0,5) + ' ' + r.pet_name + 'ちゃん — ' + STORE_NAME,
        message
      );
    }

    staffSummary.push(r.visit_time.slice(0,5) + ' ' + r.pet_name + '（' + r.owner_name + '）担当：' + r.staff);
    updateReminderFlag(r.id, 'reminder1_sent');
  });

  // スタッフへのまとめ通知
  if (staffSummary.length > 0) {
    sendEmail(
      STAFF_EMAIL,
      '【明日の予約リマインド送信完了】' + targetDate + ' — ' + staffSummary.length + '件',
      '以下のお客様へ前日リマインドメールを送信しました。\n\n' +
      staffSummary.map(function(s, i) { return (i+1) + '. ' + s; }).join('\n') +
      '\n\n計' + staffSummary.length + '件'
    );
  }

  Logger.log('Reminder1 完了: ' + staffSummary.length + '件送信');
}

// ── ② sendReminder2: 毎日8:00 当日予約リマインド ──

function sendReminder2() {
  var today = new Date();
  var targetDate = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy-MM-dd');

  var reservations = getReservations(targetDate, '予約済み');
  Logger.log('Reminder2 対象: ' + reservations.length + '件 (' + targetDate + ')');

  var staffSummary = [];

  reservations.forEach(function(r) {
    if (r.reminder2_sent) return;

    var message = [
      '【本日のトリミングご予約】',
      '',
      r.owner_name + ' 様',
      '',
      '本日のご予約日です！',
      '',
      '日時  ：' + r.visit_date + ' ' + r.visit_time.slice(0,5),
      '担当  ：' + r.staff,
      'コース：' + r.course,
      'ペット：' + r.pet_name + '様',
      '',
      '予約時間の30分前までのキャンセル・変更は',
      'お電話でご連絡ください。',
      STORE_TEL
    ].join('\n');

    if (r.email) {
      sendEmail(
        r.email,
        '【本日のご予約確認】' + r.visit_time.slice(0,5) + ' ' + r.pet_name + 'ちゃん — ' + STORE_NAME,
        message
      );
    }

    staffSummary.push(r.visit_time.slice(0,5) + ' ' + r.pet_name + '（' + r.owner_name + '）担当：' + r.staff);
    updateReminderFlag(r.id, 'reminder2_sent');
  });

  // スタッフへの当日スケジュール通知
  if (staffSummary.length > 0) {
    sendEmail(
      STAFF_EMAIL,
      '【本日のトリミングスケジュール】' + targetDate + ' — ' + staffSummary.length + '件',
      '本日の予約スケジュールです。\n\n' +
      staffSummary.map(function(s, i) { return (i+1) + '. ' + s; }).join('\n') +
      '\n\n計' + staffSummary.length + '件'
    );
  }

  Logger.log('Reminder2 完了: ' + staffSummary.length + '件送信');
}

// ── ③ sendReviewRequest: 毎日20:00 口コミ依頼 ───

function sendReviewRequest() {
  var today = new Date();
  var targetDate = Utilities.formatDate(today, 'Asia/Tokyo', 'yyyy-MM-dd');

  var reservations = getReservations(targetDate, '来店済み');
  Logger.log('ReviewRequest 対象: ' + reservations.length + '件 (' + targetDate + ')');

  var sent = 0;

  reservations.forEach(function(r) {
    if (r.review_sent) return;

    var message = buildReviewMessage(r);

    if (r.email) {
      sendEmail(
        r.email,
        '【ご来店ありがとうございました】' + r.pet_name + 'ちゃん — ' + STORE_NAME,
        message
      );
      sent++;
    }

    updateReminderFlag(r.id, 'review_sent');
  });

  if (sent > 0) {
    sendEmail(
      STAFF_EMAIL,
      '【口コミ依頼送信完了】' + targetDate + ' — ' + sent + '件',
      '本日来店済みのお客様 ' + sent + '件へ口コミ依頼メールを送信しました。'
    );
  }

  Logger.log('ReviewRequest 完了: ' + sent + '件送信');
}

// ── トリガー自動設定 ──────────────────────────────

/**
 * GASエディタから一度だけ手動実行してください。
 * 既存トリガーを削除して3つの時間トリガーを新規作成します。
 */
function setupTriggers() {
  // 既存トリガーを全削除
  ScriptApp.getProjectTriggers().forEach(function(t) {
    ScriptApp.deleteTrigger(t);
  });

  // sendReminder1: 毎日 12時台（前日リマインド）
  ScriptApp.newTrigger('sendReminder1')
    .timeBased()
    .everyDays(1)
    .atHour(12)
    .create();

  // sendReminder2: 毎日 8時台（当日朝リマインド）
  ScriptApp.newTrigger('sendReminder2')
    .timeBased()
    .everyDays(1)
    .atHour(8)
    .create();

  // sendReviewRequest: 毎日 20時台（口コミ依頼）
  ScriptApp.newTrigger('sendReviewRequest')
    .timeBased()
    .everyDays(1)
    .atHour(20)
    .create();

  Logger.log('✅ トリガー設定完了: sendReminder1(12時), sendReminder2(8時), sendReviewRequest(20時)');
}

// ── 動作テスト用 ──────────────────────────────────

function testGetReservations() {
  var today = Utilities.formatDate(new Date(), 'Asia/Tokyo', 'yyyy-MM-dd');
  var result = getReservations(today, null);
  Logger.log('本日の予約: ' + result.length + '件');
  Logger.log(JSON.stringify(result.slice(0, 2), null, 2));
}

function testReminder1() { sendReminder1(); }
function testReminder2() { sendReminder2(); }
function testReviewRequest() { sendReviewRequest(); }

/**
 * 特定日の予約に対してリマインド・口コミ依頼を手動送信
 * 例: sendManualReminder('2026-05-08') → 5/8来店分を再送
 * GASエディタ内でtargetDateを指定して実行してください
 */
function sendManualReminder() {
  var targetDate = '2026-05-08'; // ← 対象日を変更して実行

  // ステータス問わず全予約を取得（キャンセル以外）
  var url = getSupabaseUrl() + '/rest/v1/trimming_reservations'
    + '?visit_date=eq.' + targetDate
    + '&status=neq.キャンセル'
    + '&order=visit_time.asc';

  var response = UrlFetchApp.fetch(url, {
    method: 'GET',
    headers: {
      'apikey':        getServiceKey(),
      'Authorization': 'Bearer ' + getServiceKey(),
      'Content-Type':  'application/json'
    },
    muteHttpExceptions: true
  });

  var reservations = JSON.parse(response.getContentText());
  Logger.log(targetDate + ' の対象予約: ' + reservations.length + '件');

  var sent = 0;
  reservations.forEach(function(r) {
    if (!r.email) {
      Logger.log('メール未登録のためスキップ: ' + r.owner_name + ' / ' + r.pet_name);
      return;
    }

    // 口コミ依頼メール送信
    var message = buildReviewMessage(r);
    sendEmail(
      r.email,
      '【ご来店ありがとうございました】' + r.pet_name + 'ちゃん — ' + STORE_NAME,
      message
    );
    updateReminderFlag(r.id, 'review_sent');
    sent++;
    Logger.log('送信完了: ' + r.owner_name + ' <' + r.email + '>');
  });

  Logger.log('手動再送完了: ' + sent + '件送信');
}

/**
 * スクリプトプロパティを一括設定するセットアップ関数
 * GASエディタから一度だけ手動実行してください（実行後はキーを削除すること）
 */
function setupProperties() {
  var props = PropertiesService.getScriptProperties();
  props.setProperties({
    'SUPABASE_URL':         'https://abeekodehorlwsmnhoza.supabase.co',
    'SUPABASE_SERVICE_KEY': '★ここにservice_roleキーを貼り付け★'
  });
  Logger.log('プロパティ設定完了');
}
