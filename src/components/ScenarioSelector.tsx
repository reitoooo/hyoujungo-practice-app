import React, { useState } from 'react';
import { PresetScenario, PRESET_SCENARIOS } from '../services/scenarios';
import { FileText, Wand2, Loader2, RefreshCw } from 'lucide-react';
import { generatePracticeScript } from '../services/aiCoachService';

interface ScenarioSelectorProps {
  currentScenario: PresetScenario | null;
  onSelectScenario: (scenario: PresetScenario | null) => void;
  customText: string;
  onChangeCustomText: (text: string) => void;
}

const CATEGORY_OPTIONS: { value: 'casual' | 'business' | 'presentation'; label: string }[] = [
  { value: 'casual', label: '日常会話（カジュアル）' },
  { value: 'business', label: 'ビジネス商談・社内会話' },
  { value: 'presentation', label: 'プレゼンテーション・スピーチ' },
];

const TONE_OPTIONS = [
  { value: 'standard', label: '標準的なトーン' },
  { value: 'polite', label: '丁寧語・敬語' },
  { value: 'apology', label: '謝罪・クレーム対応（感情を込める）' },
  { value: 'persuasive', label: '説得・提案（抑揚をつける）' },
  { value: 'friendly', label: '親しい友人へのタメ口（くだけた表現）' },
];

export const ScenarioSelector: React.FC<ScenarioSelectorProps> = ({
  currentScenario,
  onSelectScenario,
  customText,
  onChangeCustomText
}) => {
  const [scriptCategory, setScriptCategory] = useState<'casual' | 'business' | 'presentation'>('casual');
  const [scriptTheme, setScriptTheme] = useState('');
  const [scriptTone, setScriptTone] = useState('standard');
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const handleSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (val === 'custom') {
      onSelectScenario(null);
    } else if (val === 'freetalk') {
      onSelectScenario({
        id: 'freetalk',
        title: 'フリートーク（台本なし）',
        category: 'freetalk',
        text: '',
        description: '好きなテーマで自由に話してください。話した内容は自動で文字起こしされ、関東標準語としてのアクセントが評価されます。'
      });
    } else {
      const scenario = PRESET_SCENARIOS.find(s => s.id === val) || null;
      onSelectScenario(scenario);
    }
  };

  const handleGenerateScript = async () => {
    setGenerating(true);
    setGenError(null);
    try {
      const script = await generatePracticeScript(scriptCategory, scriptTheme, scriptTone);
      onChangeCustomText(script.trim());
      onSelectScenario(null); // 自由入力モードに切り替え
    } catch (e: any) {
      setGenError(e.message || '台本の生成に失敗しました。');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1rem' }}>
        <FileText size={20} style={{ color: 'var(--primary)' }} />
        課題の設定
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        {/* Preset or custom scenario picker */}
        <div>
          <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
            プリセットシチュエーション
          </label>
          <select
            onChange={handleSelectChange}
            value={currentScenario ? currentScenario.id : 'custom'}
            style={{
              width: '100%',
              padding: '0.75rem',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-card)',
              background: 'var(--bg-card)',
              color: 'var(--text-main)',
              fontSize: '1rem',
              outline: 'none',
              cursor: 'pointer'
            }}
          >
            {PRESET_SCENARIOS.map(s => (
              <option key={s.id} value={s.id}>
                [{s.category.toUpperCase()}] {s.title}
              </option>
            ))}
            <option value="custom">✍️ 自由入力テキスト（プレゼン原稿など）</option>
            <option value="freetalk">🎙 フリートーク（台本なしで自由に話す）</option>
          </select>
        </div>

        {currentScenario ? (
          /* Preset scenario: show preset info panel */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: 'var(--border-radius-sm)',
              fontSize: '0.9rem',
              lineHeight: 1.5,
              borderLeft: '4px solid var(--primary)'
            }}>
              <p style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{currentScenario.title}</p>
              <p style={{ color: 'var(--text-muted)' }}>{currentScenario.description}</p>
              {currentScenario.category !== 'freetalk' && (
                <div style={{
                  marginTop: '0.75rem',
                  padding: '0.75rem',
                  background: 'rgba(0,0,0,0.1)',
                  borderRadius: '6px',
                  fontSize: '1.1rem',
                  fontWeight: 500,
                  letterSpacing: '0.03em',
                  color: 'var(--text-main)'
                }}>
                  {currentScenario.text}
                </div>
              )}
            </div>

            {currentScenario.category !== 'freetalk' && (
              <button
                onClick={async () => {
                  setScriptCategory(currentScenario.category as any);
                  setScriptTone('standard');
                  setGenerating(true);
                  setGenError(null);
                  try {
                    const script = await generatePracticeScript(currentScenario.category as any, currentScenario.title, 'standard');
                    onChangeCustomText(script.trim());
                    onSelectScenario(null);
                  } catch (e: any) {
                    setGenError(e.message || '台本の生成に失敗しました。');
                  } finally {
                    setGenerating(false);
                  }
                }}
                disabled={generating}
                className="btn-secondary"
                style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', alignSelf: 'flex-start', fontSize: '0.9rem' }}
              >
                {generating
                  ? <><Loader2 size={14} className="animate-spin" /> 生成中...</>
                  : <><Wand2 size={14} /> このシチュエーションで別の台本を生成</>
                }
              </button>
            )}
            {genError && <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{genError}</p>}
          </div>
        ) : (
          /* Free input mode */
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <textarea
              value={customText}
              onChange={(e) => onChangeCustomText(e.target.value)}
              placeholder="ここに原稿を貼り付け、または入力してください。"
              rows={4}
              style={{
                width: '100%',
                padding: '0.75rem',
                borderRadius: 'var(--border-radius-sm)',
                border: '1px solid var(--border-card)',
                background: 'var(--bg-card)',
                color: 'var(--text-main)',
                fontSize: '1.05rem',
                lineHeight: 1.5,
                resize: 'vertical',
                outline: 'none'
              }}
            />

            {/* AI Script Generator Panel */}
            <div style={{
              padding: '1rem',
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: 'var(--border-radius-sm)',
              border: '1px solid var(--border-card)',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.75rem'
            }}>
              <p style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: 'var(--primary)'
              }}>
                <Wand2 size={16} />
                AIで台本を自動生成
              </p>

              <div style={{ display: 'flex', gap: '0.5rem', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>シチュエーション</label>
                  <select
                    value={scriptCategory}
                    onChange={e => setScriptCategory(e.target.value as 'casual' | 'business' | 'presentation')}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    {CATEGORY_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>口調・トーン</label>
                  <select
                    value={scriptTone}
                    onChange={e => setScriptTone(e.target.value)}
                    style={{
                      padding: '0.5rem',
                      borderRadius: 'var(--border-radius-sm)',
                      border: '1px solid var(--border-card)',
                      background: 'var(--bg-card)',
                      color: 'var(--text-main)',
                      fontSize: '0.9rem',
                      outline: 'none'
                    }}
                  >
                    {TONE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  テーマのヒント（任意）
                </label>
                <input
                  type="text"
                  value={scriptTheme}
                  onChange={e => setScriptTheme(e.target.value)}
                  placeholder="例: 商談で新サービスを提案する場面、友人を食事に誘う"
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: 'var(--border-radius-sm)',
                    border: '1px solid var(--border-card)',
                    background: 'var(--bg-card)',
                    color: 'var(--text-main)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    width: '100%'
                  }}
                />
              </div>

              {genError && (
                <p style={{ color: 'var(--danger)', fontSize: '0.8rem' }}>{genError}</p>
              )}

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={handleGenerateScript}
                  disabled={generating}
                  className="btn-primary"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    opacity: generating ? 0.7 : 1
                  }}
                >
                  {generating
                    ? <><Loader2 size={15} className="animate-spin" /> 生成中...</>
                    : <><Wand2 size={15} /> 台本を生成する</>
                  }
                </button>
                {customText && (
                  <button
                    onClick={() => handleGenerateScript()}
                    className="btn-secondary"
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem' }}
                    disabled={generating}
                    title="別の台本を生成して置き換える"
                  >
                    <RefreshCw size={13} />
                    別の台本に
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
