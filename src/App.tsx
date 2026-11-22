import { Component, type ErrorInfo, type ReactNode, useEffect, useRef, useState } from 'react';
import { BottomDock } from './components/BottomDock';
import { DialogueOverlay } from './components/DialogueOverlay';
import { GameOverModal } from './components/GameOverModal';
import { HelpModal } from './components/HelpModal';
import { InspectModal } from './components/InspectModal';
import { JournalModal } from './components/JournalModal';
import { Minimap } from './components/Minimap';
import { NewWorldModal } from './components/NewWorldModal';
import { TopHud } from './components/TopHud';
import { TouchControls } from './components/TouchControls';
import { WorldEngine } from './game/WorldEngine';
import type { AudioMixSettings, BlueprintId, HudSnapshot, NpcId, ToastMessage } from './game/types';

class AppErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; message: string }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, message: '' };
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, message: error?.message || 'שגיאה לא צפויה בהפעלת העולם' };
  }

  componentDidCatch(_error: Error, _info: ErrorInfo) {
    // Handled visibly in fallback UI
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-screen h-screen bg-[#08161a] text-[#edf6f2] flex items-center justify-center p-6 text-right">
          <div className="hud-surface-elevated max-w-md w-full rounded-3xl p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#f5b971]">אירעה שגיאה בטעינת העמק</h2>
            <p className="text-xs text-[#cfe8e3] leading-relaxed">
              נסה לרענן את הדף או לפתוח בדפדפן Chrome / Edge עדכני עם תמיכה ב-WebGL2.
            </p>
            <div className="text-[11px] font-mono-num text-[#9ec0bd] bg-black/30 rounded-xl p-2.5">
              {this.state.message}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function ValleyGameApp() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WorldEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [audioOn, setAudioOn] = useState(false);
  const [audioMix, setAudioMix] = useState<AudioMixSettings>({
    muted: false,
    musicVolume: 0.75,
    ambienceVolume: 0.85,
  });
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeBlueprint, setActiveBlueprint] = useState<BlueprintId | null>(null);

  const [activeNpc, setActiveNpc] = useState<NpcId | null>(null);
  const [inspectBuildingId, setInspectBuildingId] = useState<string | null>(null);
  const [inspectProjectId, setInspectProjectId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [newWorldOpen, setNewWorldOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);
  const [engineError, setEngineError] = useState<string | null>(null);

  const pushToast = (t: ToastMessage) => {
    setToasts((prev) => [...prev.slice(-2), t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== t.id));
    }, 4200);
  };

  const handleDownloadHtml = async () => {
    if (downloadingHtml) return;
    if (window.location.protocol === 'file:') {
      pushToast({
        id: `dl_local_${Date.now()}`,
        text: 'אתה כבר מריץ את קובץ ה-HTML העצמאי ישירות מהמחשב!',
        tone: 'info',
      });
      return;
    }
    setDownloadingHtml(true);
    try {
      const res = await fetch('/shozrim-olam-3d.html');
      if (!res.ok) throw new Error('HTTP error');
      const html = await res.text();
      if (!html.toLowerCase().includes('<script') || /<script[^>]+src=["']\/src\/main\.tsx["']/i.test(html)) {
        throw new Error('Unbundled HTML');
      }
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'shozrim-olam-3d.html';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      pushToast({
        id: `dl_${Date.now()}`,
        text: 'קובץ המשחק shozrim-olam-3d.html ירד בהצלחה!',
        tone: 'good',
      });
    } catch {
      pushToast({
        id: `dl_err_${Date.now()}`,
        text: 'לא ניתן היה לייצא את קובץ ה-HTML כרגע. נסה שוב בעוד רגע.',
        tone: 'warn',
      });
    } finally {
      setDownloadingHtml(false);
    }
  };

  useEffect(() => {
    const el = mountRef.current;
    if (!el) return;

    let engine: WorldEngine | null = null;
    try {
      engine = new WorldEngine(el, {
        onHudUpdate: (snap) => setHud(snap),
        onToast: (t) => pushToast(t),
        onOpenNpc: (npcId) => setActiveNpc(npcId),
        onInspectBuilding: (bId) => setInspectBuildingId(bId),
        onOpenProject: (pId) => setInspectProjectId(pId),
        onBuildModeChange: (bp) => setActiveBlueprint(bp),
        onAudioChange: (enabled) => setAudioOn(enabled),
        onAudioMixChange: (mix) => setAudioMix(mix),
      });
      engineRef.current = engine;
      setAudioMix(engine.getAudioMix());

      pushToast({
        id: 'welcome',
        text: 'ברוך הבא לעמק החי. שוטט ב-WASD, אסוף עם F, ושדר תהודה עם Q לגילוי סודות.',
        tone: 'good',
      });
    } catch (err) {
      setEngineError(err instanceof Error ? err.message : 'שגיאה באתחול תצוגת התלת־ממד (WebGL)');
    }

    return () => {
      engine?.dispose();
      engineRef.current = null;
    };
  }, []);

  // Pause simulation / focus camera when overlays or game-over are open
  useEffect(() => {
    const anyModal = !!(
      activeNpc ||
      inspectBuildingId ||
      inspectProjectId ||
      journalOpen ||
      helpOpen ||
      newWorldOpen ||
      resetConfirmOpen ||
      hud?.gameOver
    );
    engineRef.current?.setDialogPaused(anyModal, activeNpc);
  }, [activeNpc, inspectBuildingId, inspectProjectId, journalOpen, helpOpen, newWorldOpen, resetConfirmOpen, hud?.gameOver]);

  // Global H (Zen Mode) and Escape shortcuts
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target;
      if (target instanceof HTMLElement && (target.matches('input,textarea,select') || target.isContentEditable)) {
        return;
      }
      if (e.code === 'KeyH') {
        setDockCollapsed((prev) => !prev);
      } else if (e.code === 'Escape') {
        if (activeNpc) setActiveNpc(null);
        else if (inspectBuildingId) setInspectBuildingId(null);
        else if (inspectProjectId) setInspectProjectId(null);
        else if (journalOpen) setJournalOpen(false);
        else if (helpOpen) setHelpOpen(false);
        else if (newWorldOpen) setNewWorldOpen(false);
        else if (resetConfirmOpen) setResetConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNpc, inspectBuildingId, inspectProjectId, journalOpen, helpOpen, newWorldOpen, resetConfirmOpen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08161a]">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="עולם משחק תלת-ממדי שוזרים עולם"
      />

      {engineError && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#08161a] p-6 text-right">
          <div className="hud-surface-elevated max-w-md w-full rounded-3xl p-6 space-y-3">
            <h2 className="font-display text-lg font-bold text-[#f5b971]">לא ניתן להפעיל תלת־ממד בדפדפן זה</h2>
            <p className="text-xs text-[#cfe8e3] leading-relaxed">
              כדי להריץ את העמק התלת־ממדי נדרשת תמיכת WebGL2 פעילה בדפדפן (Chrome / Edge / Firefox עדכניים עם האצת חומרה פעילה).
            </p>
            <div className="text-[11px] font-mono-num text-[#9ec0bd] bg-black/30 rounded-xl p-2.5">
              {engineError}
            </div>
          </div>
        </div>
      )}

      {/* Low-HP crimson edge alert (pointer-events-none, no backdrop-filter) */}
      {hud && hud.health < 35 && !hud.gameOver && (
        <div
          className="pointer-events-none fixed inset-0 z-10 transition-opacity duration-300"
          style={{
            boxShadow: 'inset 0 0 90px rgba(244, 63, 94, 0.45)',
          }}
        />
      )}

      {/* Top Floating Telemetry & Controls */}
      {hud && (
        <TopHud
          hud={hud}
          audioOn={audioOn}
          audioMix={audioMix}
          downloadingHtml={downloadingHtml}
          onToggleAudio={() => {
            const next = engineRef.current?.toggleAudio() ?? false;
            setAudioOn(next);
          }}
          onChangeMusicVolume={(vol) => engineRef.current?.setMusicVolume(vol)}
          onChangeAmbienceVolume={(vol) => engineRef.current?.setAmbienceVolume(vol)}
          onAdvanceTime={() => engineRef.current?.advanceTimeOfDay(3)}
          onDownloadHtml={handleDownloadHtml}
          onOpenJournal={() => setJournalOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
          onOpenNewWorld={() => setNewWorldOpen(true)}
          onReset={() => setResetConfirmOpen(true)}
        />
      )}

      {/* Clickable Valley Minimap */}
      {hud && (
        <Minimap
          hud={hud}
          onNavigateTo={(x, z) => engineRef.current?.movePlayerToward(x, z)}
        />
      )}

      {/* Toast Stack */}
      <div className="pointer-events-none fixed top-20 inset-x-0 z-30 flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`hud-surface-elevated rounded-2xl px-4 py-2 text-xs font-semibold text-center max-w-md ${
              t.tone === 'secret'
                ? 'border-[#c9a6ff]/60 text-[#e4d2ff]'
                : t.tone === 'good'
                  ? 'border-[#7ef2c9]/55 text-[#d7faec]'
                  : t.tone === 'warn'
                    ? 'border-[#f5b971]/60 text-[#ffe4be]'
                    : 'text-[#edf6f2]'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>

      {/* Collapsible Bottom Command Dock */}
      {hud && !activeNpc && (
        <BottomDock
          hud={hud}
          collapsed={dockCollapsed}
          activeBlueprint={activeBlueprint}
          onToggleCollapse={() => setDockCollapsed((p) => !p)}
          onSelectBlueprint={(bp) => engineRef.current?.setBuildBlueprint(bp)}
          onInteract={() => engineRef.current?.interact()}
          onGather={() => engineRef.current?.gatherNearby()}
          onPulse={() => engineRef.current?.triggerPulse()}
        />
      )}

      {/* Mobile Virtual Touch Controls */}
      {!activeNpc && (
        <TouchControls
          onMoveVector={(x, z) => engineRef.current?.setTouchVector(x, z)}
          onJump={() => engineRef.current?.jump()}
          onGather={() => engineRef.current?.gatherNearby()}
          onPulse={() => engineRef.current?.triggerPulse()}
        />
      )}

      {/* Branching Character Dialogue */}
      {hud && activeNpc && (
        <DialogueOverlay
          npcId={activeNpc}
          hud={hud}
          onChoice={(c) => engineRef.current?.applyDialogueChoice(activeNpc, c)}
          onGift={(res) => engineRef.current!.giveGiftToNpc(activeNpc, res)}
          onClose={() => setActiveNpc(null)}
        />
      )}

      {/* Building Upgrade / Community Project Modal */}
      {hud && (inspectBuildingId || inspectProjectId) && (
        <InspectModal
          buildingId={inspectBuildingId}
          projectId={inspectProjectId}
          hud={hud}
          onUpgradeBuilding={(id) => engineRef.current?.upgradeBuilding(id)}
          onDismantleBuilding={(id) => engineRef.current?.dismantleBuilding(id)}
          onAdvanceProject={(id) => engineRef.current?.advanceCommunityProject(id)}
          onClose={() => {
            setInspectBuildingId(null);
            setInspectProjectId(null);
          }}
        />
      )}

      {/* Valley Almanac / Residents / Secrets / Reality Bridge */}
      {hud && journalOpen && (
        <JournalModal
          hud={hud}
          onNavigateTo={(x, z) => engineRef.current?.movePlayerToward(x, z)}
          onSaveRealPlan={(plan) => engineRef.current?.saveRealPlan(plan)}
          onClose={() => setJournalOpen(false)}
        />
      )}

      {/* Guide Modal */}
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}

      {/* Procedural New World Generator Modal */}
      {hud && newWorldOpen && (
        <NewWorldModal
          currentSeedLabel={hud.seedLabel}
          currentBiome={hud.biomePreset}
          onCreateWorld={(cfg) => engineRef.current?.generateNewWorld(cfg)}
          onClose={() => setNewWorldOpen(false)}
        />
      )}

      {/* Game Over / Defeat Modal */}
      {hud && hud.gameOver && !newWorldOpen && (
        <GameOverModal
          gameOver={hud.gameOver}
          onRetryWorld={() => engineRef.current?.retryCurrentWorld()}
          onOpenNewWorld={() => setNewWorldOpen(true)}
        />
      )}

      {/* Reset World Confirmation */}
      {resetConfirmOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setResetConfirmOpen(false)}
        >
          <div
            className="hud-surface-elevated rounded-3xl max-w-sm w-full p-6 text-right"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-display text-lg font-bold text-[#edf6f2]">להתחיל עולם חדש?</h3>
            <p className="text-xs text-[#b5d2cf] mt-2 leading-relaxed">
              כל המבנים, השדרוגים, הסודות שנחשפו והזיכרונות שנשמרו בדפדפן יימחקו וייווצר עמק חדש.
            </p>
            <div className="flex items-center gap-2.5 mt-5">
              <button
                onClick={() => {
                  engineRef.current?.resetWorld();
                  setResetConfirmOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-bold"
              >
                כן, התחל מחדש
              </button>
              <button
                onClick={() => setResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-[#edf6f2] text-xs font-semibold"
              >
                ביטול
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <AppErrorBoundary>
      <ValleyGameApp />
    </AppErrorBoundary>
  );
}
