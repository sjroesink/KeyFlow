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
    <div className="flex items-center gap-4">
      {/* Wait Mode Toggle */}
      <div
        className={`bg-surface-variant/60 backdrop-blur-xl h-16 pl-6 pr-2 rounded-2xl flex items-center gap-6 cursor-pointer transition-all ${
          waitModeOn ? 'border border-secondary/20' : 'border border-transparent'
        }`}
        onClick={() => onToggleWaitMode(!waitModeOn)}
        role="switch"
        aria-checked={waitModeOn}
      >
        <div className="flex flex-col">
          <span className="text-[10px] uppercase tracking-widest text-secondary font-bold">
            Wait Mode
          </span>
          <span className="text-xs text-on-surface-variant">Pauses for you</span>
        </div>
        <div
          className={`w-12 h-6 rounded-full flex items-center px-1 transition-all duration-200 ${
            waitModeOn ? 'bg-secondary justify-end' : 'bg-surface-container-highest justify-start'
          }`}
        >
          <div
            className={`w-4 h-4 rounded-full transition-all duration-200 ${
              waitModeOn ? 'bg-on-secondary' : 'bg-outline'
            }`}
          />
        </div>
      </div>

      {/* Loop Button */}
      <button
        className={`bg-surface-variant/60 backdrop-blur-xl h-16 px-6 rounded-2xl flex items-center gap-3 hover:bg-surface-bright transition-all ${
          loopRegion ? 'border border-primary/30' : ''
        }`}
        onClick={() => {
          if (loopRegion) {
            usePracticeStore.getState().setLoopRegion(null);
          }
        }}
      >
        {/* Repeat icon */}
        <svg
          className={`w-5 h-5 transition-colors ${
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
        <span className="text-sm font-medium">
          {loopRegion
            ? `Loop ${formatTime(loopRegion.start)}-${formatTime(loopRegion.end)}`
            : 'Loop'}
        </span>
      </button>

      {/* Skip Button - only visible when waiting */}
      {isWaiting && (
        <button
          className="bg-surface-variant/60 backdrop-blur-xl h-16 px-6 rounded-2xl flex items-center gap-3 hover:bg-surface-bright transition-all"
          onClick={onSkip}
        >
          {/* Forward skip icon */}
          <svg
            className="w-5 h-5 text-on-surface-variant"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="5,4 15,12 5,20" />
            <rect x="17" y="4" width="2" height="16" />
          </svg>
          <span className="text-sm font-medium">Skip</span>
        </button>
      )}
    </div>
  );
}
