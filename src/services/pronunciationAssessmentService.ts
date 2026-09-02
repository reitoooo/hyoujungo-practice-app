/**
 * Azure Pronunciation Assessment API wrapper service.
 * Sends user audio to Azure Speech Services to get scoring and phoneme / word level feedback.
 */

const KEY = import.meta.env.VITE_AZURE_SPEECH_KEY;
const REGION = import.meta.env.VITE_AZURE_SPEECH_REGION || 'eastus';

export interface AssessmentWord {
  Word: string;
  AccuracyScore: number;
  ErrorType: 'None' | 'Omission' | 'Insertion' | 'Mispronunciation';
  Offset?: number;   // 100ns units
  Duration?: number; // 100ns units
}

export interface AssessmentResult {
  AccuracyScore: number;
  FluencyScore: number;
  CompletenessScore: number;
  PronunciationScore: number; // 総合スコア
  Words: AssessmentWord[];
}

/**
 * MediaRecorder (WebM/OGG) の Blob を 16kHz モノラル PCM WAV Blob に変換する。
 * Azure REST API は WAV (PCM) を期待しているため、変換が必要。
 */
async function convertBlobToWav(blob: Blob): Promise<Blob> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  const decoded = await audioCtx.decodeAudioData(arrayBuffer);

  const targetSampleRate = 16000;
  // OfflineAudioContext でリサンプリング
  const offlineCtx = new OfflineAudioContext(
    1, // モノラル
    Math.ceil(decoded.duration * targetSampleRate),
    targetSampleRate
  );

  const source = offlineCtx.createBufferSource();
  source.buffer = decoded;
  source.connect(offlineCtx.destination);
  source.start(0);

  const rendered = await offlineCtx.startRendering();
  audioCtx.close();

  // PCM データを WAV ファイルとしてエンコード
  const pcmData = rendered.getChannelData(0);
  const wavBuffer = encodePCMToWav(pcmData, targetSampleRate);

  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/** Float32Array の PCM データを WAV 形式の ArrayBuffer にエンコード */
function encodePCMToWav(samples: Float32Array, sampleRate: number): ArrayBuffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = samples.length * blockAlign;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);        // PCM chunk size
  view.setUint16(20, 1, true);         // PCM format
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  // Float32 → Int16 変換
  let offset = 44;
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    offset += 2;
  }

  return buffer;
}

export async function assessPronunciation(
  audioBlob: Blob,
  referenceText: string
): Promise<AssessmentResult> {
  if (!KEY) {
    throw new Error('Azure Speech APIキーが設定されていません。.envファイルを確認してください。');
  }

  // WebM/OGG → WAV (PCM 16kHz) に変換
  const wavBlob = await convertBlobToWav(audioBlob);

  const url = `https://${REGION}.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=ja-JP`;

  // Azure Pronunciation Assessment params in base64 header
  const assessmentParams = {
    ReferenceText: referenceText,
    GradingSystem: 'HundredMark',
    Granularity: 'Word',
    Dimension: 'Comprehensive'
  };

  const jsonStr = JSON.stringify(assessmentParams);
  // UTF-8 to Base64 (compatible with multi-byte Japanese characters)
  const base64Params = btoa(unescape(encodeURIComponent(jsonStr)));

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': KEY,
      'Accept': 'application/json',
      'Content-Type': 'audio/wav; codecs=audio/pcm; samplerate=16000',
      'Pronunciation-Assessment': base64Params,
    },
    body: wavBlob
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Azure Pronunciation Assessment APIエラー: ${response.status} - ${errorText}`);
  }

  const data = await response.json();

  if (data.RecognitionStatus === 'InitialSilenceTimeout' || data.RecognitionStatus === 'BabbleTimeout') {
    throw new Error('音声が検出されませんでした。マイクに近づいて十分な音量で発話してください。');
  }

  if (data.RecognitionStatus === 'NoMatch') {
    throw new Error('発話内容をお題と照合できませんでした。もう一度はっきりと発話してください。');
  }

  if (data.RecognitionStatus !== 'Success') {
    throw new Error(`音声認識評価に失敗しました (${data.RecognitionStatus})`);
  }

  const nBest = data.NBest?.[0];
  if (!nBest) {
    throw new Error('判定結果が見つかりませんでした。もっとはっきりと発話してください。');
  }

  // Azure STT REST API returns AccuracyScore, FluencyScore, CompletenessScore, PronScore at root of NBest[0]
  const words: AssessmentWord[] = (nBest.Words || []).map((w: any) => ({
    Word: w.Word || '',
    AccuracyScore: w.AccuracyScore ?? w.PronunciationAssessment?.AccuracyScore ?? 0,
    ErrorType: w.ErrorType ?? w.PronunciationAssessment?.ErrorType ?? 'None',
    Offset: w.Offset,
    Duration: w.Duration
  }));

  return {
    AccuracyScore: nBest.AccuracyScore ?? 0,
    FluencyScore: nBest.FluencyScore ?? 0,
    CompletenessScore: nBest.CompletenessScore ?? 0,
    PronunciationScore: nBest.PronScore ?? nBest.PronunciationScore ?? 0,
    Words: words
  };
}
