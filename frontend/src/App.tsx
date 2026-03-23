import { useState, useEffect, useRef, useCallback } from 'react';

type AppState = 'idle' | 'loading' | 'success' | 'error';
type StorageMode = 'session' | 'local';

interface PairResult {
  pin: string;
  token: string;
}

interface StoredApiKey {
  value: string;
  mode: StorageMode | null;
}

const API_KEY_STORAGE_KEY = 'pocket-server-api-key';

function readStoredApiKey(): StoredApiKey {
  if (typeof window === 'undefined') {
    return { value: '', mode: null };
  }

  const localApiKey = window.localStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
  if (localApiKey) {
    return { value: localApiKey, mode: 'local' };
  }

  const sessionApiKey = window.sessionStorage.getItem(API_KEY_STORAGE_KEY)?.trim();
  if (sessionApiKey) {
    return { value: sessionApiKey, mode: 'session' };
  }

  return { value: '', mode: null };
}

function persistApiKey(value: string, mode: StorageMode) {
  if (typeof window === 'undefined') {
    return;
  }

  const trimmedValue = value.trim();
  window.localStorage.removeItem(API_KEY_STORAGE_KEY);
  window.sessionStorage.removeItem(API_KEY_STORAGE_KEY);

  const storage = mode === 'local' ? window.localStorage : window.sessionStorage;
  storage.setItem(API_KEY_STORAGE_KEY, trimmedValue);
}

const initialStoredApiKey = readStoredApiKey();

function PinDisplay({ pin }: { pin: string }) {
  return (
    <div className="flex gap-2 justify-center my-2">
      {pin.split('').map((digit, index) => (
        <span key={index} className="pin-digit">
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
          <svg
            className="w-3.5 h-3.5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-green-400">Copiado!</span>
        </>
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="truncate max-w-[220px]">{text}</span>
        </>
      )}
    </button>
  );
}

export default function App() {
  const [activeApiKey, setActiveApiKey] = useState(initialStoredApiKey.value);
  const [draftApiKey, setDraftApiKey] = useState(initialStoredApiKey.value);
  const [storageMode, setStorageMode] = useState<StorageMode>(initialStoredApiKey.mode ?? 'session');
  const [apiKeySourceMode, setApiKeySourceMode] = useState<StorageMode | null>(initialStoredApiKey.mode);
  const [isEditingApiKey, setIsEditingApiKey] = useState(!initialStoredApiKey.value);
  const [apiKeyError, setApiKeyError] = useState('');
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

  const resetPairingState = useCallback(() => {
    stopTimer();
    setState('idle');
    setResult(null);
    setErrorMsg('');
    setCountdown(60);
  }, [stopTimer]);

  const startTimer = useCallback(() => {
    stopTimer();
    setCountdown(60);
    timerRef.current = setInterval(() => {
      setCountdown((previousSeconds) => {
        if (previousSeconds <= 1) {
          stopTimer();
          setState('idle');
          setResult(null);
          return 0;
        }

        return previousSeconds - 1;
      });
    }, 1000);
  }, [stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  const handleSaveApiKey = () => {
    const trimmedApiKey = draftApiKey.trim();

    if (!trimmedApiKey) {
      setApiKeyError('Insira a API Key antes de continuar.');
      return;
    }

    persistApiKey(trimmedApiKey, storageMode);
    setApiKeyError('');
    setActiveApiKey(trimmedApiKey);
    setDraftApiKey(trimmedApiKey);
    setApiKeySourceMode(storageMode);
    setIsEditingApiKey(false);

    if (trimmedApiKey !== activeApiKey || !activeApiKey) {
      resetPairingState();
    }
  };

  const handlePair = async () => {
    if (!activeApiKey.trim()) {
      setIsEditingApiKey(true);
      setApiKeyError('Insira a API Key antes de continuar.');
      return;
    }

    setState('loading');
    setErrorMsg('');
    setResult(null);
    stopTimer();

    try {
      const res = await fetch('/api/pair', {
        method: 'POST',
        headers: { 'x-api-key': activeApiKey.trim() },
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
    resetPairingState();
  };

  const handleEditApiKey = () => {
    setDraftApiKey(activeApiKey);
    setStorageMode(apiKeySourceMode ?? storageMode);
    setApiKeyError('');
    setIsEditingApiKey(true);
  };

  const handleCancelApiKeyEdit = () => {
    setDraftApiKey(activeApiKey);
    setStorageMode(apiKeySourceMode ?? 'session');
    setApiKeyError('');
    setIsEditingApiKey(false);
  };

  const showApiKeyScreen = isEditingApiKey || !activeApiKey;
  const storageLabel = apiKeySourceMode === 'local' ? 'localStorage' : 'sessionStorage';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-violet-700/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-indigo-700/20 rounded-full blur-3xl" />
      </div>

      <div className="relative w-full max-w-md animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30 mb-4">
            <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-100 tracking-tight">Pocket Server</h1>
          <p className="text-sm text-slate-500 mt-1">Painel de Pareamento Seguro</p>
        </div>

        <div className="glass-card p-6 space-y-5">
          {showApiKeyScreen ? (
            <div className="space-y-5 animate-fade-in">
              <div className="space-y-1">
                <p className="text-sm text-slate-200">Informe a API Key para habilitar o pareamento.</p>
                <p className="text-xs text-slate-500">
                  Escolha se a chave deve durar apenas nesta aba ou ficar salva no navegador.
                </p>
              </div>

              <div className="space-y-1.5">
                <label htmlFor="api-key" className="text-xs font-medium text-slate-400 uppercase tracking-widest">
                  API Key
                </label>
                <input
                  id="api-key"
                  type="password"
                  className="input-field"
                  placeholder="Digite sua API Key"
                  value={draftApiKey}
                  onChange={(e) => {
                    setDraftApiKey(e.target.value);
                    if (apiKeyError) {
                      setApiKeyError('');
                    }
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveApiKey()}
                  autoComplete="current-password"
                />
              </div>

              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">Persistencia</p>

                <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                    storageMode === 'session'
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="api-key-storage"
                    className="mt-0.5 h-4 w-4 accent-violet-500"
                    checked={storageMode === 'session'}
                    onChange={() => setStorageMode('session')}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">sessionStorage</p>
                    <p className="text-xs text-slate-500">Mantem a chave so enquanto esta aba existir.</p>
                  </div>
                </label>

                <label
                  className={`flex items-start gap-3 rounded-xl border px-4 py-3 cursor-pointer transition-colors ${
                    storageMode === 'local'
                      ? 'border-violet-500/60 bg-violet-500/10'
                      : 'border-white/10 bg-white/5 hover:border-white/20'
                  }`}
                >
                  <input
                    type="radio"
                    name="api-key-storage"
                    className="mt-0.5 h-4 w-4 accent-violet-500"
                    checked={storageMode === 'local'}
                    onChange={() => setStorageMode('local')}
                  />
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-200">localStorage</p>
                    <p className="text-xs text-slate-500">Mantem a chave salva e pula esta tela nos proximos acessos.</p>
                  </div>
                </label>
              </div>

              {apiKeyError && (
                <div className="animate-fade-in flex items-center gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  {apiKeyError}
                </div>
              )}

              <div className="pt-1 flex gap-3">
                {activeApiKey && (
                  <button
                    className="flex-1 text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200 py-3 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10"
                    onClick={handleCancelApiKeyEdit}
                  >
                    Cancelar
                  </button>
                )}

                <button
                  className="btn-primary flex-1 flex items-center justify-center gap-2.5"
                  onClick={handleSaveApiKey}
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Salvar e continuar
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                <div className="space-y-1">
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-widest">API Key ativa</p>
                  <p className="text-sm text-slate-200">
                    Persistida no <span className="font-mono">{storageLabel}</span>
                  </p>
                </div>

                <button
                  className="text-sm text-slate-400 hover:text-slate-200 transition-colors duration-200"
                  onClick={handleEditApiKey}
                  disabled={state === 'loading'}
                >
                  Alterar
                </button>
              </div>

              {state === 'error' && (
                <div className="animate-fade-in flex items-center gap-2.5 text-sm text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                    />
                  </svg>
                  {errorMsg}
                </div>
              )}

              {state === 'success' && result && (
                <div className="animate-slide-up space-y-5">
                  <div className="text-center space-y-1">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest">PIN de Pareamento</p>
                    <PinDisplay pin={result.pin} />
                  </div>

                  <div className="space-y-1.5">
                    <p className="text-xs font-medium text-slate-500 uppercase tracking-widest text-center">
                      Token de Pareamento
                    </p>
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
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z"
                          />
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
                    {'<-'} Gerar novo PIN
                  </button>
                )}
              </div>
            </>
          )}
        </div>

        <p className="text-center text-xs text-slate-600 mt-6">
          Pocket Server Orchestrator &middot; Porta 3001
        </p>
      </div>
    </div>
  );
}
