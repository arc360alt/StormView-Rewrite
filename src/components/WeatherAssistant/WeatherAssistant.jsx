import { useEffect, useRef, useState } from 'react';
import { Sparkles, X, Send, Trash2 } from 'lucide-react';
import { useWeatherAssistant } from '../../hooks/useWeatherAssistant';
import { MODELS } from '../../services/webllm';
import { useIsMobile } from '../../hooks/useIsMobile';
import useAppStore from '../../store/useAppStore';
import './WeatherAssistant.css';

function StatusPanel({ status, progress, errorMsg, gpuMessage, onRetry, onRecheckGpu }) {
  if (status === 'checking') {
    return (
      <div className="wa-status">
        <div className="wa-status-title">Checking WebGPU…</div>
        <p>Making sure your browser can actually run a model on the GPU.</p>
      </div>
    );
  }
  if (status === 'unsupported') {
    return (
      <div className="wa-status">
        <div className="wa-status-title">WebGPU is disabled or unavailable</div>
        <p>{gpuMessage}</p>
        <p>The assistant can't run without it, so loading a model is disabled.</p>
        <button className="wa-retry-btn" onClick={onRecheckGpu}>Check Again</button>
      </div>
    );
  }
  if (status === 'error') {
    return (
      <div className="wa-status">
        <div className="wa-status-title">Couldn't load the assistant</div>
        <p>{errorMsg}</p>
        <button className="wa-retry-btn" onClick={onRetry}>Try Again</button>
      </div>
    );
  }
  if (status === 'loading') {
    const pct = progress?.progress != null ? Math.round(progress.progress * 100) : null;
    return (
      <div className="wa-status">
        <div className="wa-status-title">Downloading model…</div>
        <p>{progress?.text ?? 'Preparing the on-device assistant. This only happens once.'}</p>
        <div className="wa-progress-track">
          <div className="wa-progress-fill" style={{ width: `${pct ?? 0}%` }} />
        </div>
        {pct != null && <div className="wa-progress-pct">{pct}%</div>}
      </div>
    );
  }
  return (
    <div className="wa-status">
      <div className="wa-status-title">Weather Assistant</div>
      <p>
        Runs entirely on your device — ask about the forecast, alerts, or air
        quality for your location. First use downloads a small AI model.
      </p>
      <button className="wa-retry-btn" onClick={onRetry}>Load Assistant</button>
    </div>
  );
}

export function WeatherAssistant({ weatherData }) {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(false);
  const assistantModel = useAppStore((s) => s.assistantModel);
  const setAssistantModel = useAppStore((s) => s.setAssistantModel);
  const {
    status, progress, errorMsg, gpuMessage, messages, streaming,
    load, sendMessage, reset, recheckGpu,
  } = useWeatherAssistant(weatherData);
  const [input, setInput] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages]);

  // Switching models while already loaded — reload with the new one.
  useEffect(() => {
    if (status === 'ready') load();
  }, [assistantModel]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim() || streaming) return;
    sendMessage(input);
    setInput('');
  };

  return (
    <>
      <button
        className={`wa-fab ${isMobile ? 'wa-fab--mobile' : ''} ${open ? 'wa-fab--active' : ''}`}
        onClick={() => setOpen((v) => !v)}
        title="Weather Assistant"
        aria-label="Weather Assistant"
      >
        {open ? <X size={19} strokeWidth={2} /> : <Sparkles size={19} strokeWidth={1.8} />}
      </button>

      {open && (
        <div className={`wa-panel ${isMobile ? 'wa-panel--mobile' : ''}`}>
          <div className="wa-header">
            <span className="wa-header-title">
              <Sparkles size={14} strokeWidth={2} style={{ color: 'var(--accent)' }} />
              Weather Assistant
            </span>
            <div className="wa-header-actions">
              {status === 'ready' && (
                <>
                  <select
                    className="wa-model-select"
                    value={assistantModel}
                    onChange={(e) => setAssistantModel(e.target.value)}
                  >
                    {MODELS.map((m) => (
                      <option key={m.id} value={m.id}>{m.label}</option>
                    ))}
                  </select>
                  <button className="wa-icon-btn" onClick={reset} aria-label="Clear chat">
                    <Trash2 size={14} strokeWidth={1.8} />
                  </button>
                </>
              )}
              <button className="wa-icon-btn" onClick={() => setOpen(false)} aria-label="Close">
                <X size={14} strokeWidth={1.8} />
              </button>
            </div>
          </div>

          {status !== 'ready' ? (
            <StatusPanel
              status={status}
              progress={progress}
              errorMsg={errorMsg}
              gpuMessage={gpuMessage}
              onRetry={load}
              onRecheckGpu={recheckGpu}
            />
          ) : (
            <>
              <div className="wa-messages" ref={scrollRef}>
                {messages.length === 0 && (
                  <div className="wa-empty">Ask me anything about the current weather.</div>
                )}
                {messages.map((m, i) => (
                  <div key={i} className={`wa-msg wa-msg--${m.role}`}>
                    {m.content || (streaming && i === messages.length - 1 ? '…' : '')}
                  </div>
                ))}
              </div>
              <form className="wa-input-row" onSubmit={handleSend}>
                <input
                  className="wa-input"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about the weather…"
                  disabled={streaming}
                />
                <button className="wa-send-btn" type="submit" disabled={streaming || !input.trim()}>
                  <Send size={15} strokeWidth={2} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}
