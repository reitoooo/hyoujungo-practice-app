import React, { useState, useRef, useEffect } from 'react';
import { RefreshCw, Play, Square } from 'lucide-react';

interface PlaybackComparisonProps {
  exampleAudioUrl: string | null;
  userAudioUrl: string | null;
}

export const PlaybackComparison: React.FC<PlaybackComparisonProps> = ({
  exampleAudioUrl,
  userAudioUrl
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<'none' | 'example' | 'user'>('none');
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const isPlayingRef = useRef(false);
  const exampleAudioRef = useRef<HTMLAudioElement | null>(null);
  const userAudioRef = useRef<HTMLAudioElement | null>(null);
  const timerRef = useRef<number | null>(null);

  // Stop playback when URLs change or unmount
  useEffect(() => {
    stopComparison();
    return () => {
      stopComparison();
    };
  }, [exampleAudioUrl, userAudioUrl]);

  const stopComparison = () => {
    isPlayingRef.current = false;
    setIsPlaying(false);
    setCurrentSpeaker('none');

    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (exampleAudioRef.current) {
      exampleAudioRef.current.pause();
      exampleAudioRef.current.currentTime = 0;
      exampleAudioRef.current = null;
    }

    if (userAudioRef.current) {
      userAudioRef.current.pause();
      userAudioRef.current.currentTime = 0;
      userAudioRef.current = null;
    }
  };

  const startComparison = async () => {
    if (!exampleAudioUrl || !userAudioUrl) return;

    // If already playing, stop it
    if (isPlayingRef.current) {
      stopComparison();
      return;
    }

    stopComparison();

    isPlayingRef.current = true;
    setIsPlaying(true);
    setCurrentSpeaker('example');

    // Pre-instantiate both audio objects
    const exampleAudio = new Audio(exampleAudioUrl);
    exampleAudio.playbackRate = playbackRate;
    exampleAudioRef.current = exampleAudio;

    const userAudio = new Audio(userAudioUrl);
    userAudio.playbackRate = playbackRate;
    userAudioRef.current = userAudio;

    // When example audio ends -> wait 0.4s -> play user audio
    exampleAudio.onended = () => {
      if (!isPlayingRef.current) return;
      setCurrentSpeaker('none');

      timerRef.current = window.setTimeout(() => {
        if (!isPlayingRef.current) return;
        setCurrentSpeaker('user');

        userAudio.onended = () => {
          stopComparison();
        };

        userAudio.onerror = (e) => {
          console.error('ユーザー音声の再生エラー:', e);
          stopComparison();
        };

        userAudio.play().catch(err => {
          console.error('ユーザー音声の再生に失敗しました:', err);
          stopComparison();
        });
      }, 400);
    };

    exampleAudio.onerror = (e) => {
      console.error('お手本音声の再生エラー:', e);
      stopComparison();
    };

    exampleAudio.play().catch(err => {
      console.error('お手本音声の再生に失敗しました:', err);
      stopComparison();
    });
  };

  const isDisabled = !exampleAudioUrl || !userAudioUrl;

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
        <RefreshCw size={20} style={{ color: 'var(--primary)' }} />
        聞き比べ（交互リピート再生）
      </h2>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        「お手本音声」の再生に続いて、0.5秒の無音時間を挟み、自動で「あなたの録音音声」を連続再生します。イントネーションのわずかなズレや間の取り方の違いに耳を傾けてみましょう。
      </p>

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.5rem' }}>
        <button
          onClick={startComparison}
          disabled={isDisabled}
          className="btn-primary"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            background: isPlaying ? 'var(--danger)' : 'var(--primary)',
            boxShadow: isPlaying ? '0 4px 14px 0 rgba(255, 59, 48, 0.3)' : '0 4px 14px 0 var(--primary-glow)',
            opacity: isDisabled ? 0.6 : 1,
            cursor: isDisabled ? 'not-allowed' : 'pointer'
          }}
        >
          {isPlaying ? (
            <>
              <Square size={16} />
              <span>再生を停止</span>
            </>
          ) : (
            <>
              <Play size={16} />
              <span>ワンボタンで聞き比べる</span>
            </>
          )}
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>速度:</span>
          {[0.8, 1.0, 1.25, 1.5].map((rate) => (
            <button
              key={rate}
              type="button"
              disabled={isPlaying}
              onClick={() => setPlaybackRate(rate)}
              style={{
                padding: '0.25rem 0.6rem',
                fontSize: '0.8rem',
                borderRadius: '6px',
                border: '1px solid var(--border-color)',
                background: playbackRate === rate ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                color: playbackRate === rate ? '#fff' : 'var(--text-color)',
                cursor: isPlaying ? 'not-allowed' : 'pointer',
                fontWeight: playbackRate === rate ? 600 : 400,
                opacity: isPlaying ? 0.5 : 1
              }}
            >
              {rate}x
            </button>
          ))}
        </div>

        {isPlaying && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', fontWeight: 600 }}>
            {currentSpeaker === 'example' && (
              <span style={{ color: 'var(--primary)' }}>📢 お手本を再生中...</span>
            )}
            {currentSpeaker === 'none' && (
              <span style={{ color: 'var(--text-muted)' }}>⏱️ 間 (0.4秒) ...</span>
            )}
            {currentSpeaker === 'user' && (
              <span style={{ color: 'var(--success)' }}>🎙️ あなたの声を再生中...</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
