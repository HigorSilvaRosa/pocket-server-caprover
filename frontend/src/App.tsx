import { useState, useEffect, useRef, useCallback } from 'react';

// ─── Types ────────────────────────────────────────────────────────────────────
type AppState = 'idle' | 'loading' | 'success' | 'error';

interface PairResult {
  pin: string;
  token: string;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function PinDisplay({ pin }: { pin: string }) {
  return (
    <div className="flex gap-2 justify-center my-2">
      {pin.split('').map((digit, i) => (
        <span key={i} className="pin-digit">
          {digit}
        </span>
      ))}
    </div>
  );
}

function CountdownTimer({ seconds }: { seconds: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / 60;
  const dashOffset = circumference * (1 - progress);
  const color = seconds <= 10 ? '#ef4444' : seconds <= 20 ? '#f59e0b' : '#8b5cf6';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="rotate-[-90deg]">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#ffffff10" strokeWidth="5" />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          style={{ transition: 'stroke-dashoffset 1s linear, stroke 0.5s ease' }}
        />
      </svg>
      <span
        className="font-mono font-bold text-lg tabular-nums"
        style={{ color, marginTop: '-56px' }}
      >
        {String(seconds).padStart(2, '0')}s
      </span>
    </div>
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copiar token"
      className="flex items-center gap-2 text-xs font-mono px-3 py-2 rounded-lg
        bg-white/5 border border-white/10 text-slate-400
        hover:bg-white/10 hover:text-slate-200 hover:border-white/20
        transition-all duration-200 active:scale-95"
    >
      {copied ? (
        <>
          <svg className="w-3.5 h-3.5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copiado!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span className="truncate max-w-[220px]">{text}</span>
        </>
      )}
    </button>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [apiKey, setApiKey] = useState('');
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<PairResult | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const startTimer = useCallback(() => {
    stopTimer();
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          stopTimer();
          setState('idle');
          setResult(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const handlePair = async () => {
    if (!apiKey.trim()) {
      setErrorMsg('Insira a API Key antes de continuar.');
      setState('error');
      return;
    }

    setState('loading');
    setErrorMsg('');
    setResult(null);
    stopTimer();

    try {
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'x-api-key': apiKey.trim() },
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error ?? `Erro ${res.status}`);
      }

      setResult({ pin: json.pin, token: json.token });
      setState('success');
      startTimer();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Erro desconhecido';
      setErrorMsg(message);
      setState('error');
    }
  };

  const handleReset = () => {
    stopTimer();
    setState('idle');
    setResult(null);
    setErrorMsg('');
    setCountdown(60);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      {/* Background glow */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 overflow-hidden"
      >
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Pocket Server</h1>
          <p className="text-sm text-slate-500 mt-1">Painel de Pareamento Seguro</p>
        </div>

        {/* Card */}
        <div className="glass-card p-6 space-y-5">

          {/* API Key input */}
          <div className="space-y-1.5">
            <label htmlFor="api-key" className="text-xs font-medium text-slate-400 uppercase tracking-widest">
              API Key
            </label>
            <input
              id="api-key"
              type="password"
              className="input-field"
              placeholder="••••••••••••••••••"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && state === 'idle' && handlePair()}
              disabled={state === 'loading' || state === 'success'}
              autoComplete="current-password"
            />
          </div>

          {/* Error */}
          {state === 'error' && (
            <div className="animate-fade-in flex items-center gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              {errorMsg}
            </div>
          )}

          {/* Success — PIN + Token + Timer */}
          {state === 'success' && result && (
            <div className="animate-slide-up space-y-5">
              <div className="text-center space-y-1">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">PIN de Pareamento</p>
                <PinDisplay pin={result.pin} />
              </div>

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-widest text-center">Token de Pareamento</p>
                <div className="flex justify-center">
                  <CopyButton text={result.token} />
                </div>
              </div>

              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-slate-500">Expira em</p>
                <CountdownTimer seconds={countdown} />
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="pt-1">
            {state !== 'success' ? (
              <button
                id="btn-pair"
                className="btn-primary w-full flex items-center justify-center gap-2.5"
                onClick={handlePair}
                disabled={state === 'loading'}
              >
                {state === 'loading' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    Gerando PIN...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
                    </svg>
                    Gerar PIN de Pareamento
                  </>
                )}
              </button>
            ) : (
              <button
                id="btn-reset"
                className="w-full text-sm text-slate-500 hover:text-slate-300 transition-colors duration-200 py-2"
                onClick={handleReset}
              >
                ← Gerar novo PIN
              </button>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Pocket Server Orchestrator &middot; Porta 3001
        </p>
      </div>
    </div>
  );
}
