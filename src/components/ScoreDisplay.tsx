import React, { useState, useRef, useEffect } from 'react';
import { AssessmentResult, AssessmentWord } from '../services/pronunciationAssessmentService';
import { BarChart3, Volume2 } from 'lucide-react';

interface ScoreDisplayProps {
  result: AssessmentResult | null;
  loading: boolean;
  onAssess: () => void;
  canAssess: boolean;
  userAudioUrl?: string | null;
}

export const ScoreDisplay: React.FC<ScoreDisplayProps> = ({
  result,
  loading,
  onAssess,
  canAssess,
  userAudioUrl
}) => {
  const [playingWordIndex, setPlayingWordIndex] = useState<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const stopTimerRef = useRef<number | null>(null);

  // Clean up audio on unmount or userAudioUrl change
  useEffect(() => {
    return () => {
      stopWordAudio();
    };
  }, [userAudioUrl]);

  const stopWordAudio = () => {
    if (stopTimerRef.current !== null) {
      clearTimeout(stopTimerRef.current);
      stopTimerRef.current = null;
    }
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    setPlayingWordIndex(null);
  };

  const playWordAudio = (word: AssessmentWord, index: number) => {
    if (!userAudioUrl) return;

    // If already playing this word, stop it
    if (playingWordIndex === index) {
      stopWordAudio();
      return;
    }

    stopWordAudio();

    const audio = new Audio(userAudioUrl);
    audioRef.current = audio;
    setPlayingWordIndex(index);

    audio.onloadedmetadata = () => {
      let startTime = 0;
      let duration = audio.duration;

      if (word.Offset !== undefined && word.Duration !== undefined && word.Duration > 0) {
        // Convert from 100ns units to seconds
        const rawStart = word.Offset / 10000000;
        const rawDuration = word.Duration / 10000000;

        // Add 0.08s padding before and 0.15s after for natural hearing
        startTime = Math.max(0, rawStart - 0.08);
        duration = rawDuration + 0.23;
      }

      audio.currentTime = startTime;
      audio.play().then(() => {
        // Set timer to stop after word snippet duration
        stopTimerRef.current = window.setTimeout(() => {
          stopWordAudio();
        }, duration * 1000);
      }).catch(err => {
        console.error('単語音声再生エラー:', err);
        stopWordAudio();
      });
    };

    audio.onerror = () => {
      stopWordAudio();
    };
  };

  // プロ・アナウンサー基準の厳格スコア判定
  const getScoreColor = (score: number) => {
    if (score >= 90) return 'var(--success)';
    if (score >= 75) return 'var(--warning)';
    return 'var(--danger)';
  };

  const getWordStyle = (word: AssessmentWord, isCurrentPlaying: boolean) => {
    const errorType = word.ErrorType;
    const score = word.AccuracyScore;

    if (isCurrentPlaying) {
      return {
        background: 'var(--primary)',
        color: '#ffffff',
        fontWeight: 'bold',
        boxShadow: '0 0 12px var(--primary-glow)',
        borderRadius: '6px',
        transform: 'scale(1.08)',
        borderBottom: '2px solid transparent'
      };
    }

    if (errorType === 'Mispronunciation') {
      return {
        color: 'var(--danger)',
        fontWeight: 'bold',
        borderBottom: '2px solid var(--danger)',
        background: 'rgba(255, 59, 48, 0.15)',
        borderRadius: '4px'
      };
    }
    if (errorType === 'Omission') {
      return {
        color: 'var(--warning)',
        textDecoration: 'line-through',
        opacity: 0.7,
        borderRadius: '4px'
      };
    }
    if (errorType === 'Insertion') {
      return {
        color: 'var(--primary)',
        borderBottom: '2px dotted var(--primary)',
        borderRadius: '4px'
      };
    }
    // ErrorType が None でもスコアが低い単語を警告ハイライト
    if (score < 75) {
      return {
        color: 'var(--danger)',
        borderBottom: '2px dashed var(--danger)',
        background: 'rgba(255, 59, 48, 0.08)',
        borderRadius: '4px'
      };
    }
    if (score < 88) {
      return {
        color: 'var(--warning)',
        borderBottom: '2px dotted var(--warning)',
        background: 'rgba(245, 158, 11, 0.08)',
        borderRadius: '4px'
      };
    }
    return {
      color: 'var(--text-main)',
      borderBottom: '2px solid transparent',
      borderRadius: '4px'
    };
  };

  return (
    <div className="glass-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1rem' }}>
        <BarChart3 size={20} style={{ color: 'var(--primary)' }} />
        発音評価 & 採点結果
      </h2>

      {!result && !loading && (
        <div style={{ textAlign: 'center', padding: '1.5rem 0' }}>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1rem', fontSize: '0.9rem' }}>
            録音完了後、下記のボタンを押すとクラウドで高精度の発音評価を開始します。
          </p>
          <button
            onClick={onAssess}
            disabled={!canAssess}
            className="btn-primary"
            style={{ opacity: canAssess ? 1 : 0.6 }}
          >
            発音を評価・採点する
          </button>
        </div>
      )}

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '2rem 0' }}>
          <div className="animate-spin" style={{
            width: '40px',
            height: '40px',
            border: '4px solid var(--border-card)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%'
          }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>Azure AI で音声を多角的に分析中...</span>
        </div>
      )}

      {result && !loading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {/* Score cards grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem'
          }}>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-sm)',
              textAlign: 'center',
              border: '1px solid var(--border-card)'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>総合スコア</p>
              <p style={{ fontSize: '2rem', fontWeight: 'bold', color: getScoreColor(result.PronunciationScore) }}>
                {Math.round(result.PronunciationScore)}
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-sm)',
              textAlign: 'center',
              border: '1px solid var(--border-card)'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>正確さ (Accuracy)</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: getScoreColor(result.AccuracyScore) }}>
                {Math.round(result.AccuracyScore)}
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-sm)',
              textAlign: 'center',
              border: '1px solid var(--border-card)'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>流暢さ (Fluency)</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: getScoreColor(result.FluencyScore) }}>
                {Math.round(result.FluencyScore)}
              </p>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.03)',
              padding: '1rem',
              borderRadius: 'var(--border-radius-sm)',
              textAlign: 'center',
              border: '1px solid var(--border-card)'
            }}>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>完全性 (Completeness)</p>
              <p style={{ fontSize: '1.75rem', fontWeight: 'bold', color: getScoreColor(result.CompletenessScore) }}>
                {Math.round(result.CompletenessScore)}
              </p>
            </div>
          </div>

          {/* Word details / Text highlighting */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-muted)' }}>
                可視化された発話テキスト（ハイライト付き）:
              </h3>
              {userAudioUrl && (
                <span style={{ fontSize: '0.8rem', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '0.3rem', fontWeight: 500 }}>
                  <Volume2 size={14} /> 単語をクリックすると、その発音をピンポイント再生できます
                </span>
              )}
            </div>

            <div style={{
              padding: '1.25rem',
              background: 'rgba(0,0,0,0.12)',
              borderRadius: 'var(--border-radius-sm)',
              lineHeight: 2.2,
              fontSize: '1.25rem',
              letterSpacing: '0.05em',
              userSelect: 'none'
            }}>
              {result.Words.map((word, idx) => {
                const isPlaying = playingWordIndex === idx;
                return (
                  <span
                    key={idx}
                    onClick={() => playWordAudio(word, idx)}
                    style={{
                      marginRight: '0.35rem',
                      padding: '0.15rem 0.4rem',
                      cursor: userAudioUrl ? 'pointer' : 'default',
                      display: 'inline-block',
                      transition: 'all 0.15s ease',
                      ...getWordStyle(word, isPlaying)
                    }}
                    title={`【${word.Word}】 正確さ: ${Math.round(word.AccuracyScore)}点 / エラー: ${word.ErrorType}\n🔊 クリックして自分の発音を聴く`}
                  >
                    {word.Word}
                  </span>
                );
              })}
            </div>

            {/* Error Legend */}
            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.75rem', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'var(--danger)', borderRadius: '2px' }} />
                <span>Mispronunciation / 低スコア(&lt;75点)（不自然・発音ミス）</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'var(--warning)', borderRadius: '2px' }} />
                <span>注意(&lt;88点) / Omission（アクセント違和感・聞き漏れ）</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <span style={{ display: 'inline-block', width: '10px', height: '10px', backgroundColor: 'var(--primary)', borderRadius: '2px' }} />
                <span>Insertion（余計な音・ノイズ）</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

