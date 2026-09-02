import React, { useState, useRef, useEffect } from 'react';
import { Mic, Square, Play, Pause, Trash2, Send, RotateCcw } from 'lucide-react';
import { FileAttachment } from '../types';

interface VoiceRecorderProps {
  onSendVoiceNote: (fileData: FileAttachment) => void;
  onCancel: () => void;
}

export const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSendVoiceNote, onCancel }) => {
  const [isRecording, setIsRecording] = useState<boolean>(true);
  const [duration, setDuration] = useState<number>(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    startRecording();

    return () => {
      stopTimer();
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        setIsRecording(false);
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      startTimer();
    } catch (err) {
      console.error('Error accessing microphone:', err);
      alert('Microphone access is required to record voice notes.');
      onCancel();
    }
  };

  const startTimer = () => {
    setDuration(0);
    timerRef.current = setInterval(() => {
      setDuration((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const stopRecording = () => {
    stopTimer();
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
  };

  const handleSend = () => {
    if (!audioBlob) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64data = reader.result as string;
      onSendVoiceNote({
        name: `voice_note_${Date.now()}.webm`,
        size: audioBlob.size,
        mimeType: 'audio/webm',
        dataUrl: base64data,
        duration,
      });
    };
    reader.readAsDataURL(audioBlob);
  };

  const togglePreview = () => {
    if (!previewAudioRef.current) return;
    if (isPlayingPreview) {
      previewAudioRef.current.pause();
      setIsPlayingPreview(false);
    } else {
      previewAudioRef.current.play();
      setIsPlayingPreview(true);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="flex items-center justify-between w-full bg-slate-800/90 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-slate-700/60 shadow-lg animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-center gap-3">
        {/* Cancel Button */}
        <button
          id="btn-cancel-voice"
          onClick={onCancel}
          className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-full transition-colors"
          title="Delete voice note"
        >
          <Trash2 className="w-5 h-5" />
        </button>

        {/* Live / Stopped waveform and timer */}
        <div className="flex items-center gap-3">
          {isRecording ? (
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-rose-500 animate-ping" />
              <div className="flex items-end gap-0.5 h-6">
                {[40, 75, 100, 60, 85, 45, 90, 65, 30, 80, 50, 95].map((h, i) => (
                  <span
                    key={i}
                    className="w-1 bg-emerald-400 rounded-full animate-pulse"
                    style={{
                      height: `${h}%`,
                      animationDelay: `${i * 0.1}s`,
                    }}
                  />
                ))}
              </div>
              <span className="text-sm font-medium text-slate-200 tabular-nums">
                {formatTime(duration)}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                id="btn-play-voice-preview"
                onClick={togglePreview}
                className="p-2 bg-emerald-500/20 text-emerald-400 rounded-full hover:bg-emerald-500/30 transition-colors"
              >
                {isPlayingPreview ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>
              <span className="text-sm font-medium text-slate-300 tabular-nums">
                Voice Note ({formatTime(duration)})
              </span>
              {audioUrl && (
                <audio
                  ref={previewAudioRef}
                  src={audioUrl}
                  onEnded={() => setIsPlayingPreview(false)}
                  className="hidden"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2">
        {isRecording ? (
          <button
            id="btn-stop-voice"
            onClick={stopRecording}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-700 hover:bg-slate-600 text-slate-200 rounded-xl text-xs font-medium transition-colors"
          >
            <Square className="w-3.5 h-3.5 fill-current" />
            Stop
          </button>
        ) : (
          <button
            id="btn-rerecord-voice"
            onClick={startRecording}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-700/50 rounded-full transition-colors"
            title="Re-record"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        )}

        <button
          id="btn-send-voice"
          onClick={isRecording ? stopRecording : handleSend}
          className="p-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-md shadow-emerald-900/40 transition-transform active:scale-95"
          title="Send Encrypted Voice Note"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
