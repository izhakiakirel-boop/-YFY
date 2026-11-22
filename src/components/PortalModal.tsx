import { Compass, Sparkles, X } from 'lucide-react';
import { SUB_BIOMES } from '../game/data';
import type { PortalDestination } from '../game/types';

interface PortalModalProps {
  portals: PortalDestination[];
  playerPos: { x: number; z: number };
  onTeleport: (dest: PortalDestination) => void;
  onClose: () => void;
}

export function PortalModal({ portals, playerPos, onTeleport, onClose }: PortalModalProps) {
  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="hud-surface-elevated border-[#88e9ff]/45 rounded-3xl w-full max-w-lg p-6 relative text-right space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>

        <div>
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#88e9ff]">
            <Sparkles className="w-4 h-4" />
            <span>רשת השערים העתיקה</span>
          </div>
          <h2 className="font-display text-xl font-bold text-[#edf6f2] mt-1">
            מעבר מהיר בין מחוזות העולם
          </h2>
          <p className="text-xs text-[#9ec0bd] mt-1">
            בחר יעד מואר כדי לשגר את עצמך ישירות בין כיכר הלב לנקודות הספר הרחוקות שגילית.
          </p>
        </div>

        <div className="space-y-2 max-h-[55vh] overflow-y-auto">
          {portals.map((dest) => {
            const dist = Math.round(Math.hypot(dest.x - playerPos.x, dest.z - playerPos.z));
            const sub = SUB_BIOMES[dest.subBiome];
            return (
              <div
                key={dest.id}
                className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-bold text-[#edf6f2] flex items-center gap-1.5">
                    <Compass className="w-4 h-4 text-[#88e9ff] shrink-0" />
                    <span className="truncate">{dest.name}</span>
                  </div>
                  <div className="text-[11px] text-[#9ec0bd] mt-0.5 flex items-center gap-2">
                    <span style={{ color: sub.color }}>{sub.name}</span>
                    <span>·</span>
                    <span className="font-mono-num">מרחק {dist}מ'</span>
                  </div>
                </div>
                <button
                  type="button"
                  disabled={dist < 8}
                  onClick={() => {
                    onTeleport(dest);
                    onClose();
                  }}
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-[#88e9ff] hover:bg-[#aef1ff] disabled:opacity-40 text-[#072226] text-xs font-bold transition-colors"
                >
                  {dist < 8 ? 'כאן עכשיו' : 'שגר לשער'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
