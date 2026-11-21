import { ArrowUpRight, Layers, Link2, Trash2, X } from 'lucide-react';
import { BLUEPRINTS, COMMUNITY_PROJECTS_DATA, RESOURCES } from '../game/data';
import type { HudSnapshot, ResourceType } from '../game/types';

interface InspectModalProps {
  buildingId: string | null;
  projectId: string | null;
  hud: HudSnapshot;
  onUpgradeBuilding: (id: string) => void;
  onDismantleBuilding: (id: string) => void;
  onAdvanceProject: (id: string) => void;
  onClose: () => void;
}

export function InspectModal({
  buildingId,
  projectId,
  hud,
  onUpgradeBuilding,
  onDismantleBuilding,
  onAdvanceProject,
  onClose,
}: InspectModalProps) {
  if (!buildingId && !projectId) return null;

  if (projectId) {
    const proj = COMMUNITY_PROJECTS_DATA.find((p) => p.id === projectId);
    if (!proj) return null;
    const stage = hud.communityProjects[proj.id] || 0;
    const done = stage >= proj.maxStages;
    const req = !done ? proj.requirements[stage] : null;
    const canAfford =
      req &&
      Object.entries(req.cost).every(([k, v]) => (hud.inv[k as ResourceType] || 0) >= (v || 0)) &&
      (!req.minVitality || hud.vitality >= req.minVitality);

    return (
      <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="hud-surface-elevated rounded-3xl w-full max-w-lg p-6 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={onClose}
            className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="text-xs font-semibold text-[#7ef2c9] mb-1">פרויקט קהילתי משותף</div>
          <h2 className="font-display text-xl font-bold text-[#edf6f2]">{proj.title}</h2>
          <p className="text-sm text-[#b5d2cf] mt-2 leading-relaxed">{proj.desc}</p>

          <div className="mt-4 flex items-center gap-2">
            {[1, 2, 3].map((s) => (
              <div
                key={s}
                className={`h-2 flex-1 rounded-full ${
                  stage >= s ? 'bg-[#7ef2c9]' : 'bg-white/10'
                }`}
              />
            ))}
            <span className="font-mono-num text-xs text-[#edf6f2] mr-2">
              {stage}/{proj.maxStages}
            </span>
          </div>

          {req ? (
            <div className="mt-5 p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2.5">
              <div className="text-xs font-bold text-[#edf6f2]">{req.label}</div>
              <div className="flex flex-wrap gap-2 text-xs font-mono-num">
                {Object.entries(req.cost).map(([rk, amt]) => {
                  const res = RESOURCES[rk as ResourceType];
                  const has = (hud.inv[rk as ResourceType] || 0) >= (amt || 0);
                  return (
                    <span
                      key={rk}
                      className={`px-2.5 py-1 rounded-lg bg-white/5 ${
                        has ? 'text-[#7ef2c9]' : 'text-rose-300'
                      }`}
                    >
                      {res.name}: {hud.inv[rk as ResourceType] || 0}/{amt}
                    </span>
                  );
                })}
                {req.minVitality && (
                  <span
                    className={`px-2.5 py-1 rounded-lg bg-white/5 ${
                      hud.vitality >= req.minVitality ? 'text-[#7ef2c9]' : 'text-amber-300'
                    }`}
                  >
                    חיוניות עמק: {hud.vitality}% / {req.minVitality}%
                  </span>
                )}
              </div>
              <button
                disabled={!canAfford}
                onClick={() => onAdvanceProject(proj.id)}
                className={`w-full mt-2 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  canAfford
                    ? 'bg-[#7ef2c9] hover:bg-[#95f7d5] text-[#072226]'
                    : 'bg-white/10 text-white/40 cursor-not-allowed'
                }`}
              >
                לתרום ולקדם שלב
              </button>
            </div>
          ) : (
            <div className="mt-5 p-4 rounded-2xl bg-[#7ef2c9]/15 border border-[#7ef2c9]/40 text-xs text-[#7ef2c9] font-semibold">
              הפרויקט הושלם במלואו ושינה את קו הרקיע של העמק!
            </div>
          )}
        </div>
      </div>
    );
  }

  const b = hud.buildings.find((x) => x.id === buildingId);
  if (!b) return null;
  const bp = BLUEPRINTS.find((x) => x.id === b.type);
  if (!bp) return null;
  const currTier = bp.tiers[b.tier - 1];
  const nextTier = b.tier < 3 ? bp.tiers[b.tier as 1 | 2] : null;
  const links = hud.synergies.filter((s) => s.fromId === b.id || s.toId === b.id);
  const canUpgrade =
    nextTier &&
    Object.entries(nextTier.cost).every(([k, v]) => (hud.inv[k as ResourceType] || 0) >= (v || 0));

  return (
    <div className="fixed inset-0 z-40 bg-black/60 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="hud-surface-elevated rounded-3xl w-full max-w-lg p-6 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 text-xs font-semibold mb-1" style={{ color: bp.accentColor }}>
          <Layers className="w-4 h-4" />
          <span>{bp.name} · רמה {b.tier}/3</span>
        </div>
        <h2 className="font-display text-xl font-bold text-[#edf6f2]">{currTier.name}</h2>
        <p className="text-sm text-[#b5d2cf] mt-1.5 leading-relaxed">{currTier.desc}</p>

        {b.type === 'irrigator' && (
          <div className="mt-4">
            <div className="flex justify-between text-xs text-[#a5c6c3] mb-1">
              <span>פריחת קרקע סביבתית</span>
              <span className="font-mono-num">{Math.round(b.growth * 100)}%</span>
            </div>
            <div className="h-2 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-[#7ef2c9] transition-all"
                style={{ width: `${Math.round(b.growth * 100)}%` }}
              />
            </div>
          </div>
        )}

        {/* Active Synergies */}
        <div className="mt-4 p-3.5 rounded-2xl bg-white/5 border border-white/10">
          <div className="flex items-center gap-1.5 text-xs font-bold text-[#edf6f2] mb-2">
            <Link2 className="w-4 h-4 text-[#c9a6ff]" />
            <span>סינרגיות פעילות ({links.length})</span>
          </div>
          {links.length === 0 ? (
            <p className="text-xs text-[#9ec0bd]">
              אין חיבורי מערכת בטווח 28 מטר. נסה לבנות בסמוך ל: {bp.synergyWith.map((id) => BLUEPRINTS.find((x) => x.id === id)?.name).join(', ')}.
            </p>
          ) : (
            <ul className="space-y-1.5 text-xs">
              {links.map((l) => (
                <li key={l.key} className="text-[#d6ebe6]">
                  <strong style={{ color: l.color }}>{l.label}:</strong> {l.desc}
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Upgrade Panel */}
        {nextTier ? (
          <div className="mt-4 p-4 rounded-2xl bg-[#7ef2c9]/10 border border-[#7ef2c9]/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#7ef2c9]">
                שדרוג לרמה {b.tier + 1}: {nextTier.name}
              </span>
              <ArrowUpRight className="w-4 h-4 text-[#7ef2c9]" />
            </div>
            <p className="text-xs text-[#cfe8e3] mt-1">{nextTier.desc}</p>
            <div className="flex flex-wrap gap-2 mt-2.5 text-xs font-mono-num">
              {Object.entries(nextTier.cost).map(([rk, amt]) => {
                const res = RESOURCES[rk as ResourceType];
                const has = (hud.inv[rk as ResourceType] || 0) >= (amt || 0);
                return (
                  <span
                    key={rk}
                    className={`px-2 py-0.5 rounded bg-black/30 ${has ? 'text-[#7ef2c9]' : 'text-rose-300'}`}
                  >
                    {res.name}: {hud.inv[rk as ResourceType] || 0}/{amt}
                  </span>
                );
              })}
            </div>
            <button
              disabled={!canUpgrade}
              onClick={() => onUpgradeBuilding(b.id)}
              className={`w-full mt-3 py-2 rounded-xl text-xs font-bold transition-colors ${
                canUpgrade
                  ? 'bg-[#7ef2c9] hover:bg-[#95f7d5] text-[#072226]'
                  : 'bg-white/10 text-white/40 cursor-not-allowed'
              }`}
            >
              שדרג מבנה
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 rounded-2xl bg-amber-400/10 border border-amber-400/30 text-xs text-amber-200 font-semibold">
            המצאה זו הגיעה לרמה המקסימלית (רמה 3)!
          </div>
        )}

        <button
          onClick={() => {
            onDismantleBuilding(b.id);
            onClose();
          }}
          className="mt-4 w-full py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-400/25 text-rose-200 text-xs font-semibold flex items-center justify-center gap-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>פירוק והחזרת חלק מהחומרים</span>
        </button>
      </div>
    </div>
  );
}
