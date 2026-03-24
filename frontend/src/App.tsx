import { useMemo, useState } from 'react';
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
} from 'react-router-dom';
import AppContext from './app-context';
import {
  persistApiKey,
  readStoredApiKey,
  type StorageMode,
} from './api-key-storage';
import AuthPage from './routes/auth-page';
import ApiKeyPage from './routes/api-key-page';

interface AppShellProps {
  hasApiKey: boolean;
  apiKeySourceMode: StorageMode | null;
}

function StepLink({
  to,
  step,
  title,
  description,
}: {
  to: string;
  step: string;
  title: string;
  description: string;
}) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `nav-link ${isActive ? 'nav-link-active' : ''}`
      }
    >
      <span className="step-badge">{step}</span>
      <span className="space-y-1">
        <span className="block text-sm font-semibold text-slate-100">
          {title}
        </span>
        <span className="block text-xs text-slate-500">{description}</span>
      </span>
    </NavLink>
  );
}

function AppShell({ hasApiKey, apiKeySourceMode }: AppShellProps) {
  const storageLabel =
    apiKeySourceMode === 'local' ? 'localStorage' : 'sessionStorage';

  return (
    <div className="min-h-screen px-4 py-8 sm:py-10">
      <div aria-hidden className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(124,58,237,0.18),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(79,70,229,0.16),_transparent_30%),linear-gradient(160deg,_#080b12_0%,_#101522_52%,_#0a0c10_100%)]" />
        <div className="absolute top-12 right-[8%] h-56 w-56 rounded-full border border-violet-500/20 bg-violet-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-[10%] h-64 w-64 rounded-full border border-indigo-500/20 bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative mx-auto w-full max-w-6xl animate-fade-in">
        <div className="grid gap-6 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="glass-card p-6 lg:sticky lg:top-8 lg:h-fit">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-lg shadow-violet-500/30">
              <svg
                className="h-7 w-7 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8.25 3v1.5M4.5 8.25H3m18 0h-1.5M4.5 12H3m18 0h-1.5m-15 3.75H3m18 0h-1.5M8.25 19.5V21M12 3v1.5m0 15V21m3.75-18v1.5m0 15V21m-9-1.5h10.5a2.25 2.25 0 002.25-2.25V6.75a2.25 2.25 0 00-2.25-2.25H6.75A2.25 2.25 0 004.5 6.75v10.5a2.25 2.25 0 002.25 2.25zm.75-12h9v9h-9v-9z"
                />
              </svg>
            </div>

            <div className="mt-6 space-y-2">
              <p className="section-kicker">Pocket Server</p>
              <h1 className="text-2xl font-bold tracking-tight text-slate-100">
                Router de pareamento
              </h1>
              <p className="text-sm leading-6 text-slate-400">
                A aplicacao agora navega por etapas: primeiro captura a API Key,
                depois chama o Fastify para iniciar o fluxo de pair.
              </p>
            </div>

            <div className="mt-8 space-y-3">
              <StepLink
                to="/api-key"
                step="01"
                title="API Key"
                description="Persistencia e validacao da chave"
              />
              <StepLink
                to="/auth"
                step="02"
                title="Auth"
                description="Geracao do PIN e token via Fastify"
              />
            </div>

            <div className="mt-8 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.3em] text-slate-500">
                Status
              </p>
              <div className="mt-3 space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">API Key</span>
                  <span className={`status-pill ${hasApiKey ? 'status-pill-success' : 'status-pill-muted'}`}>
                    {hasApiKey ? 'Configurada' : 'Pendente'}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-sm text-slate-300">Storage</span>
                  <span className="text-xs font-mono text-slate-500">
                    {hasApiKey ? storageLabel : 'aguardando'}
                  </span>
                </div>
              </div>
            </div>

            <p className="mt-8 text-xs text-slate-600">
              Fastify sidecar em <span className="font-mono">/api</span> com
              proxy local para a porta 3001.
            </p>
          </aside>

          <main className="glass-card min-h-[640px] p-6 sm:p-8">
            <Routes>
              <Route
                path="/"
                element={
                  <Navigate to={hasApiKey ? '/auth' : '/api-key'} replace />
                }
              />
              <Route path="/api-key" element={<ApiKeyPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route
                path="*"
                element={
                  <Navigate to={hasApiKey ? '/auth' : '/api-key'} replace />
                }
              />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const initialStoredApiKey = useMemo(() => readStoredApiKey(), []);
  const [activeApiKey, setActiveApiKey] = useState(initialStoredApiKey.value);
  const [apiKeySourceMode, setApiKeySourceMode] = useState<StorageMode | null>(
    initialStoredApiKey.mode,
  );

  const contextValue = useMemo(
    () => ({
      activeApiKey,
      apiKeySourceMode,
      saveApiKey(value: string, mode: StorageMode) {
        persistApiKey(value, mode);
        setActiveApiKey(value.trim());
        setApiKeySourceMode(mode);
      },
    }),
    [activeApiKey, apiKeySourceMode],
  );

  return (
    <AppContext.Provider value={contextValue}>
      <BrowserRouter>
        <AppShell
          hasApiKey={Boolean(activeApiKey.trim())}
          apiKeySourceMode={apiKeySourceMode}
        />
      </BrowserRouter>
    </AppContext.Provider>
  );
}
