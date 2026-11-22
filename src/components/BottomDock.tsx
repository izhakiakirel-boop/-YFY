import {
  Backpack,
  ChevronDown,
  ChevronUp,
  Droplets,
  Flame,
  Hammer,
  Hexagon,
  MessageSquare,
  Pickaxe,
  Radio,
  RotateCw,
  Sprout,
  Trees,
} from 'lucide-react';
import { BLUEPRINTS, CRAFT_RECIPES, RESOURCES } from '../game/data';
import type { BlueprintId, CraftItemId, HudSnapshot, ResourceType } from '../game/types';

interface BottomDockProps {
  hud: HudSnapshot;
  collapsed: boolean;
  activeBlueprint: BlueprintId | null;
  onToggleCollapse: () => void;
  onSelectBlueprint: (id: BlueprintId | null) => void;
  onInteract: () => void;
  onGather: () => void;
  onPulse: () => void;
  onOpenSatchel: () => void;
}

const RES_ICONS: Record<ResourceType, typeof Trees> = {
  wood: Trees,
  glow: Flame,
  water: Droplets,
  rune: Hexagon,
  seed: Sprout,
};

export function BottomDock({
  hud,
  collapsed,
  activeBlueprint,
  onToggleCollapse,
  onSelectBlueprint,
  onInteract,
  onGather,
  onPulse,
  onOpenSatchel,
}: BottomDockProps) {
  const canAfford = (cost: Partial<Record<ResourceType, number>>) =>
    Object.entries(cost).every(([k, v]) => (hud.inv[k as ResourceType] || 0) >= (v || 0));

  const craftableCount = CRAFT_RECIPES.filter((r) =>
    Object.entries(r.ingredients).every(
      ([k, qty]) => (hud.craftInv?.[k as CraftItemId] || 0) >= (qty || 0),
    ),
  ).length;

  return (
    <div className="pointer-events-none fixed bottom-3 inset-x-0 z-20 flex flex-col items-center px-3">
      {/* Contextual Nearby Action Prompt */}
      {hud.nearby && !activeBlueprint && (
        <button
          onClick={onInteract}
          className="pointer-events-auto mb-2 hud-surface-elevated border-[#7ef2c9]/50 rounded-2xl px-4 py-2 flex items-center gap-3 transition-transform hover:scale-[1.02]"
        >
          <span className="font-mono-num text-xs font-bold bg-[#7ef2c9] text-[#072226] rounded-lg px-2 py-0.5">
            {hud.nearby.keyHint}
          </span>
          <div className="text-right">
            <div className="text-xs font-bold text-[#edf6f2]">{hud.nearby.title}</div>
            <div className="text-[11px] text-[#a5c6c3]">{hud.nearby.subtitle}</div>
          </div>
        </button>
      )}

      {/* Active Build Banner */}
      {activeBlueprint && (
        <div className="pointer-events-auto mb-2 hud-surface-elevated border-[#f5b971]/60 rounded-2xl px-4 py-2 flex items-center gap-3 text-xs">
          <Hammer className="w-4 h-4 text-[#f5b971]" />
          <span>
            <strong>{BLUEPRINTS.find((b) => b.id === activeBlueprint)?.name}</strong> — לחץ על הקרקע להצבה ·{' '}
            <span className="font-mono-num text-[#7ef2c9]">R</span> לסיבוב ·{' '}
            <span className="font-mono-num text-[#f5b971]">Esc</span> לביטול
          </span>
          <button
            onClick={() => onSelectBlueprint(null)}
            className="text-rose-300 hover:text-rose-200 font-semibold px-2 py-0.5 rounded-lg bg-white/5"
          >
            ביטול
          </button>
        </div>
      )}

      {/* Collapse / Expand Toggle Handle */}
      <button
        onClick={onToggleCollapse}
        className="pointer-events-auto hud-surface rounded-t-xl px-4 py-1 text-[11px] font-semibold text-[#a5c6c3] hover:text-[#edf6f2] flex items-center gap-1.5 border-b-0"
        title="מצב צפייה נקי (H)"
      >
        {collapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        <span>{collapsed ? 'פתיחת שולחן יצירה (H)' : 'הסתרת ממשק (H)'}</span>
      </button>

      {/* Main Dock */}
      {!collapsed && (
        <div className="pointer-events-auto hud-surface rounded-2xl p-2.5 w-full max-w-[980px] flex flex-col gap-2">
          {/* Top Row: Resources + World Actions */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
              {(Object.keys(RESOURCES) as ResourceType[]).map((key) => {
                const Icon = RES_ICONS[key];
                const meta = RESOURCES[key];
                return (
                  <div
                    key={key}
                    className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-lg bg-white/5"
                    title={`${meta.name}: ${meta.shortDesc}`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: meta.color }} />
                    <span className="text-[#c5dfdc] hidden sm:inline">{meta.name}</span>
                    <span className="font-mono-num font-bold text-[#edf6f2]">
                      {hud.inv[key] || 0}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                onClick={onOpenSatchel}
                className="px-2.5 py-1.5 rounded-xl bg-[#f5b971]/15 hover:bg-[#f5b971]/25 text-[#ffe1b5] border border-[#f5b971]/35 text-xs font-bold flex items-center gap-1.5 whitespace-nowrap"
                title="תיק פריטים משתלבים, מתכונים וניהול הישרדות (C)"
              >
                <Backpack className="w-3.5 h-3.5 text-[#f5b971]" />
                <span>תיק ושילובים C</span>
                {craftableCount > 0 && (
                  <span className="font-mono-num text-[10px] bg-[#7ef2c9] text-[#072226] rounded-md px-1.5 py-0.2 font-extrabold">
                    {craftableCount}
                  </span>
                )}
              </button>
              <button
                onClick={onInteract}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                title="לדבר / אינטראקציה (E)"
              >
                <MessageSquare className="w-3.5 h-3.5 text-[#7ef2c9]" />
                <span>אינטראקציה E</span>
              </button>
              <button
                onClick={onGather}
                className="px-2.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                title="איסוף חומרים ופריטים משתלבים (F)"
              >
                <Pickaxe className="w-3.5 h-3.5 text-[#f5b971]" />
                <span>איסוף F</span>
              </button>
              <button
                onClick={onPulse}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap ${
                  hud.pulseCooldown > 0
                    ? 'bg-white/5 text-white/45 cursor-wait'
                    : 'bg-[#c9a6ff]/15 hover:bg-[#c9a6ff]/25 text-[#d8c0ff] border border-[#c9a6ff]/30'
                }`}
                title="פעימת תהודה לגילוי סודות ומרבצים (Q)"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>{hud.pulseCooldown > 0 ? 'טוען...' : 'תהודה Q'}</span>
              </button>
            </div>
          </div>

          {/* Bottom Row: 6 Tiered Blueprints */}
          <div className="grid grid-cols-3 md:grid-cols-6 gap-1.5">
            {BLUEPRINTS.map((bp) => {
              const t1 = bp.tiers[0];
              const affordable = canAfford(t1.cost);
              const selected = activeBlueprint === bp.id;
              return (
                <button
                  key={bp.id}
                  onClick={() => onSelectBlueprint(selected ? null : bp.id)}
                  className={`text-right rounded-xl p-2 border transition-colors flex flex-col justify-between gap-1 ${
                    selected
                      ? 'bg-[#7ef2c9]/15 border-[#7ef2c9] text-[#edf6f2]'
                      : affordable
                        ? 'bg-white/5 hover:bg-white/10 border-white/10 text-[#edf6f2]'
                        : 'bg-white/[0.02] border-white/5 text-white/45'
                  }`}
                  title={bp.shortRole}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs font-bold truncate" style={{ color: selected ? '#7ef2c9' : bp.accentColor }}>
                      {bp.name}
                    </span>
                    {selected && <RotateCw className="w-3 h-3 text-[#7ef2c9] shrink-0" />}
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] font-mono-num">
                    {Object.entries(t1.cost).map(([rk, amt]) => {
                      const resKey = rk as ResourceType;
                      const Icon = RES_ICONS[resKey];
                      const has = (hud.inv[resKey] || 0) >= (amt || 0);
                      return (
                        <span
                          key={rk}
                          className={`inline-flex items-center gap-0.5 ${has ? 'text-[#c9e3df]' : 'text-rose-300/80'}`}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {amt}
                        </span>
                      );
                    })}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
