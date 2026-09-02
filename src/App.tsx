import { useState, useEffect } from 'react';
import { Sun, Moon } from 'lucide-react';
import { PresetScenario, PRESET_SCENARIOS } from './services/scenarios';
import { ScenarioSelector } from './components/ScenarioSelector';
import { ExampleAudioPlayer } from './components/ExampleAudioPlayer';
import { Recorder } from './components/Recorder';
import { PlaybackComparison } from './components/PlaybackComparison';
import { ScoreDisplay } from './components/ScoreDisplay';
import { AICoach } from './components/AICoach';
import { assessPronunciation, AssessmentResult } from './services/pronunciationAssessmentService';
import { generateAICoachingAdvice } from './services/aiCoachService';

function App() {
  // Theme state
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');

  // Scenario States
  const [currentScenario, setCurrentScenario] = useState<PresetScenario | null>(PRESET_SCENARIOS[0]);
  const [customText, setCustomText] = useState('');

  // Audio files mapping states
  const [exampleAudioUrl, setExampleAudioUrl] = useState<string | null>(null);
  const [userAudioBlob, setUserAudioBlob] = useState<Blob | null>(null);
  const [userAudioUrl, setUserAudioUrl] = useState<string | null>(null);

  // Evaluation States
  const [assessmentResult, setAssessmentResult] = useState<AssessmentResult | null>(null);
  const [assessmentLoading, setAssessmentLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Apply Theme attribute
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  // Determine current active text
  const activeText = currentScenario ? currentScenario.text : customText;
  const activeCategory = currentScenario ? currentScenario.category : 'presentation';
  const activeTitle = currentScenario ? currentScenario.title : '自由入力テキスト';

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light');
  };

  const handleScenarioChange = (scenario: PresetScenario | null) => {
    setCurrentScenario(scenario);
    // Reset state for new scenario
    setExampleAudioUrl(null);
    setUserAudioBlob(null);
    setUserAudioUrl(null);
    setAssessmentResult(null);
    setAiAdvice(null);
    setError(null);
  };

  const handleCustomTextChange = (text: string) => {
    setCustomText(text);
    // Reset state for new custom text
    setExampleAudioUrl(null);
    setUserAudioBlob(null);
    setUserAudioUrl(null);
    setAssessmentResult(null);
    setAiAdvice(null);
    setError(null);
  };

  const handleRecordingComplete = (blob: Blob | null) => {
    setUserAudioBlob(blob);
    // When new recording is made or reset, clear previous assessment and advice
    setAssessmentResult(null);
    setAiAdvice(null);
    setError(null);
  };

  // Perform pronunciation evaluation & AI coaching sequentially
  const handleAssessment = async () => {
    if (!userAudioBlob || !activeText.trim()) return;

    setAssessmentLoading(true);
    setAiLoading(true);
    setAssessmentResult(null);
    setAiAdvice(null);
    setError(null);

    try {
      // 1. Run Azure Pronunciation Assessment
      const result = await assessPronunciation(userAudioBlob, activeText);
      setAssessmentResult(result);
      setAssessmentLoading(false);

      // 2. Run LLM AI coaching using assessment JSON
      try {
        const advice = await generateAICoachingAdvice(activeText, activeTitle, activeCategory, result);
        setAiAdvice(advice);
      } catch (err: any) {
        console.error(err);
        setError(`AIアドバイスの生成に失敗しました: ${err.message}`);
      } finally {
        setAiLoading(false);
      }

    } catch (err: any) {
      console.error(err);
      setError(`評価に失敗しました: ${err.message}`);
      setAssessmentLoading(false);
      setAiLoading(false);
    }
  };

  return (
    <div style={{ paddingBottom: '4rem' }}>
      {/* Header Bar */}
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '2rem',
        paddingBottom: '1rem',
        borderBottom: '1px solid var(--border-card)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #06B6D4 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
            flexShrink: 0
          }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="none">
              <rect x="13" y="7" width="6" height="11" rx="3" fill="#ffffff" />
              <path d="M9 14C9 17.866 12.134 21 16 21C19.866 21 23 17.866 23 14" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M16 21V25M12 25H20" stroke="#ffffff" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: '1.35rem', fontWeight: 700, letterSpacing: '-0.02em', lineHeight: 1.2 }}>標準語練習アプリ</h1>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>関東イントネーション & 発音評価</span>
          </div>
        </div>
        <button
          onClick={toggleTheme}
          style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-card)',
            color: 'var(--text-main)',
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
          title={theme === 'light' ? 'ダークモードへ' : 'ライトモードへ'}
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
        </button>
      </header>

      {error && (
        <div style={{
          background: 'rgba(255, 59, 48, 0.1)',
          border: '1px solid var(--danger)',
          color: 'var(--danger)',
          padding: '1rem',
          borderRadius: 'var(--border-radius-sm)',
          marginBottom: '1.5rem',
          fontSize: '0.9rem'
        }}>
          <strong>エラーが発生しました:</strong> {error}
        </div>
      )}

      {/* Steps Layout Flow */}
      <main>
        {/* Step 1: Scenario Settings */}
        <ScenarioSelector
          currentScenario={currentScenario}
          onSelectScenario={handleScenarioChange}
          customText={customText}
          onChangeCustomText={handleCustomTextChange}
        />

        {/* Step 2: Generating and Playing reference speech */}
        <ExampleAudioPlayer
          key={currentScenario ? currentScenario.id : 'custom-' + activeText.length}
          text={activeText}
          category={activeCategory}
          onAudioReady={setExampleAudioUrl}
        />

        {/* Step 3: Voice recording */}
        <Recorder
          onRecordingComplete={handleRecordingComplete}
          userAudioUrl={userAudioUrl}
          setUserAudioUrl={setUserAudioUrl}
        />

        {/* Step 4: Comparison Playback (Enabled only when both files exist) */}
        <PlaybackComparison
          exampleAudioUrl={exampleAudioUrl}
          userAudioUrl={userAudioUrl}
        />

        {/* Step 5: Scoring results display */}
        <ScoreDisplay
          result={assessmentResult}
          loading={assessmentLoading}
          onAssess={handleAssessment}
          canAssess={!!userAudioBlob && !assessmentLoading}
          userAudioUrl={userAudioUrl}
        />

        {/* Step 6: AI Coaching Feedback */}
        <AICoach
          advice={aiAdvice}
          loading={aiLoading}
        />
      </main>
    </div>
  );
}

export default App;
