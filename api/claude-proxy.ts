import { VercelRequest, VercelResponse } from '@vercel/node';

export default async (req: VercelRequest, res: VercelResponse) => {
  // CORS ヘッダーの設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'POST only' });
    return;
  }

  try {
    const { images, prompt, apiKey } = req.body;

    if (!apiKey) {
      res.status(401).json({ error: 'API key is required' });
      return;
    }

    if (!images || images.length === 0) {
      res.status(400).json({ error: 'At least one image is required' });
      return;
    }

    // Claude API に画像を送信
    const imageContents = images.map((base64: string) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: 'image/jpeg',
        data: base64,
      },
    }));

    const payload = {
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [...imageContents, { type: 'text', text: prompt }],
        },
      ],
    };

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const error = await response.json();
      res.status(response.status).json({
        error: error.error?.message || 'Claude API error',
      });
      return;
    }

    const data = await response.json();
    const text = data.content[0].text;

    // JSON を抽出
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      res.status(400).json({
        error: 'Failed to parse JSON from Claude response',
      });
      return;
    }

    const result = JSON.parse(jsonMatch[0]);
    res.status(200).json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
