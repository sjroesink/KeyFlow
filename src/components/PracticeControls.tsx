import { usePracticeStore } from '../store/practiceStore';

interface PracticeControlsProps {
  onToggleWaitMode: (enabled: boolean) => void;
  onSkip: () => void;
}

function formatTime(s: number): string {
  const min = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function PracticeControls({ onToggleWaitMode, onSkip }: PracticeControlsProps) {
  const mode = usePracticeStore((s) => s.mode);
  const loopRegion = usePracticeStore((s) => s.loopRegion);
  const isWaiting = usePracticeStore((s) => s.isWaiting);

  const waitModeOn = mode === 'waitMode';

  return (
    <div className="flex items-center gap-2">
      {/* Wait Mode Toggle — compact */}
      <div
        className={`bg-surface-variant/60 backdrop-blur-xl h-9 pl-3 pr-1.5 rounded-full flex items-center gap-2 cursor-pointer transition-all ${
          waitModeOn ? 'border border-secondary/20' : 'border border-transparent'
        }`}
        onClick={() => onToggleWaitMode(!waitModeOn)}
        role="switch"
        aria-checked={waitModeOn}
      >
        <span className="text-[9px] uppercase tracking-widest text-secondary font-bold">
          Wait
        </span>
        <div
          className={`w-8 h-4 rounded-full flex items-center px-0.5 transition-all duration-200 ${
            waitModeOn ? 'bg-secondary justify-end' : 'bg-surface-container-highest justify-start'
          }`}
        >
          <div
            className={`w-3 h-3 rounded-full transition-all duration-200 ${
              waitModeOn ? 'bg-on-secondary' : 'bg-outline'
            }`}
          />
        </div>
      </div>

      {/* Loop Button — compact */}
      <button
        className={`bg-surface-variant/60 backdrop-blur-xl h-9 px-3 rounded-full flex items-center gap-1.5 hover:bg-surface-bright transition-all ${
          loopRegion ? 'border border-primary/30' : ''
        }`}
        onClick={() => {
          if (loopRegion) {
            usePracticeStore.getState().setLoopRegion(null);
          }
        }}
      >
        <svg
          className={`w-3.5 h-3.5 transition-colors ${
            loopRegion ? 'text-primary' : 'text-on-surface-variant'
          }`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="17 1 21 5 17 9" />
          <path d="M3 11V9a4 4 0 0 1 4-4h14" />
          <polyline points="7 23 3 19 7 15" />
          <path d="M21 13v2a4 4 0 0 1-4 4H3" />
        </svg>
        <span className="text-xs font-medium">
          {loopRegion ? `${formatTime(loopRegion.start)}-${formatTime(loopRegion.end)}` : 'Loop'}
        </span>
      </button>

      {/* Skip — only when waiting */}
      {isWaiting && (
        <button
          className="bg-surface-variant/60 backdrop-blur-xl h-9 px-3 rounded-full flex items-center gap-1.5 hover:bg-surface-bright transition-all"
          onClick={onSkip}
        >
          <svg className="w-3.5 h-3.5 text-on-surface-variant" viewBox="0 0 24 24" fill="currentColor">
            <polygon points="5,4 15,12 5,20" />
            <rect x="17" y="4" width="2" height="16" />
          </svg>
          <span className="text-xs font-medium">Skip</span>
        </button>
      )}
    </div>
  );
}
