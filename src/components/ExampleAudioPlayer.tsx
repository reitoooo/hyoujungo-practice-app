import React, { useState } from 'react';
import { Volume2, Loader2, Play, Square } from 'lucide-react';
import { generateExampleSpeech } from '../services/azureTTSService';

interface ExampleAudioPlayerProps {
  text: string;
  category: 'casual' | 'business' | 'presentation';
  onAudioReady: (url: string | null) => void;
}

export const ExampleAudioPlayer: React.FC<ExampleAudioPlayerProps> = ({
  text,
  category,
  onAudioReady
}) => {
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [playbackRate, setPlaybackRate] = useState<number>(1.0);

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      const url = await generateExampleSpeech(text, category);
      setAudioUrl(url);
      onAudioReady(url);

      const audio = new Audio(url);
      audio.playbackRate = playbackRate;
      audio.onended = () => setPlaying(false);
      setAudioElement(audio);
    } catch (e: any) {
      setError(e.message || 'お手本音声の生成に失敗しました。');
    } finally {
      setLoading(false);
    }
  };

  const handleRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (audioElement) {
      audioElement.playbackRate = rate;
    }
  };

  const handlePlayToggle = () => {
    if (!audioElement) return;

    if (playing) {
      audioElement.pause();
      setPlaying(false);
    } else {
      audioElement.playbackRate = playbackRate;
      audioElement.play();
      setPlaying(true);
    }
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
        <Volume2 size={20} style={{ color: 'var(--primary)' }} />
        お手本音声
      </h2>

      <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
        Azureの最先端Neural TTSを利用し、自然なイントネーションのお手本音声を生成・再生します。
      </p>

      {error && (
        <div style={{ color: 'var(--danger)', fontSize: '0.85rem', background: 'rgba(255, 59, 48, 0.1)', padding: '0.5rem', borderRadius: '4px' }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginTop: '0.25rem' }}>
        {!audioUrl ? (
          <button
            onClick={handleGenerate}
            disabled={loading || !text.trim()}
            className="btn-primary"
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <Volume2 size={16} />}
            {loading ? '生成中...' : 'お手本音声を生成'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <button
              onClick={handlePlayToggle}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '120px', justifyContent: 'center' }}
            >
              {playing ? <Square size={16} /> : <Play size={16} />}
              {playing ? '一時停止' : '再生する'}
            </button>
            <button
              onClick={() => {
                setAudioUrl(null);
                onAudioReady(null);
                setAudioElement(null);
              }}
              className="btn-secondary"
              style={{ padding: '0.75rem' }}
            >
              再生成
            </button>

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginLeft: '0.5rem' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>再生速度:</span>
              {[0.8, 1.0, 1.25, 1.5].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => handleRateChange(rate)}
                  style={{
                    padding: '0.25rem 0.6rem',
                    fontSize: '0.8rem',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: playbackRate === rate ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                    color: playbackRate === rate ? '#fff' : 'var(--text-color)',
                    cursor: 'pointer',
                    fontWeight: playbackRate === rate ? 600 : 400,
                  }}
                >
                  {rate}x
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
