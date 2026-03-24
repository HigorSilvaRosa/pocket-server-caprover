import { useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAppContext } from '../app-context';
import {
  CopyButton,
  CountdownTimer,
  PinDisplay,
  type PairCredentials,
} from '../components/pairing-ui';

type AppState = 'idle' | 'loading' | 'success' | 'error';

interface PairResponse extends PairCredentials {
  error?: string;
}

const AUTO_PAIR_GUARD_TTL_MS = 2500;

async function fetchPairCredentials(apiKey: string): Promise<PairCredentials> {
  const response = await fetch('/api/pair', {
    method: 'POST',
    headers: { 'x-api-key': apiKey },
  });

  const json = (await response.json().catch(() => null)) as PairResponse | null;

  if (!response.ok) {
    throw new Error(json?.error ?? `Erro ${response.status}`);
  }

  if (!json?.pin || !json.token) {
    throw new Error('Resposta invalida recebida do Fastify.');
  }

  return { pin: json.pin, token: json.token };
}

function shouldAutoStartPair(apiKey: string): boolean {
  if (typeof window === 'undefined') {
    return true;
  }

  const storageKey = `pocket-server:auto-pair:${apiKey}`;
  const now = Date.now();
  const previousAttempt = Number(window.sessionStorage.getItem(storageKey) ?? '0');

  if (Number.isFinite(previousAttempt) && now - previousAttempt < AUTO_PAIR_GUARD_TTL_MS) {
    return false;
  }

  window.sessionStorage.setItem(storageKey, String(now));
  return true;
}

export default function AuthPage() {
  const navigate = useNavigate();
  const { activeApiKey, apiKeySourceMode } = useAppContext();
  const [state, setState] = useState<AppState>('idle');
  const [result, setResult] = useState<PairCredentials | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(60);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastAutoStartRef = useRef('');

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

  const handlePair = useCallback(async () => {
    if (!activeApiKey.trim()) {
      navigate('/api-key', { replace: true });
      return;
    }

    setState('loading');
    setErrorMsg('');
    setResult(null);
    stopTimer();

    try {
      const pairCredentials = await fetchPairCredentials(activeApiKey.trim());
      setResult(pairCredentials);
      setState('success');
      startTimer();
    } catch (error: unknown) {
      const message =
        error instanceof Error ? error.message : 'Erro desconhecido';
      setErrorMsg(message);
      setState('error');
    }
  }, [activeApiKey, navigate, startTimer, stopTimer]);

  useEffect(() => () => stopTimer(), [stopTimer]);

  useEffect(() => {
    const trimmedApiKey = activeApiKey.trim();

    if (!trimmedApiKey || lastAutoStartRef.current === trimmedApiKey) {
      return;
    }

    lastAutoStartRef.current = trimmedApiKey;
    if (!shouldAutoStartPair(trimmedApiKey)) {
      return;
    }

    void handlePair();
  }, [activeApiKey, handlePair]);

  if (!activeApiKey.trim()) {
    return <Navigate to="/api-key" replace />;
  }

  const storageLabel =
    apiKeySourceMode === 'local' ? 'localStorage' : 'sessionStorage';

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="section-kicker">Passo 2</p>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h2 className="text-3xl font-bold tracking-tight text-slate-100">
              Auth e Pairing
            </h2>
            <p className="max-w-2xl text-sm leading-6 text-slate-400">
              Esta rota chama o Fastify em
              <span className="mx-1 font-mono text-violet-300">
                POST /api/pair
              </span>
              usando a API Key salva para gerar o PIN e o token de pareamento.
            </p>
          </div>

          <button
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
            onClick={() => navigate('/api-key')}
          >
            Alterar API Key
          </button>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          <div className="glass-card flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
                API Key ativa
              </p>
              <p className="text-sm text-slate-200">
                Persistida no <span className="font-mono">{storageLabel}</span>
              </p>
            </div>
            <span className="status-pill status-pill-success">
              pronta para auth
            </span>
          </div>

          {state === 'error' && (
            <div className="flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
              <svg
                className="h-4 w-4 shrink-0"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
              {errorMsg}
            </div>
          )}

          <div className="glass-card rounded-3xl p-6">
            {state === 'success' && result ? (
              <div className="space-y-6">
                <div className="text-center">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
                    PIN de pareamento
                  </p>
                  <PinDisplay pin={result.pin} />
                </div>

                <div className="space-y-2">
                  <p className="text-center text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
                    Token de pareamento
                  </p>
                  <div className="flex justify-center">
                    <CopyButton text={result.token} />
                  </div>
                </div>

                <div className="flex flex-col items-center gap-1">
                  <p className="text-xs text-slate-500">Expira em</p>
                  <CountdownTimer seconds={countdown} />
                </div>

                <button
                  className="w-full rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  onClick={() => void handlePair()}
                >
                  Gerar novo PIN
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
                    Estado atual
                  </p>
                  <h3 className="text-2xl font-semibold text-slate-100">
                    {state === 'loading'
                      ? 'Gerando credenciais de pareamento'
                      : 'Pronto para iniciar um novo pair'}
                  </h3>
                  <p className="text-sm leading-6 text-slate-400">
                    {state === 'loading'
                      ? 'O Fastify esta executando o fluxo de pair remoto e coletando PIN e token do processo.'
                      : 'Se precisar, voce pode disparar o fluxo novamente manualmente a qualquer momento.'}
                  </p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4 font-mono text-sm text-slate-400">
                  <p>
                    rota: <span className="text-slate-200">POST /api/pair</span>
                  </p>
                  <p className="mt-2">
                    header:{' '}
                    <span className="text-slate-200">x-api-key: ******</span>
                  </p>
                </div>

                <button
                  id="btn-pair"
                  className="btn-primary flex w-full items-center justify-center gap-2.5"
                  onClick={() => void handlePair()}
                  disabled={state === 'loading'}
                >
                  {state === 'loading' ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      Gerando PIN...
                    </>
                  ) : (
                    'Gerar PIN de pareamento'
                  )}
                </button>
              </div>
            )}
          </div>
        </div>

        <aside className="glass-card rounded-3xl p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            O que acontece aqui
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Pair remoto
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                O sidecar mata temporariamente o processo padrao, executa
                <span className="mx-1 font-mono">pocket-server pair --remote</span>
                e devolve o PIN e o token capturados da saida.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                Janela de 60 segundos
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Depois da resposta, a tela inicia o contador local para deixar
                claro o tempo util do pareamento.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
