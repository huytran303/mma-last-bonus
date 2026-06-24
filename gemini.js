// ====================================================================
//  PASTE YOUR GEMINI API KEY HERE
//  Get a free key at: https://aistudio.google.com/apikey
// ====================================================================
export const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY';

const MODEL = 'gemini-2.0-flash';
const ENDPOINT =
  `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

/**
 * Ask Gemini to describe a photo.
 * @param {string} base64  - the image encoded as base64 (no data: prefix)
 * @param {string} mimeType - e.g. 'image/jpeg'
 * @returns {Promise<string>} a short description in Vietnamese
 */
export async function generateDescription(base64, mimeType = 'image/jpeg') {
  if (!GEMINI_API_KEY || GEMINI_API_KEY === 'YOUR_GEMINI_API_KEY') {
    throw new Error('Chưa cấu hình GEMINI_API_KEY trong gemini.js');
  }

  const body = {
    contents: [
      {
        parts: [
          {
            text:
              'Hãy mô tả ngắn gọn (2-3 câu) nội dung bức ảnh này bằng tiếng Việt, ' +
              'tự nhiên và thân thiện.',
          },
          { inline_data: { mime_type: mimeType, data: base64 } },
        ],
      },
    ],
  };

  const res = await fetch(`${ENDPOINT}?key=${GEMINI_API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini API lỗi (${res.status}): ${errText}`);
  }

  const json = await res.json();
  const text = json?.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('Gemini không trả về mô tả.');
  return text.trim();
}
