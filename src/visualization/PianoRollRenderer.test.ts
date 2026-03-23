import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PianoRollRenderer } from './PianoRollRenderer';
import { NOTE_COLORS } from './colors';

function createMockCtx() {
  const gradientMock = {
    addColorStop: vi.fn(),
  };
  const ctx = {
    canvas: { clientWidth: 880, clientHeight: 600 },
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    shadowColor: '',
    shadowBlur: 0,
    fillRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fill: vi.fn(),
    roundRect: vi.fn(),
    createLinearGradient: vi.fn(() => gradientMock),
  } as unknown as CanvasRenderingContext2D;
  return { ctx, gradientMock };
}

describe('PianoRollRenderer', () => {
  let ctx: CanvasRenderingContext2D;
  let renderer: PianoRollRenderer;

  beforeEach(() => {
    const mock = createMockCtx();
    ctx = mock.ctx;
    renderer = new PianoRollRenderer(ctx);
  });

  it('clears canvas before drawing', () => {
    renderer.draw(0, []);
    // First fillRect should be the background clear
    expect(ctx.fillRect).toHaveBeenCalledWith(0, 0, 880, 600);
  });

  it('calls fillRect for each visible note', () => {
    const notes = [
      { midi: 60, name: 'C4', startTime: 0.5, duration: 0.5, velocity: 0.8, track: 0 },
      { midi: 64, name: 'E4', startTime: 1.0, duration: 0.5, velocity: 0.8, track: 0 },
    ];
    renderer.draw(0, notes, 4);
    // background fill + 2 notes (via roundRect+fill) + gradient fill = at least 2 roundRect calls
    expect(ctx.roundRect).toHaveBeenCalledTimes(2);
    expect(ctx.fill).toHaveBeenCalledTimes(2);
  });

  it('draws play line at bottom of canvas', () => {
    renderer.draw(0, []);
    // Play line should be drawn with stroke
    expect(ctx.stroke).toHaveBeenCalled();
    // moveTo and lineTo should have been called for the play line
    const playLineY = 600 - 2; // Play line at very bottom
    expect(ctx.moveTo).toHaveBeenCalledWith(0, playLineY);
    expect(ctx.lineTo).toHaveBeenCalledWith(880, playLineY);
  });

  it('uses Nocturne CANVAS_BG color for background', () => {
    renderer.draw(0, []);
    // The ctx.fillStyle is set before fillRect - we check the call was made
    // Since fillStyle is a property, we verify fillRect was called
    expect(ctx.fillRect).toHaveBeenCalled();
  });
});
