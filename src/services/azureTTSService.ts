/**
 * Azure Neural TTS (Text-to-Speech) wrapper service.
 * 男性ボイスをシチュエーション別に使い分けてお手本音声を生成する。
 *
 * ボイス選定ポリシー:
 *  - casual      : ja-JP-DaichiNeural  （フレンドリー・やわらかい男性声）prosody 速め
 *  - business    : ja-JP-KeitaNeural   （落ち着いた標準男性声）        prosody 標準
 *  - presentation: ja-JP-KeitaNeural   （落ち着いた標準男性声）        prosody ゆっくり・明瞭
 */

const KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';

interface VoiceConfig {
  name: string;
  // prosody で速度・ピッチを調整
  rate: string;   // 例: '+20%', '+12%', '+5%'
  pitch?: string; // 例: '-1st' (0st等の無効値は避ける)
}

const VOICE_CONFIG: Record<'casual' | 'business' | 'presentation', VoiceConfig> = {
  casual: {
    name: 'ja-JP-DaichiNeural',
    rate: '+20%',         // 自然でテンポの良い日常会話テンポ
  },
  business: {
    name: 'ja-JP-KeitaNeural',
    rate: '+12%',         // キビキビとした標準的なビジネス会話
  },
  presentation: {
    name: 'ja-JP-KeitaNeural',
    rate: '+5%',          // 聞き取りやすく間延びしないプレゼンテンポ
    pitch: '-1st',        // 落ち着いた低めのトーン
  },
};

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

export async function generateExampleSpeech(
  text: string,
  category: 'casual' | 'business' | 'presentation'
): Promise<string> {
  if (!KEY) {
    throw new Error('Azure Speech APIキーが設定されていません。.envファイルを確認してください。');
  }

  const { name, rate, pitch } = VOICE_CONFIG[category];
  const url = `https://${REGION}.tts.speech.microsoft.com/cognitiveservices/v1`;

  const escapedText = escapeXml(text);
  const pitchAttr = pitch ? ` pitch="${pitch}"` : '';

  // SSML: 標準名前空間 xmlns="http://www.w3.org/2001/10/synthesis" を指定
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="ja-JP">
    <voice name="${name}">
      <prosody rate="${rate}"${pitchAttr}>
        ${escapedText}
      </prosody>
    </voice>
  </speak>`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3'
    },
    body: ssml
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure TTS APIエラー: ${response.status} - ${errorText}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
