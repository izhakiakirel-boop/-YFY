import { useState } from 'react';
import { Dices, Globe, Sparkles, X } from 'lucide-react';
import { BIOME_PRESETS } from '../game/data';
import { hashStringSeed } from '../game/terrain';
import type { BiomePresetId, WorldSeedConfig } from '../game/types';

interface NewWorldModalProps {
  currentSeedLabel: string;
  currentBiome: BiomePresetId;
  onCreateWorld: (config: WorldSeedConfig) => void;
  onClose: () => void;
}

const PRESET_LIST: BiomePresetId[] = ['verdant', 'arid_winds', 'mystic_night', 'archipelago'];

export function NewWorldModal({
  currentSeedLabel,
  currentBiome,
  onCreateWorld,
  onClose,
}: NewWorldModalProps) {
  const [seedInput, setSeedInput] = useState(() =>
    String(Math.floor(100000 + Math.random() * 899999)),
  );
  const [biome, setBiome] = useState<BiomePresetId>(currentBiome);
  const [keepAchievements, setKeepAchievements] = useState(true);

  const rollSeed = () => {
    setSeedInput(String(Math.floor(100000 + Math.random() * 899999)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const label = seedInput.trim() || String(Math.floor(100000 + Math.random() * 899999));
    const seed = hashStringSeed(label);
    onCreateWorld({
      seed,
      seedLabel: label,
      biome,
      keepAchievements,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="hud-surface-elevated rounded-3xl w-full max-w-xl p-6 relative text-right max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold text-[#7ef2c9] mb-1">
          <Globe className="w-4 h-4" />
          <span>מחולל עולם פרוצדורלי בזמן אמת</span>
        </div>
        <h2 className="font-display text-xl font-bold text-[#edf6f2]">
          יצירת עולם אינסופי חדש
        </h2>
        <p className="text-xs text-[#b5d2cf] mt-1 leading-relaxed">
          עולם נוכחי: <span className="font-mono-num text-[#edf6f2]">{currentSeedLabel}</span>. בחר קוד זרע וביום אקלים ליצירת טופוגרפיה, יערות, מונוליתים ונבגי קמילה חדשים לחלוטין.
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          {/* Seed Input */}
          <div>
            <label className="block text-xs font-semibold text-[#edf6f2] mb-1.5">
              זרע עולם (מספר או מילה)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={seedInput}
                onChange={(e) => setSeedInput(e.target.value)}
                placeholder="הזן זרע או לחץ להגרלה..."
                className="flex-1 bg-[#08161a]/90 border border-white/15 focus:border-[#7ef2c9] rounded-xl px-3.5 py-2.5 text-sm font-mono-num text-[#edf6f2] outline-none"
              />
              <button
                type="button"
                onClick={rollSeed}
                className="px-3.5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#7ef2c9] text-xs font-bold flex items-center gap-1.5 whitespace-nowrap transition-colors"
                title="הגרל זרע אקראי"
              >
                <Dices className="w-4 h-4" />
                <span>הגרל</span>
              </button>
            </div>
          </div>

          {/* Biome Presets */}
          <div>
            <div className="text-xs font-semibold text-[#edf6f2] mb-2">בחר אקלים ותבנית שטח</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {PRESET_LIST.map((pid) => {
                const p = BIOME_PRESETS[pid];
                const selected = biome === pid;
                return (
                  <button
                    key={pid}
                    type="button"
                    onClick={() => setBiome(pid)}
                    className={`text-right rounded-2xl p-3 border transition-colors ${
                      selected
                        ? 'bg-[#12333b] border-[#7ef2c9]'
                        : 'bg-white/5 border-white/10 hover:border-white/25'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-display text-xs font-bold text-[#edf6f2]">
                        {p.name}
                      </span>
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: p.accentColor }}
                      />
                    </div>
                    <p className="text-[11px] text-[#b5d2cf] leading-relaxed">{p.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Keep Achievements Checkbox */}
          <label className="flex items-center gap-2.5 text-xs text-[#cfe8e3] cursor-pointer select-none pt-1">
            <input
              type="checkbox"
              checked={keepAchievements}
              onChange={(e) => setKeepAchievements(e.target.checked)}
              className="w-4 h-4 accent-[#7ef2c9] rounded"
            />
            <span>שמור על ההישגים שפתחתי במעבר לעולם החדש</span>
          </label>

          {/* Actions */}
          <div className="flex items-center gap-2.5 pt-2">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-[#7ef2c9] hover:bg-[#95f7d5] text-[#072226] text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
            >
              <Sparkles className="w-4 h-4" />
              <span>צור וצא למסע בעמק החדש</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#edf6f2] text-xs font-semibold"
            >
              ביטול
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
