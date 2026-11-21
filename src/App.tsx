import { useEffect, useRef, useState } from 'react';
import { BottomDock } from './components/BottomDock';
import { DialogueOverlay } from './components/DialogueOverlay';
import { HelpModal } from './components/HelpModal';
import { InspectModal } from './components/InspectModal';
import { JournalModal } from './components/JournalModal';
import { Minimap } from './components/Minimap';
import { TopHud } from './components/TopHud';
import { TouchControls } from './components/TouchControls';
import { WorldEngine } from './game/WorldEngine';
import type { BlueprintId, HudSnapshot, NpcId, ToastMessage } from './game/types';

export default function App() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<WorldEngine | null>(null);

  const [hud, setHud] = useState<HudSnapshot | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [audioOn, setAudioOn] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activeBlueprint, setActiveBlueprint] = useState<BlueprintId | null>(null);

  const [activeNpc, setActiveNpc] = useState<NpcId | null>(null);
  const [inspectBuildingId, setInspectBuildingId] = useState<string | null>(null);
  const [inspectProjectId, setInspectProjectId] = useState<string | null>(null);
  const [journalOpen, setJournalOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [downloadingHtml, setDownloadingHtml] = useState(false);

  const pushToast = (t: ToastMessage) => {
    setToasts((prev) => [...prev.slice(-2), t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((item) => item.id !== t.id));
    }, 4200);
  };

  const handleDownloadHtml = async () => {
    if (downloadingHtml) return;
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
      URL.revokeObjectURL(url);
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

    const engine = new WorldEngine(el, {
      onHudUpdate: (snap) => setHud(snap),
      onToast: (t) => pushToast(t),
      onOpenNpc: (npcId) => setActiveNpc(npcId),
      onInspectBuilding: (bId) => setInspectBuildingId(bId),
      onOpenProject: (pId) => setInspectProjectId(pId),
      onBuildModeChange: (bp) => setActiveBlueprint(bp),
    });

    engineRef.current = engine;

    pushToast({
      id: 'welcome',
      text: 'ברוך הבא לעמק החי. שוטט ב-WASD, אסוף עם F, ושדר תהודה עם Q לגילוי סודות.',
      tone: 'good',
    });

    return () => {
      engine.dispose();
      engineRef.current = null;
    };
  }, []);

  // Pause simulation / focus camera when overlays are open
  useEffect(() => {
    const anyModal = !!(
      activeNpc ||
      inspectBuildingId ||
      inspectProjectId ||
      journalOpen ||
      helpOpen ||
      resetConfirmOpen
    );
    engineRef.current?.setDialogPaused(anyModal, activeNpc);
  }, [activeNpc, inspectBuildingId, inspectProjectId, journalOpen, helpOpen, resetConfirmOpen]);

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
        else if (resetConfirmOpen) setResetConfirmOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeNpc, inspectBuildingId, inspectProjectId, journalOpen, helpOpen, resetConfirmOpen]);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#08161a]">
      {/* Isolated WebGL Mount Container */}
      <div
        ref={mountRef}
        className="absolute inset-0 w-full h-full"
        aria-label="עולם משחק תלת-ממדי שוזרים עולם"
      />

      {/* Top Floating Telemetry & Controls */}
      {hud && (
        <TopHud
          hud={hud}
          audioOn={audioOn}
          downloadingHtml={downloadingHtml}
          onToggleAudio={() => {
            const next = engineRef.current?.toggleAudio() ?? false;
            setAudioOn(next);
          }}
          onAdvanceTime={() => engineRef.current?.advanceTimeOfDay(3)}
          onDownloadHtml={handleDownloadHtml}
          onOpenJournal={() => setJournalOpen(true)}
          onOpenHelp={() => setHelpOpen(true)}
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
