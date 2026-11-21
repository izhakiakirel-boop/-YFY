import { BookOpen, Compass, Download, HelpCircle, Moon, RotateCcw, Sparkles, Sun, Volume2, VolumeX } from 'lucide-react';
import type { HudSnapshot } from '../game/types';

interface TopHudProps {
  hud: HudSnapshot;
  audioOn: boolean;
  downloadingHtml?: boolean;
  onToggleAudio: () => void;
  onAdvanceTime: () => void;
  onDownloadHtml: () => void;
  onOpenJournal: () => void;
  onOpenHelp: () => void;
  onReset: () => void;
}

export function TopHud({
  hud,
  audioOn,
  downloadingHtml = false,
  onToggleAudio,
  onAdvanceTime,
  onDownloadHtml,
  onOpenJournal,
  onOpenHelp,
  onReset,
}: TopHudProps) {
  return (
    <header className="pointer-events-none fixed top-0 inset-x-0 z-20 flex items-start justify-between gap-3 p-3 md:p-4">
      {/* Right side (RTL start): Zone & World Telemetry */}
      <div className="pointer-events-auto hud-surface rounded-2xl px-4 py-2.5 flex items-center gap-3.5 max-w-[64vw] md:max-w-2xl">
        <div className="flex items-center gap-2.5 min-w-0">
          <Compass className="w-5 h-5 text-[#7ef2c9] shrink-0" />
          <div className="min-w-0">
            <h1 className="font-display text-sm md:text-base font-bold text-[#edf6f2] truncate">
              {hud.zoneName}
            </h1>
            <p className="text-[11px] text-[#9ec0bd] truncate hidden sm:block">
              {hud.zoneSubtitle}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onAdvanceTime}
          className="hidden md:flex items-center gap-2 text-xs text-[#cfe8e3] hover:text-[#7ef2c9] border-r border-white/10 pr-3.5 whitespace-nowrap transition-colors"
          title="קדם את השעה בעמק (+3 שעות) לצפייה בזריחה, שקיעה ולילה"
        >
          {hud.isNight ? (
            <Moon className="w-3.5 h-3.5 text-[#9bc5ff]" />
          ) : (
            <Sun className="w-3.5 h-3.5 text-[#f5b971]" />
          )}
          <span className="font-mono-num">יום {hud.day}</span>
          <span aria-hidden="true">·</span>
          <span className="font-mono-num">{hud.clockLabel}</span>
          <span>({hud.timeOfDayLabel})</span>
          <span className="hidden xl:inline text-[#9ec0bd]">· {hud.weatherLabel}</span>
        </button>

        <div className="flex items-center gap-3 border-r border-white/10 pr-3 text-xs whitespace-nowrap shrink-0">
          <div className="flex items-center gap-1.5" title="חיוניות העמק">
            <Sparkles className="w-3.5 h-3.5 text-[#7ef2c9]" />
            <span className="font-mono-num font-bold text-[#7ef2c9]">{hud.vitality}%</span>
          </div>
          <span className="text-white/25" aria-hidden="true">/</span>
          <div className="text-[#d4b8ff] font-mono-num" title="סודות שנחשפו">
            {hud.discoveredSecrets.length}/5 סודות
          </div>
        </div>
      </div>

      {/* Left side (RTL end): Compact Action Controls */}
      <div className="pointer-events-auto flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenJournal}
          className="hud-surface hover:border-[#7ef2c9]/50 rounded-xl px-3.5 py-2 text-xs font-semibold text-[#edf6f2] flex items-center gap-2 transition-colors whitespace-nowrap"
        >
          <BookOpen className="w-4 h-4 text-[#7ef2c9]" />
          <span className="hidden sm:inline">יומן ופרויקטים</span>
        </button>

        <button
          onClick={onDownloadHtml}
          disabled={downloadingHtml}
          className="hud-surface hover:border-[#7ef2c9]/50 rounded-xl px-3 py-2 text-xs font-semibold text-[#edf6f2] flex items-center gap-1.5 transition-colors whitespace-nowrap disabled:opacity-60"
          aria-label="הורד כקובץ HTML"
          title="הורד את כל המשחק התלת־ממדי כקובץ HTML יחיד"
        >
          <Download className="w-4 h-4 text-[#7ef2c9]" />
          <span className="hidden md:inline">{downloadingHtml ? 'מייצא...' : 'הורד HTML'}</span>
        </button>

        <button
          onClick={onOpenHelp}
          className="hud-surface hover:border-[#7ef2c9]/50 rounded-xl px-3 py-2 text-xs font-semibold text-[#edf6f2] flex items-center gap-1.5 transition-colors whitespace-nowrap"
          aria-label="מדריך משחק"
          title="מדריך ומקשים"
        >
          <HelpCircle className="w-4 h-4 text-[#f5b971]" />
          <span className="hidden lg:inline">מדריך</span>
        </button>

        <button
          onClick={onToggleAudio}
          className={`hud-surface rounded-xl px-3 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
            audioOn ? 'border-[#7ef2c9]/60 text-[#7ef2c9]' : 'text-[#b5d2cf]'
          }`}
          aria-label={audioOn ? 'כיבוי שמע' : 'הפעלת שמע'}
          title="מוזיקה ואפקטים"
        >
          {audioOn ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
          <span className="hidden lg:inline">{audioOn ? 'שמע פעיל' : 'שמע'}</span>
        </button>

        <button
          onClick={onReset}
          className="hud-surface hover:border-rose-400/50 rounded-xl p-2 text-[#b5d2cf] hover:text-rose-200 transition-colors"
          aria-label="עולם חדש"
          title="התחל עולם חדש"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
}
