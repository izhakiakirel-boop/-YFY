import { RotateCcw, ShieldAlert, Sparkles } from 'lucide-react';
import type { GameOverState } from '../game/types';

interface GameOverModalProps {
  gameOver: GameOverState;
  onRetryWorld: () => void;
  onResetWorld: () => void;
}

const REASON_LABELS: Record<GameOverState['reason'], string> = {
  health: 'תשישות רוחנית',
  collapse: 'קריסת המערכת האקולוגית',
  starvation: 'רעב וצמא קיצוניים',
  hypothermia: 'קיפאון חורפי עמוק',
};

export function GameOverModal({
  gameOver,
  onRetryWorld,
  onResetWorld,
}: GameOverModalProps) {
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
      <div className="hud-surface-elevated border-rose-500/45 rounded-3xl w-full max-w-md p-6 text-right space-y-4">
        <div className="flex items-center gap-2 text-xs font-bold text-rose-400">
          <ShieldAlert className="w-4 h-4" />
          <span>{REASON_LABELS[gameOver.reason]}</span>
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-[#edf6f2]">{gameOver.title}</h2>
          <p className="text-xs text-[#cfe8e3] mt-1.5 leading-relaxed">{gameOver.message}</p>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center bg-black/30 rounded-2xl p-3 border border-white/10">
          <div>
            <div className="text-[11px] text-[#9ec0bd]">ימים בעמק</div>
            <div className="font-mono-num text-base font-bold text-[#edf6f2] mt-0.5">
              {gameOver.daysSurvived}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#9ec0bd]">נבגים טוהרו</div>
            <div className="font-mono-num text-base font-bold text-[#7ef2c9] mt-0.5">
              {gameOver.blightPurified}
            </div>
          </div>
          <div>
            <div className="text-[11px] text-[#9ec0bd]">חיוניות</div>
            <div className="font-mono-num text-base font-bold text-[#f5b971] mt-0.5">
              {gameOver.vitality}%
            </div>
          </div>
        </div>

        <div className="text-[11px] text-[#9ec0bd] flex items-center justify-between px-1">
          <span>אקלים: {gameOver.biomeLabel}</span>
          <span className="font-mono-num">זרע: {gameOver.seedLabel}</span>
        </div>

        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={onRetryWorld}
            className="w-full py-2.5 rounded-xl bg-[#7ef2c9] hover:bg-[#95f7d5] text-[#072226] text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            <span>חזור לכיכר הלב והמשך להציל את העמק</span>
          </button>

          <button
            type="button"
            onClick={onResetWorld}
            className="w-full py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#edf6f2] text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#c9a6ff]" />
            <span>התחל מסע חדש באקראי</span>
          </button>
        </div>
      </div>
    </div>
  );
}
