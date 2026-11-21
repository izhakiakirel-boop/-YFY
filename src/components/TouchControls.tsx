import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, ArrowUpCircle, Pickaxe, Radio } from 'lucide-react';

interface TouchControlsProps {
  onMoveVector: (x: number, z: number) => void;
  onJump: () => void;
  onGather: () => void;
  onPulse: () => void;
}

export function TouchControls({ onMoveVector, onJump, onGather, onPulse }: TouchControlsProps) {
  const hold = (x: number, z: number) => ({
    onPointerDown: (e: React.PointerEvent) => {
      e.preventDefault();
      onMoveVector(x, z);
    },
    onPointerUp: () => onMoveVector(0, 0),
    onPointerCancel: () => onMoveVector(0, 0),
    onPointerLeave: () => onMoveVector(0, 0),
  });

  return (
    <div className="sm:hidden pointer-events-none fixed bottom-44 inset-x-3 z-20 flex items-end justify-between">
      <div className="pointer-events-auto grid grid-cols-3 gap-1 w-28">
        <div />
        <button {...hold(0, -1)} className="hud-surface h-9 rounded-lg grid place-items-center" aria-label="קדימה">
          <ArrowUp className="w-4 h-4" />
        </button>
        <div />
        <button {...hold(-1, 0)} className="hud-surface h-9 rounded-lg grid place-items-center" aria-label="שמאלה">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button {...hold(0, 1)} className="hud-surface h-9 rounded-lg grid place-items-center" aria-label="אחורה">
          <ArrowDown className="w-4 h-4" />
        </button>
        <button {...hold(1, 0)} className="hud-surface h-9 rounded-lg grid place-items-center" aria-label="ימינה">
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>

      <div className="pointer-events-auto flex items-center gap-2">
        <button
          onClick={onJump}
          className="hud-surface w-11 h-11 rounded-xl grid place-items-center text-[#7ef2c9]"
          aria-label="קפיצה"
        >
          <ArrowUpCircle className="w-5 h-5" />
        </button>
        <button
          onClick={onGather}
          className="hud-surface w-11 h-11 rounded-xl grid place-items-center text-[#f5b971]"
          aria-label="איסוף"
        >
          <Pickaxe className="w-5 h-5" />
        </button>
        <button
          onClick={onPulse}
          className="hud-surface w-11 h-11 rounded-xl grid place-items-center text-[#c9a6ff]"
          aria-label="תהודה"
        >
          <Radio className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}
