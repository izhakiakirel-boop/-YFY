import { useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  Compass,
  Download,
  Droplet,
  Flame,
  Heart,
  HelpCircle,
  Moon,
  Music,
  RotateCcw,
  ShieldAlert,
  SlidersHorizontal,
  Sparkles,
  Sun,
  Trees,
  Utensils,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import type { AudioMixSettings, HudSnapshot } from '../game/types';

interface TopHudProps {
  hud: HudSnapshot;
  audioOn: boolean;
  audioMix: AudioMixSettings;
  downloadingHtml?: boolean;
  onToggleAudio: () => void;
  onChangeMusicVolume: (vol: number) => void;
  onChangeAmbienceVolume: (vol: number) => void;
  onAdvanceTime: () => void;
  onDownloadHtml: () => void;
  onOpenJournal: () => void;
  onOpenHelp: () => void;
  onReset: () => void;
}

export function TopHud({
  hud,
  audioOn,
  audioMix,
  downloadingHtml = false,
  onToggleAudio,
  onChangeMusicVolume,
  onChangeAmbienceVolume,
  onAdvanceTime,
  onDownloadHtml,
  onOpenJournal,
  onOpenHelp,
  onReset,
}: TopHudProps) {
  const [mixerOpen, setMixerOpen] = useState(false);
  const mixerWrapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!mixerOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (mixerWrapRef.current && !mixerWrapRef.current.contains(e.target as Node)) {
        setMixerOpen(false);
      }
    };
    window.addEventListener('pointerdown', onPointerDown);
    return () => window.removeEventListener('pointerdown', onPointerDown);
  }, [mixerOpen]);

  const musicPct = Math.round(audioMix.musicVolume * 100);
  const ambiencePct = Math.round(audioMix.ambienceVolume * 100);
  const hpColor =
    hud.health <= 30 ? 'text-rose-400' : hud.health <= 60 ? 'text-[#f5b971]' : 'text-[#8ff2b4]';
  const hungerColor =
    hud.hunger <= 25 ? 'text-rose-400' : hud.hunger <= 55 ? 'text-[#f5b971]' : 'text-[#d9a066]';
  const thirstColor =
    hud.thirst <= 25 ? 'text-rose-400' : hud.thirst <= 55 ? 'text-[#f5b971]' : 'text-[#63c5ff]';
  const warmthColor =
    hud.warmth <= 25 ? 'text-sky-300' : hud.warmth <= 55 ? 'text-[#f5b971]' : 'text-[#ff9c6b]';

  return (
    <header className="pointer-events-none fixed top-0 inset-x-0 z-20 flex flex-col gap-2 p-2.5 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 w-full">
        {/* Right side (RTL start): Zone, Season & Survival Telemetry */}
        <div className="pointer-events-auto hud-surface rounded-2xl px-3.5 py-2 flex flex-wrap items-center gap-2.5 max-w-full min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <Compass className="w-4 h-4 md:w-5 md:h-5 text-[#7ef2c9] shrink-0" />
            <div className="min-w-0">
              <h1 className="font-display text-xs sm:text-sm md:text-base font-bold text-[#edf6f2] truncate">
                {hud.zoneId === 'frontier' ? hud.subBiomeName : hud.zoneName}
              </h1>
              <p className="text-[11px] text-[#9ec0bd] truncate hidden xl:block">
                {hud.zoneId === 'frontier'
                  ? `מרחק ${hud.distanceFromOrigin}מ' · ${hud.subBiomeDesc}`
                  : hud.zoneSubtitle}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onAdvanceTime}
            className="hidden sm:flex items-center gap-1.5 text-xs text-[#cfe8e3] hover:text-[#7ef2c9] border-r border-white/10 pr-2.5 whitespace-nowrap transition-colors shrink-0"
            title="קדם את השעה בעמק (+3 שעות) לצפייה בזריחה, שקיעה, לילה ועונות"
          >
            {hud.isNight ? (
              <Moon className="w-3.5 h-3.5 text-[#9bc5ff]" />
            ) : (
              <Sun className="w-3.5 h-3.5 text-[#f5b971]" />
            )}
            <span className="font-bold" style={{ color: hud.seasonColor }}>
              {hud.seasonName}
            </span>
            <span className="font-mono-num text-[11px] text-[#9ec0bd]">
              ({hud.dayInSeason}/{hud.seasonLengthDays})
            </span>
            <span aria-hidden="true">·</span>
            <span className="font-mono-num">{hud.clockLabel}</span>
            <span
              className={`font-mono-num text-[11px] ${hud.ambientTempC <= 2 ? 'text-sky-300' : hud.ambientTempC >= 28 ? 'text-[#f5b971]' : 'text-[#cfe8e3]'}`}
              dir="ltr"
              title="טמפרטורת סביבה"
            >
              {hud.ambientTempC}°C
            </span>
          </button>

          {/* Compact Survival Vitals: HP, Hunger, Thirst, Warmth, Valley Vitality */}
          <div className="flex items-center gap-2 border-r border-white/10 pr-2.5 text-xs whitespace-nowrap shrink-0">
            <div className="flex items-center gap-1" title="בריאות (משתקמת בשובע, חום ובספסלי מפגש)">
              <Heart className={`w-3.5 h-3.5 ${hpColor}`} />
              <span className={`font-mono-num font-bold ${hpColor}`}>{hud.health}</span>
            </div>
            <div className="flex items-center gap-1" title="רעב — אסוף פירות/פטריות (F) או הכן ארוחות (C)">
              <Utensils className={`w-3.5 h-3.5 ${hungerColor}`} />
              <span className={`font-mono-num font-bold ${hungerColor}`}>{hud.hunger}</span>
            </div>
            <div className="flex items-center gap-1" title="צמא — שתה מהנחל או הכן חליטות (C)">
              <Droplet className={`w-3.5 h-3.5 ${thirstColor}`} />
              <span className={`font-mono-num font-bold ${thirstColor}`}>{hud.thirst}</span>
            </div>
            <div className="flex items-center gap-1" title="חום גוף — קריטי בחורף הקיפאון! חפש מדורה, מעיין חם או גלימה">
              <Flame className={`w-3.5 h-3.5 ${warmthColor}`} />
              <span className={`font-mono-num font-bold ${warmthColor}`}>{hud.warmth}</span>
            </div>
            <span className="text-white/25 hidden md:inline" aria-hidden="true">|</span>
            <div className="hidden md:flex items-center gap-1" title="חיוניות העמק">
              <Sparkles className="w-3.5 h-3.5 text-[#7ef2c9]" />
              <span className="font-mono-num font-bold text-[#7ef2c9]">{hud.vitality}%</span>
            </div>
            {hud.activeBlightCount > 0 && (
              <div
                className="hidden lg:flex items-center gap-1 text-rose-300 font-mono-num"
                title="נבגי קמילה פעילים ורוחות צל"
              >
                <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                <span>{hud.activeBlightCount}</span>
              </div>
            )}
          </div>
        </div>

        {/* Left side (RTL end): Compact Action Controls (NO New World button) */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-1.5 md:gap-2">
          <button
            onClick={onOpenJournal}
            className="hud-surface hover:border-[#7ef2c9]/50 rounded-xl px-3 py-2 text-xs font-semibold text-[#edf6f2] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-4 h-4 text-[#7ef2c9]" />
            <span className="hidden sm:inline">יומן והישגים</span>
          </button>

          <button
            onClick={onDownloadHtml}
            disabled={downloadingHtml}
            className="hud-surface border-[#7ef2c9]/45 hover:border-[#7ef2c9] bg-[#0e2a30] hover:bg-[#143942] rounded-xl px-3 py-2 text-xs font-bold text-[#7ef2c9] flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-60"
            aria-label="ייצוא כקובץ HTML"
            title="הורד את כל המשחק התלת־ממדי כקובץ HTML יחיד להרצה במחשב"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className="hidden md:inline">{downloadingHtml ? 'מייצא...' : 'ייצוא HTML'}</span>
          </button>

          <button
            onClick={onOpenHelp}
            className="hud-surface hover:border-[#7ef2c9]/50 rounded-xl px-2.5 py-2 text-xs font-semibold text-[#edf6f2] flex items-center gap-1.5 transition-colors whitespace-nowrap"
            aria-label="מדריך משחק"
            title="מדריך ומקשים"
          >
            <HelpCircle className="w-4 h-4 text-[#f5b971]" />
            <span className="hidden lg:inline">מדריך</span>
          </button>

          {/* Audio Toggle + Separate Music / Nature Ambience Mixer */}
          <div ref={mixerWrapRef} className="relative flex items-center gap-1">
            <button
              onClick={onToggleAudio}
              className={`hud-surface rounded-xl px-2.5 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                audioOn ? 'border-[#7ef2c9]/60 text-[#7ef2c9]' : 'text-[#b5d2cf]'
              }`}
              aria-label={audioOn ? 'כיבוי שמע' : 'הפעלת שמע'}
              title="הפעל / השתק שמע"
            >
              {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
              <span className="hidden xl:inline">{audioOn ? 'שמע פעיל' : 'שמע'}</span>
            </button>

            <button
              type="button"
              onClick={() => setMixerOpen((p) => !p)}
              className={`hud-surface rounded-xl p-2 text-xs transition-colors ${
                mixerOpen ? 'border-[#7ef2c9]/70 text-[#7ef2c9]' : 'text-[#b5d2cf] hover:text-white'
              }`}
              aria-label="מיקס ערוצי שמע"
              aria-expanded={mixerOpen}
              title="שליטה נפרדת במוזיקה ובקולות הסביבה"
            >
              <SlidersHorizontal className="w-4 h-4" />
            </button>

            {mixerOpen && (
              <div className="hud-surface-elevated absolute top-full left-0 mt-2 w-72 rounded-2xl p-4 space-y-3.5 text-right z-30">
                <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                  <h3 className="font-display text-xs font-bold text-[#edf6f2]">
                    איזון ערוצי שמע
                  </h3>
                  <button
                    type="button"
                    onClick={() => setMixerOpen(false)}
                    className="text-[#9ec0bd] hover:text-white p-1 rounded-lg bg-white/5"
                    aria-label="סגור מיקס"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Music Channel */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onChangeMusicVolume(musicPct > 0 ? 0 : 0.75)}
                      className="flex items-center gap-1.5 text-[#edf6f2] hover:text-[#7ef2c9] transition-colors"
                      title={musicPct > 0 ? 'השתק מוזיקה' : 'החזר מוזיקה'}
                    >
                      <Music className="w-3.5 h-3.5 text-[#c9a6ff]" />
                      <span className="font-semibold">מוזיקת עמק</span>
                    </button>
                    <span className="font-mono-num text-[11px] text-[#9ec0bd]">{musicPct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={musicPct}
                    aria-label="עוצמת מוזיקת עמק"
                    onChange={(e) => onChangeMusicVolume(Number(e.target.value) / 100)}
                    className="w-full accent-[#c9a6ff] cursor-pointer h-1.5"
                  />
                </div>

                {/* Spatial Nature Ambience Channel */}
                <div className="space-y-1.5 border-t border-white/10 pt-3">
                  <div className="flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => onChangeAmbienceVolume(ambiencePct > 0 ? 0 : 0.85)}
                      className="flex items-center gap-1.5 text-[#edf6f2] hover:text-[#7ef2c9] transition-colors"
                      title={ambiencePct > 0 ? 'השתק קולות טבע' : 'החזר קולות טבע'}
                    >
                      <Trees className="w-3.5 h-3.5 text-[#7ef2c9]" />
                      <span className="font-semibold">קולות טבע ומרחב</span>
                    </button>
                    <span className="font-mono-num text-[11px] text-[#9ec0bd]">{ambiencePct}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={ambiencePct}
                    aria-label="עוצמת קולות טבע ומרחב"
                    onChange={(e) => onChangeAmbienceVolume(Number(e.target.value) / 100)}
                    className="w-full accent-[#7ef2c9] cursor-pointer h-1.5"
                  />
                </div>

                <p className="text-[11px] text-[#9ec0bd] leading-relaxed border-t border-white/10 pt-2.5">
                  {audioOn
                    ? 'זרימת נהר, מפל, משבי רוח, ציפורים ביום וצרצרים בלילה משתנים בסטריאו 3D לפי מיקומך.'
                    : 'השמע מושתק כרגע — לחץ על כפתור השמע כדי להפעיל.'}
                </p>
              </div>
            )}
          </div>

          <button
            onClick={onReset}
            className="hud-surface hover:border-rose-400/50 rounded-xl p-2 text-[#b5d2cf] hover:text-rose-200 transition-colors"
            aria-label="איפוס עמק"
            title="איפוס העמק הנוכחי"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Active Climate Event Indicator */}
      {hud.climateEvent !== 'none' && hud.climateEventLabel && (
        <div className="pointer-events-auto self-center hud-surface border-[#ffe082]/45 bg-[#0c2026]/90 text-[#ffeaa3] rounded-2xl px-4 py-1 text-xs font-bold flex items-center gap-2">
          <Sparkles className="w-3.5 h-3.5 text-[#ffe082] shrink-0" />
          <span>תופעת טבע פעילה: {hud.climateEventLabel}</span>
        </div>
      )}

      {/* Urgent Threat / Collapse Banner */}
      {hud.collapseCountdown !== null && (
        <div className="pointer-events-auto self-center hud-surface border-rose-500/70 bg-rose-950/90 text-rose-100 rounded-2xl px-4 py-1.5 text-xs font-bold flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0" />
          <span>
            אזהרת קריסה! חיוניות העמק ירדה ל-0% — טהר נבגי קמילה עם <span className="font-mono-num">Q</span> תוך{' '}
            <span className="font-mono-num text-rose-300">{hud.collapseCountdown}</span> שניות!
          </span>
        </div>
      )}
    </header>
  );
}
