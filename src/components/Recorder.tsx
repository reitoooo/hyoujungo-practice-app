import React, { useState, useRef } from 'react';
import { Mic, Square, Play, RefreshCw, AlertCircle } from 'lucide-react';

interface RecorderProps {
  onRecordingComplete: (blob: Blob | null) => void;
  userAudioUrl: string | null;
  setUserAudioUrl: (url: string | null) => void;
  activeText: string;
  isFreetalk: boolean;
}

export const Recorder: React.FC<RecorderProps> = ({
  onRecordingComplete,
  userAudioUrl,
  setUserAudioUrl,
  activeText,
  isFreetalk
}) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cleanup audio player when userAudioUrl changes or component unmounts
  React.useEffect(() => {
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
  }, [userAudioUrl]);

  const startRecording = async () => {
    audioChunksRef.current = [];
    setError(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const options = { mimeType: 'audio/webm' };
      let mediaRecorder: MediaRecorder;
      
      try {
        mediaRecorder = new MediaRecorder(stream, options);
      } catch (e) {
        // Fallback for browsers that don't support audio/webm
        mediaRecorder = new MediaRecorder(stream);
      }

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        // Revoke previous URL if exists to avoid memory leak
        if (userAudioUrl) {
          URL.revokeObjectURL(userAudioUrl);
        }

        const url = URL.createObjectURL(audioBlob);
        setUserAudioUrl(url);
        onRecordingComplete(audioBlob);

        // Stop all tracks on the stream to release the microphone
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorderRef.current = mediaRecorder;
      // Start recording with 100ms timeslice to ensure continuous data chunk collection
      mediaRecorder.start(100);
      setIsRecording(true);
    } catch (e: any) {
      console.error(e);
      setError('マイクの使用許可が得られなかったか、デバイスが見つかりません。');
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const handlePlayToggle = () => {
    if (!userAudioUrl) return;

    if (isPlaying && audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      setIsPlaying(false);
      return;
    }

    // Always create / ensure fresh Audio instance for current userAudioUrl
    if (!audioPlayerRef.current) {
      const audio = new Audio(userAudioUrl);
      audio.onended = () => setIsPlaying(false);
      audio.onerror = () => setIsPlaying(false);
      audioPlayerRef.current = audio;
    }

    audioPlayerRef.current.currentTime = 0;
    audioPlayerRef.current.play().then(() => {
      setIsPlaying(true);
    }).catch(err => {
      console.error(err);
      setIsPlaying(false);
    });
  };

  const resetRecording = () => {
    if (userAudioUrl) {
      URL.revokeObjectURL(userAudioUrl);
    }
    setUserAudioUrl(null);
    onRecordingComplete(null);
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current = null;
    }
    setIsPlaying(false);
  };

  return (
    <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '1.25rem' }}>
        <Mic size={20} style={{ color: 'var(--primary)' }} />
        発話の録音
      </h2>

      {error && (
        <div style={{
          color: 'var(--danger)',
          fontSize: '0.85rem',
          background: 'rgba(255, 59, 48, 0.1)',
          padding: '0.75rem',
          borderRadius: 'var(--border-radius-sm)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Teleprompter Display */}
      {(!userAudioUrl) && (
        <div className={`teleprompter ${isFreetalk ? 'free-talk' : ''} ${isRecording ? 'recording' : ''}`}>
          {isFreetalk ? (
            '自由に話してください（話した内容は自動で文字起こしされます）'
          ) : (
            activeText || 'テキストが入力されていません'
          )}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '0.25rem' }}>
        {!userAudioUrl ? (
          <button
            onClick={isRecording ? stopRecording : startRecording}
            className="btn-primary"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              background: isRecording ? 'var(--danger)' : 'var(--primary)',
              boxShadow: isRecording ? '0 4px 14px 0 rgba(255, 59, 48, 0.3)' : '0 4px 14px 0 var(--primary-glow)',
              minWidth: '150px',
              justifyContent: 'center'
            }}
          >
            {isRecording ? <Square size={16} /> : <Mic size={16} />}
            {isRecording ? '録音を停止' : '録音を開始'}
          </button>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', width: '100%' }}>
            <button
              onClick={handlePlayToggle}
              className="btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: '140px', justifyContent: 'center' }}
            >
              {isPlaying ? <Square size={16} /> : <Play size={16} />}
              {isPlaying ? '一時停止' : '自分の声を聴く'}
            </button>

            <button
              onClick={resetRecording}
              className="btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshCw size={14} />
              録り直す
            </button>
          </div>
        )}
      </div>

      {isRecording && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.25rem' }}>
          <span className="pulse-indicator" style={{
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            backgroundColor: 'var(--danger)',
            display: 'inline-block'
          }}></span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>録音中... マイクに向かって話してください。</span>
        </div>
      )}
    </div>
  );
};
