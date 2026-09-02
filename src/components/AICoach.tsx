import React from 'react';
import { Sparkles, MessageSquareDot } from 'lucide-react';

interface AICoachProps {
  advice: string | null;
  loading: boolean;
}

export const AICoach: React.FC<AICoachProps> = ({ advice, loading }) => {
  return (
    <div className="glass-card">
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem', marginBottom: '1rem' }}>
        <Sparkles size={20} style={{ color: 'var(--primary)' }} />
        AIコーチによる個別アドバイス
      </h2>

      {loading && (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '1.5rem 0' }}>
          <div className="animate-spin" style={{
            width: '30px',
            height: '30px',
            border: '3px solid var(--border-card)',
            borderTopColor: 'var(--primary)',
            borderRadius: '50%'
          }}></div>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>AIが話し方のコツや改善案を考案中...</span>
        </div>
      )}

      {!advice && !loading && (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '1rem 0' }}>
          発音評価を実行すると、ここにAIコーチからのパーソナライズされたアドバイスが表示されます。
        </p>
      )}

      {advice && !loading && (
        <div style={{
          padding: '1.25rem',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid var(--border-card)',
          borderRadius: 'var(--border-radius-sm)',
          fontSize: '0.95rem',
          lineHeight: 1.6,
          whiteSpace: 'pre-wrap',
          color: 'var(--text-main)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontWeight: 600, color: 'var(--primary)' }}>
            <MessageSquareDot size={18} />
            コーチからの指導内容:
          </div>
          {advice}
        </div>
      )}
    </div>
  );
};
