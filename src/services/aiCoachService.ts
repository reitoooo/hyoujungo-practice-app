/**
 * AI Coach service using Google Gemini API or OpenAI API.
 * Provides custom actionable advice based on assessment scores, situation details, and reference text.
 */

import { AssessmentResult } from './pronunciationAssessmentService';

const PROVIDER = import.meta.env.VITE_AI_PROVIDER || 'gemini';
const GEMINI_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const OPENAI_KEY = import.meta.env.VITE_OPENAI_API_KEY;

export async function generateAICoachingAdvice(
  text: string,
  situationTitle: string,
  category: string,
  result: AssessmentResult
): Promise<string> {
  // AccuracyScore < 85 または ErrorType がある単語を要注意単語として抽出
  const warningWords = result.Words.filter(w => w.ErrorType !== 'None' || w.AccuracyScore < 85);
  const wordDetails = warningWords.length > 0
    ? warningWords.map(w => `- 単語: 「${w.Word}」（正確さ: ${Math.round(w.AccuracyScore)}点${w.ErrorType !== 'None' ? ` / 判定: ${w.ErrorType}` : ''}）`).join('\n')
    : '特に重大なエラー単語は検出されませんでした（全体的なトーンや間の取り方を評価してください）';

  const prompt = `
あなたはNHKアナウンサー研修や声優養成所でも指導を行う、極めてプロフェッショナルで耳の肥えた「標準語（東京・関東共通語アクセント）」および「スピーキング・発声」の指導員です。

${category === 'freetalk' 
  ? 'ユーザーは「フリートーク（台本なし）」で自発的に以下の内容を話しました。これが自然な関東標準語として聞こえるか、会話としての間やアクセントが適切かを評価してください。'
  : 'ユーザーは以下のシチュエーションとお題で練習を行いました。甘い評価やお世辞は不要です。標準語話者として自然に聞こえるか、シチュエーションに合ったトーン・速度・ポーズ（間）ができているかを厳格・プロフェッショナルな視点で厳しく審査してください。'
}

【シチュエーション】 ${situationTitle}
【話したテキスト】 「${text}」

【Azure 音声解析スコア】
- 総合評価 (Pronunciation Score): ${result.PronunciationScore} / 100
- 正確さ (Accuracy Score): ${result.AccuracyScore} / 100
- 流暢さ (Fluency Score): ${result.FluencyScore} / 100
- 完全性 (Completeness Score): ${result.CompletenessScore} / 100

【発音・アクセントに注意が必要な単語】
${wordDetails}

この結果とお題を元に、ユーザーが「完璧に関東標準語として通用するプロの話し方」になるための具体的なアドバイスを日本語で提供してください。
アドバイスは以下の構成で、簡潔かつ実践的に回答してください（300〜450文字程度）：

1. 【総評・改善ポイント】（曖昧な褒め言葉は避け、標準語としての違和感やトーンのズレを率直に指摘）
2. 【アクセント・イントネーションの厳密指導】（高低アクセントの型［平板型・頭高型・中高型・尾高型］、語尾の上がり下がりなど具体的にどの音を上げてどの音を下げるべきか）
3. 【プロのテクニック（間・息遣い・速度）】（シチュエーションに応じたポーズの入れ方、息継ぎのタイミングなど）
`;

  if (PROVIDER === 'gemini') {
    if (!GEMINI_KEY) {
      throw new Error('Gemini APIキーが設定されていません。');
    }
    return await callGemini(prompt);
  } else {
    if (!OPENAI_KEY) {
      throw new Error('OpenAI APIキーが設定されていません。');
    }
    return await callOpenAI(prompt);
  }
}

/**
 * 選択されたシチュエーションに合わせた練習台本をAIが自動生成する。
 * @param category - シチュエーションカテゴリ
 * @param theme - 具体的なテーマや場面の説明（任意）
 * @returns 生成された台本テキスト
 */
export async function generatePracticeScript(
  category: 'casual' | 'business' | 'presentation',
  theme: string,
  tone: string = 'standard'
): Promise<string> {
  const categoryLabel = {
    casual: '日常会話（カジュアル）',
    business: 'ビジネス商談・社内会話',
    presentation: 'プレゼンテーション・スピーチ'
  }[category];

  const toneMap: Record<string, string> = {
    standard: '標準的なトーン',
    polite: '丁寧語・敬語',
    apology: '謝罪・クレーム対応（感情を込める）',
    persuasive: '説得・提案（抑揚をつける）',
    friendly: '親しい友人へのタメ口（くだけた表現）'
  };
  const toneLabel = toneMap[tone] || '標準的なトーン';

  const prompt = `
あなたは「標準語（関東イントネーション）」の発音練習コンテンツを作成する専門家です。
以下の条件に従って、日本語のスピーキング練習用の台本を1つ作成してください。

【シチュエーション】 ${categoryLabel}
【テーマ・場面のヒント】 ${theme || '指定なし（任意のシーンでOK）'}
【口調・トーン】 ${toneLabel}

【台本の条件】
- 文字数: 80〜150文字程度（2〜3文で構成し、自然な流れを持たせること）
- 関東の自然なイントネーションを練習するのに適した、バリエーションある音節・アクセントを含むこと
- 日常的でリアルな場面を想定した自然な日本語であること
- シチュエーションのトーンに合った丁寧さ・砕け具合を反映すること
- 単調な羅列ではなく、語尾・アクセント・間の取り方が鍛えられる自然な会話・スピーチであること

【出力形式】
台本テキストのみを出力してください。説明や「台本：」などのラベルは不要です。台本本文だけを返してください。
`;

  if (PROVIDER === 'gemini') {
    if (!GEMINI_KEY) throw new Error('Gemini APIキーが設定されていません。');
    return await callGemini(prompt);
  } else {
    if (!OPENAI_KEY) throw new Error('OpenAI APIキーが設定されていません。');
    return await callOpenAI(prompt);
  }
}


const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-3.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.6-flash'
];

async function callGemini(prompt: string): Promise<string> {
  let lastError: any = null;

  for (const model of GEMINI_MODELS) {
    const controller = new AbortController();
    // 5-second timeout per model to prevent hanging
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_KEY}`;

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: prompt }
              ]
            }
          ]
        }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          return text;
        }
      } else {
        const errText = await response.text();
        lastError = new Error(`Gemini API (${model}) エラー ${response.status}: ${errText}`);
        // If rate limited (429) or model not found (404), continue to next fallback model
        if (response.status === 429 || response.status === 404 || response.status === 503) {
          console.warn(`Gemini model ${model} returned ${response.status}. Attempting fallback to next model...`);
          continue;
        }
        // If other error (e.g. 400 Bad Request / 403 Invalid Key), throw immediately
        throw lastError;
      }
    } catch (err: any) {
      clearTimeout(timeoutId);
      lastError = err;
      if (err.name === 'AbortError') {
        console.warn(`Gemini model ${model} timed out after 5s. Falling back to next model...`);
        continue;
      }
      if (err.message && (err.message.includes('429') || err.message.includes('404') || err.message.includes('503'))) {
        continue;
      }
      throw err;
    }
  }

  // If all fallback models exhausted
  if (lastError && lastError.message && lastError.message.includes('429')) {
    throw new Error('Gemini APIの無料枠制限（1日のリクエスト上限）に達しました。しばらく時間を置くか、.env で OpenAI APIキーへの切り替えをお試しください。');
  }

  throw lastError || new Error('Gemini APIの呼び出しに失敗しました。');
}

async function callOpenAI(prompt: string): Promise<string> {
  const url = 'https://api.openai.com/v1/chat/completions';

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_KEY}`
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI APIエラー: ${response.status} - ${errText}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content;
  if (!text) {
    throw new Error('OpenAIからの応答フォーマットが不正です。');
  }

  return text;
}
