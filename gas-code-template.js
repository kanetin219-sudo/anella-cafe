/**
 * Google Apps Script for Anella Weekly Report
 * GitHub Pages からの fetch リクエストを処理する
 *
 * 使い方：
 * 1. GAS プロジェクトを開く
 * 2. 以下のコードを全て Code.gs にコピーペースト
 * 3. 新しいデプロイ → ウェブアプリ → 実行権限を自分に → 完了
 * 4. デプロイメント URL を取得（https://script.google.com/macros/d/{PROJECT_ID}/usercurrentappinstall）
 * 5. weekly-report.html の gasUrl を更新
 */

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const { images, prompt, apiKey } = payload;

    if (!apiKey) {
      return createResponse({ error: 'API key is required' }, 401);
    }

    if (!images || images.length === 0) {
      return createResponse({ error: 'At least one image is required' }, 400);
    }

    // 画像をClaudeのコンテンツブロックに変換
    const imageContents = images.map(base64 => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64,
      },
    }));

    // Claude API に送信
    const payload_claude = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [...imageContents, { type: 'text', text: prompt }],
      }],
    };

    const options = {
      method: 'post',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      payload: JSON.stringify(payload_claude),
      muteHttpExceptions: true,
    };

    const response = UrlFetchApp.fetch(
      'https://api.anthropic.com/v1/messages',
      options
    );

    const statusCode = response.getResponseCode();
    if (statusCode !== 200) {
      const errorData = JSON.parse(response.getContentText());
      return createResponse(
        { error: errorData.error?.message || 'Claude API error' },
        statusCode
      );
    }

    const data = JSON.parse(response.getContentText());
    const text = data.content[0].text;

    // JSON を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return createResponse(
        { error: 'Failed to parse JSON from Claude response' },
        400
      );
    }

    const result = JSON.parse(jsonMatch[0]);
    return createResponse(result, 200);

  } catch (error) {
    Logger.log(error);
    return createResponse(
      { error: error.toString() },
      500
    );
  }
}

function doOptions(e) {
  return createResponse('ok', 200);
}

function createResponse(data, statusCode) {
  const output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}
