import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../app-context';
import type { StorageMode } from '../api-key-storage';

export default function ApiKeyPage() {
  const navigate = useNavigate();
  const { activeApiKey, apiKeySourceMode, saveApiKey } = useAppContext();
  const [draftApiKey, setDraftApiKey] = useState(activeApiKey);
  const [storageMode, setStorageMode] = useState<StorageMode>(
    apiKeySourceMode ?? 'session',
  );
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    setDraftApiKey(activeApiKey);
    setStorageMode(apiKeySourceMode ?? 'session');
    setErrorMsg('');
  }, [activeApiKey, apiKeySourceMode]);

  const handleSave = () => {
    const trimmedApiKey = draftApiKey.trim();

    if (!trimmedApiKey) {
      setErrorMsg('Insira a API Key antes de continuar.');
      return;
    }

    saveApiKey(trimmedApiKey, storageMode);
    navigate('/auth', { replace: true });
  };

  const storageLabel =
    apiKeySourceMode === 'local' ? 'localStorage' : 'sessionStorage';

  return (
    <section className="space-y-8">
      <header className="space-y-2">
        <p className="section-kicker">Passo 1</p>
        <h2 className="text-3xl font-bold tracking-tight text-slate-100">
          Configure a API Key
        </h2>
        <p className="max-w-2xl text-sm leading-6 text-slate-400">
          Essa chave libera a chamada protegida ao Fastify. Ao salvar, a
          aplicacao navega direto para a tela de auth e dispara o fluxo de pair.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-6">
          {activeApiKey && (
            <div className="glass-card flex flex-col gap-3 rounded-2xl px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
                  API Key atual
                </p>
                <p className="text-sm text-slate-200">
                  Persistida no <span className="font-mono">{storageLabel}</span>
                </p>
              </div>

              <button
                className="rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                onClick={() => navigate('/auth')}
              >
                Continuar com a chave atual
              </button>
            </div>
          )}

          <div className="glass-card space-y-5 rounded-3xl p-6">
            <div className="space-y-1">
              <p className="text-sm text-slate-200">
                Informe a chave que o Fastify deve usar no header
                <span className="font-mono text-violet-300"> x-api-key</span>.
              </p>
              <p className="text-xs text-slate-500">
                A chave fica apenas na sessao atual ou salva no navegador,
                conforme a opcao escolhida abaixo.
              </p>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="api-key"
                className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400"
              >
                API Key
              </label>
              <input
                id="api-key"
                type="password"
                className="input-field"
                placeholder="Digite sua API Key"
                value={draftApiKey}
                onChange={(event) => {
                  setDraftApiKey(event.target.value);
                  if (errorMsg) {
                    setErrorMsg('');
                  }
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    handleSave();
                  }
                }}
                autoComplete="current-password"
              />
            </div>

            <div className="space-y-3">
              <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-400">
                Persistencia
              </p>

              <label
                className={`selection-card ${
                  storageMode === 'session' ? 'selection-card-active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="api-key-storage"
                  className="mt-0.5 h-4 w-4 accent-violet-500"
                  checked={storageMode === 'session'}
                  onChange={() => setStorageMode('session')}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-slate-200">
                    sessionStorage
                  </span>
                  <span className="block text-xs text-slate-500">
                    Mantem a chave so enquanto esta aba existir.
                  </span>
                </span>
              </label>

              <label
                className={`selection-card ${
                  storageMode === 'local' ? 'selection-card-active' : ''
                }`}
              >
                <input
                  type="radio"
                  name="api-key-storage"
                  className="mt-0.5 h-4 w-4 accent-violet-500"
                  checked={storageMode === 'local'}
                  onChange={() => setStorageMode('local')}
                />
                <span className="space-y-1">
                  <span className="block text-sm font-medium text-slate-200">
                    localStorage
                  </span>
                  <span className="block text-xs text-slate-500">
                    Mantem a chave salva e evita repetir esta etapa nos proximos
                    acessos.
                  </span>
                </span>
              </label>
            </div>

            {errorMsg && (
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

            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="btn-primary flex-1" onClick={handleSave}>
                Salvar e ir para auth
              </button>
              {activeApiKey && (
                <button
                  className="rounded-xl border border-white/10 bg-white/5 px-5 py-3 text-sm text-slate-300 transition-colors duration-200 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  onClick={() => navigate('/auth')}
                >
                  Voltar sem alterar
                </button>
              )}
            </div>
          </div>
        </div>

        <aside className="glass-card rounded-3xl p-5">
          <p className="text-xs font-medium uppercase tracking-[0.28em] text-slate-500">
            Fluxo
          </p>
          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-100">
                1. Captura da chave
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                A chave fica persistida no navegador e passa a estar disponivel
                para a proxima etapa.
              </p>
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-100">
                2. Pair automatizado
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                Ao entrar em <span className="font-mono">/auth</span>, a tela
                chama <span className="font-mono">POST /api/pair</span> no
                Fastify para gerar PIN e token.
              </p>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}
