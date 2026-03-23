interface PianoRollProps {
  canvasRef: (el: HTMLCanvasElement | null) => void;
}

export function PianoRoll({ canvasRef }: PianoRollProps) {
  return (
    <div className="w-full max-w-5xl aspect-[16/7] bg-surface-container-low rounded-xl relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="w-full h-full"
      />
      {/* Bottom gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-surface/40 pointer-events-none" />
    </div>
  );
}
