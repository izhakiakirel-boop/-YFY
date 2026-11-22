import { useState } from 'react';
import {
  Droplet,
  Flame,
  Heart,
  ShieldCheck,
  Sparkles,
  Thermometer,
  Utensils,
  Wand2,
  X,
} from 'lucide-react';
import { CRAFT_ITEMS, CRAFT_RECIPES } from '../game/data';
import type { CraftItemId, CraftRecipe, HudSnapshot } from '../game/types';

interface SatchelModalProps {
  hud: HudSnapshot;
  onCraft: (recipeId: string, andUse: boolean) => void;
  onConsume: (itemId: CraftItemId) => void;
  onToggleAutoSurvival: () => void;
  onClose: () => void;
}

type FilterTab = 'all' | 'food' | 'drink' | 'warmth' | 'relic';

const RAW_ORDER: CraftItemId[] = [
  'berry',
  'mushroom',
  'herb',
  'spice_root',
  'dew_flask',
  'honey_sap',
  'ember_stone',
  'frost_crystal',
  'cloth_fiber',
  'star_shard',
];

const CRAFTED_CONSUMABLE_ORDER: CraftItemId[] = [
  'trail_jam',
  'berry_skewer',
  'spiced_tea',
  'mint_cooler',
  'frost_nectar',
  'hearth_stew',
  'healing_salve',
  'star_elixir',
];

export function SatchelModal({
  hud,
  onCraft,
  onConsume,
  onToggleAutoSurvival,
  onClose,
}: SatchelModalProps) {
  const [tab, setTab] = useState<FilterTab>('all');

  const filteredRecipes = CRAFT_RECIPES.filter((r) => tab === 'all' || r.category === tab);

  const canCraft = (rec: CraftRecipe) =>
    Object.entries(rec.ingredients).every(
      ([k, amt]) => (hud.craftInv[k as CraftItemId] || 0) >= (amt || 0),
    );

  const ownedCrafted = CRAFTED_CONSUMABLE_ORDER.filter((id) => (hud.craftInv[id] || 0) > 0);

  return (
    <div
      className="fixed inset-0 z-40 bg-black/70 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="hud-surface-elevated rounded-3xl w-full max-w-4xl p-6 relative max-h-[90vh] overflow-y-auto text-right space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header + Smart Auto-Survival Switch */}
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/10 pb-4 pl-8">
          <div>
            <div className="text-xs font-semibold text-[#7ef2c9]">תיק השטח ושולחן השילובים (C)</div>
            <h2 className="font-display text-2xl font-bold text-[#edf6f2] mt-0.5">
              הכנת מזון, חליטות וציוד הישרדות
            </h2>
            <p className="text-xs text-[#9ec0bd] mt-1">
              פריטים משתלבים צומחים אוטומטית סביבך בכל עונה ובכל מחוז ספר — שלב אותם כאן או הפעל ניהול חכם אוטומטי.
            </p>
          </div>

          <button
            type="button"
            onClick={onToggleAutoSurvival}
            className={`rounded-2xl px-3.5 py-2.5 border text-xs font-bold flex items-center gap-2 transition-colors ${
              hud.autoSurvivalEnabled
                ? 'bg-[#7ef2c9]/15 border-[#7ef2c9]/60 text-[#7ef2c9]'
                : 'bg-white/5 border-white/15 text-[#9ec0bd]'
            }`}
          >
            <Wand2 className="w-4 h-4 shrink-0" />
            <div className="text-right">
              <div>הישרדות חכמה אוטומטית: {hud.autoSurvivalEnabled ? 'פעילה' : 'כבויה'}</div>
              <div className="text-[10px] font-normal opacity-80">
                {hud.autoSurvivalEnabled
                  ? 'תבשל ותצרוך אוטומטית כשהמדדים יורדים מתחת ל-30%'
                  : 'שליטה ידנית בלבד'}
              </div>
            </div>
          </button>
        </div>

        {/* Live Vitals Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#cfe8e3]">
              <Heart className="w-3.5 h-3.5 text-[#8ff2b4]" />
              בריאות
            </span>
            <span className="font-mono-num font-bold text-[#edf6f2]">{hud.health}%</span>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#cfe8e3]">
              <Utensils className="w-3.5 h-3.5 text-[#f5b971]" />
              רעב
            </span>
            <span className="font-mono-num font-bold text-[#edf6f2]">{hud.hunger}%</span>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#cfe8e3]">
              <Droplet className="w-3.5 h-3.5 text-[#63c5ff]" />
              צמא
            </span>
            <span className="font-mono-num font-bold text-[#edf6f2]">{hud.thirst}%</span>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2 flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-[#cfe8e3]">
              <Flame className="w-3.5 h-3.5 text-[#ff8a5b]" />
              חום גוף
            </span>
            <span className="font-mono-num font-bold text-[#edf6f2]">{hud.warmth}%</span>
          </div>
          <div className="rounded-2xl bg-black/25 border border-white/10 px-3 py-2 flex items-center justify-between col-span-2 sm:col-span-1">
            <span className="flex items-center gap-1.5 text-[#cfe8e3]">
              <Thermometer className="w-3.5 h-3.5 text-[#9ee8ff]" />
              סביבה
            </span>
            <span className="font-mono-num font-bold text-[#edf6f2]" dir="ltr">
              {hud.ambientTempC}°C
            </span>
          </div>
        </div>

        {/* Active Gear / Blessings */}
        {(hud.hasThermalCloak || hud.starBuffActive) && (
          <div className="flex flex-wrap gap-2 text-xs">
            {hud.hasThermalCloak && (
              <div className="rounded-xl bg-[#d9a066]/15 border border-[#d9a066]/45 px-3 py-1.5 text-[#f5d2a8] flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-[#d9a066]" />
                <span>גלימת פרווה ותהודה פעילה (-58% איבוד חום בקור)</span>
              </div>
            )}
            {hud.starBuffActive && (
              <div className="rounded-xl bg-[#ffe082]/15 border border-[#ffe082]/45 px-3 py-1.5 text-[#ffeaa3] flex items-center gap-1.5 font-semibold">
                <Sparkles className="w-4 h-4 text-[#ffe082]" />
                <span>ברכת אבק כוכבים פעילה (-58% שחיקת רעב/צמא והגנה)</span>
              </div>
            )}
          </div>
        )}

        {/* Ready-to-Consume Crafted Items (if any) */}
        {ownedCrafted.length > 0 && (
          <div className="space-y-2">
            <h3 className="text-xs font-bold text-[#cfe8e3]">מנות ושיקויים מוכנים בתיק</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {ownedCrafted.map((id) => {
                const meta = CRAFT_ITEMS[id];
                const qty = hud.craftInv[id] || 0;
                return (
                  <div
                    key={id}
                    className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#edf6f2] flex items-center gap-1.5">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: meta.color }}
                        />
                        <span className="truncate">{meta.name}</span>
                        <span className="font-mono-num text-[#7ef2c9]">×{qty}</span>
                      </div>
                      <p className="text-[11px] text-[#9ec0bd] mt-0.5 line-clamp-2">{meta.desc}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onConsume(id)}
                      className="shrink-0 px-3 py-1.5 rounded-xl bg-[#7ef2c9] hover:bg-[#95f7d5] text-[#072226] text-xs font-bold"
                    >
                      השתמש
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Raw Combinable Forage Inventory */}
        <div className="space-y-2">
          <h3 className="text-xs font-bold text-[#cfe8e3]">
            פריטים משתלבים שנאספו מהטבע (ניתן גם לצרוך ישירות)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
            {RAW_ORDER.map((id) => {
              const meta = CRAFT_ITEMS[id];
              const count = hud.craftInv[id] || 0;
              const usable = Boolean(
                meta.hungerGain || meta.thirstGain || meta.warmthGain || meta.healthGain || meta.staminaGain,
              );
              return (
                <div
                  key={id}
                  className={`rounded-2xl p-2.5 border flex flex-col justify-between gap-2 ${
                    count > 0
                      ? 'bg-white/5 border-white/15'
                      : 'bg-white/[0.02] border-white/5 opacity-60'
                  }`}
                  title={meta.desc}
                >
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: meta.color }}
                      />
                      <span className="text-[11px] font-bold text-[#edf6f2] truncate">{meta.name}</span>
                    </div>
                    <span className="font-mono-num text-xs font-bold text-[#7ef2c9] shrink-0">
                      {count}
                    </span>
                  </div>
                  {usable && count > 0 && (
                    <button
                      type="button"
                      onClick={() => onConsume(id)}
                      className="w-full py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[11px] font-semibold text-[#edf6f2]"
                    >
                      צרוך (+מהיר)
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Crafting Recipes Workbench */}
        <div className="space-y-3 border-t border-white/10 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-bold text-[#edf6f2]">מתכוני יצירה ושילובים מתקדמים</h3>
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              {(
                [
                  ['all', 'הכל'],
                  ['food', 'מזון'],
                  ['drink', 'שתייה'],
                  ['warmth', 'חום ומרפא'],
                  ['relic', 'אוצרות ורונות'],
                ] as [FilterTab, string][]
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`px-3 py-1 rounded-xl font-semibold transition-colors ${
                    tab === id
                      ? 'bg-[#7ef2c9] text-[#072226]'
                      : 'bg-white/5 hover:bg-white/10 text-[#b5d2cf]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredRecipes.map((rec) => {
              const ready = canCraft(rec);
              const isCloakOwned = rec.outputId === 'thermal_cloak' && hud.hasThermalCloak;
              const isInstant = rec.outputId === 'rune_transmute' || rec.outputId === 'thermal_cloak';

              return (
                <div
                  key={rec.id}
                  className={`rounded-2xl p-3.5 border flex flex-col justify-between gap-3 ${
                    ready && !isCloakOwned
                      ? 'bg-white/[0.06] border-[#7ef2c9]/35'
                      : 'bg-white/[0.025] border-white/10'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#edf6f2]">{rec.name}</h4>
                      {isCloakOwned && (
                        <span className="text-[10px] font-bold text-[#7ef2c9] bg-[#7ef2c9]/15 px-2 py-0.5 rounded-lg">
                          כבר נלבש
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#a5c6c3] mt-1 leading-relaxed">{rec.desc}</p>

                    <div className="flex flex-wrap gap-1.5 mt-2.5 text-[11px]">
                      {Object.entries(rec.ingredients).map(([k, req]) => {
                        const ck = k as CraftItemId;
                        const have = hud.craftInv[ck] || 0;
                        const ok = have >= (req || 0);
                        return (
                          <span
                            key={k}
                            className={`px-2 py-0.5 rounded-lg border font-mono-num ${
                              ok
                                ? 'bg-[#7ef2c9]/10 border-[#7ef2c9]/35 text-[#c7f9e8]'
                                : 'bg-rose-500/10 border-rose-500/30 text-rose-200'
                            }`}
                          >
                            {CRAFT_ITEMS[ck].name} ({have}/{req})
                          </span>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={!ready || isCloakOwned}
                      onClick={() => onCraft(rec.id, false)}
                      className="flex-1 py-2 rounded-xl bg-white/10 hover:bg-white/15 disabled:opacity-40 text-xs font-bold text-[#edf6f2] transition-colors"
                    >
                      {isCloakOwned ? 'פעיל' : isInstant ? 'הפעל מתכון' : 'הכן ושמור בתיק'}
                    </button>
                    {!isInstant && (
                      <button
                        type="button"
                        disabled={!ready}
                        onClick={() => onCraft(rec.id, true)}
                        className="flex-1 py-2 rounded-xl bg-[#7ef2c9] hover:bg-[#95f7d5] disabled:opacity-40 text-xs font-bold text-[#072226] transition-colors"
                      >
                        הכן והשתמש מיד
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
