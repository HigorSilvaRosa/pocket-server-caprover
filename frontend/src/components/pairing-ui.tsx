import { useState } from 'react';

export interface PairCredentials {
  pin: string;
  token: string;
}

export function PinDisplay({ pin }: { pin: string }) {
  return (
    <div className="my-2 flex justify-center gap-2">
      {pin.split('').map((digit, index) => (
        <span key={index} className="pin-digit">
          {digit}
        </span>
      ))}
    </div>
  );
}

export function CountdownTimer({ seconds }: { seconds: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const progress = seconds / 60;
  const dashOffset = circumference * (1 - progress);
  const color =
    seconds <= 10 ? '#ef4444' : seconds <= 20 ? '#f59e0b' : '#8b5cf6';

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="72" height="72" className="rotate-[-90deg]">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#ffffff10"
          strokeWidth="5"
        />
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
        className="mt-[-56px] font-mono text-lg font-bold tabular-nums"
        style={{ color }}
      >
        {String(seconds).padStart(2, '0')}s
      </span>
    </div>
  );
}

export function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={handleCopy}
      title="Copiar token"
      className="flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-mono text-slate-400 transition-all duration-200 hover:border-white/20 hover:bg-white/10 hover:text-slate-200 active:scale-95"
    >
      {copied ? (
        <>
          <svg
            className="h-3.5 w-3.5 text-green-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M5 13l4 4L19 7"
            />
          </svg>
          <span className="text-green-400">Copiado!</span>
        </>
      ) : (
        <>
          <svg
            className="h-3.5 w-3.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
            />
          </svg>
          <span className="max-w-[220px] truncate">{text}</span>
        </>
      )}
    </button>
  );
}
