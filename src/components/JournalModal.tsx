import { useState } from 'react';
import { BookOpen, Compass, HeartHandshake, MapPin, Sparkles, Users, X } from 'lucide-react';
import { COMMUNITY_PROJECTS_DATA, INITIAL_SECRETS, NPCS_BASE } from '../game/data';
import type { HudSnapshot, RealActionPlan } from '../game/types';

interface JournalModalProps {
  hud: HudSnapshot;
  onNavigateTo: (x: number, z: number) => void;
  onSaveRealPlan: (plan: RealActionPlan | null) => void;
  onClose: () => void;
}

type TabId = 'people' | 'secrets' | 'log' | 'bridge';

export function JournalModal({
  hud,
  onNavigateTo,
  onSaveRealPlan,
  onClose,
}: JournalModalProps) {
  const [tab, setTab] = useState<TabId>('people');
  const [action, setAction] = useState(hud.realPlan?.action || '');
  const [when, setWhen] = useState(hud.realPlan?.when || '');
  const [ifThen, setIfThen] = useState(hud.realPlan?.ifThen || '');

  const presetChoices = [
    'להקשיב למישהו קרוב במשך 5 דקות בלי לנסות לתקן מיד',
    'לשלוח הודעה כנה למישהו שלא דיברתי איתו זמן רב',
    'לשאול אדם אחד מה באמת יעזור לו היום, במקום להניח מראש',
    'לעשות מחווה קטנה ושקטה בלי לצפות לתמורה',
  ];

  return (
    <div className="fixed inset-0 z-40 bg-black/65 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="hud-surface-elevated rounded-3xl w-full max-w-3xl max-h-[86vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <BookOpen className="w-5 h-5 text-[#7ef2c9]" />
            <h2 className="font-display text-lg font-bold text-[#edf6f2]">אלמנך העמק והקהילה</h2>
          </div>
          <button
            onClick={onClose}
            className="text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
            aria-label="סגור"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1.5 px-6 pt-3 pb-2 border-b border-white/10 overflow-x-auto">
          {[
            { id: 'people', label: 'תושבים ופרויקטים', icon: Users },
            { id: 'secrets', label: 'סודות ועתיקות', icon: Sparkles },
            { id: 'log', label: 'יומן דרך', icon: Compass },
            { id: 'bridge', label: 'הגשר למציאות', icon: HeartHandshake },
          ].map((t) => {
            const Icon = t.icon;
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id as TabId)}
                className={`px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-colors ${
                  active
                    ? 'bg-[#7ef2c9] text-[#072226]'
                    : 'bg-white/5 hover:bg-white/10 text-[#b5d2cf]'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto thin-scroll space-y-5">
          {tab === 'people' && (
            <>
              <div>
                <h3 className="font-display text-sm font-bold text-[#edf6f2] mb-3">
                  תושבי העמק — צרכים חיים וזיכרון
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {NPCS_BASE.map((npc) => {
                    const mem = hud.npcMemories[npc.id];
                    const need = hud.npcNeeds[npc.id];
                    const done = hud.completedQuests.includes(npc.questId);
                    return (
                      <div key={npc.id} className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                        <div className="flex items-center justify-between">
                          <div>
                            <strong className="text-sm text-[#edf6f2]" style={{ color: npc.color }}>
                              {npc.name}
                            </strong>
                            <span className="text-xs text-[#9ec0bd] mr-2">{npc.title}</span>
                          </div>
                          <button
                            onClick={() => {
                              onNavigateTo(need.focusX - 2, need.focusZ);
                              onClose();
                            }}
                            className="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-[#7ef2c9] flex items-center gap-1"
                          >
                            <MapPin className="w-3 h-3" />
                            נווט לשם
                          </button>
                        </div>
                        <p className="text-xs text-[#cde2dd]">
                          צורך נוכחי: <strong>{need.label}</strong>
                        </p>
                        <div className="flex items-center justify-between text-[11px] text-[#9ec0bd] font-mono-num">
                          <span>אמון: {mem.trust.toFixed(1)}/5</span>
                          <span>מצב רוח: {Math.round(mem.mood)}%</span>
                          <span>{done ? 'משימה הושלמה' : 'בתהליך'}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="font-display text-sm font-bold text-[#edf6f2] mb-3">
                  פרויקטים קהילתיים רב-שלביים
                </h3>
                <div className="space-y-2.5">
                  {COMMUNITY_PROJECTS_DATA.map((p) => {
                    const stage = hud.communityProjects[p.id] || 0;
                    return (
                      <div
                        key={p.id}
                        className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4"
                      >
                        <div className="min-w-0">
                          <div className="text-sm font-bold text-[#edf6f2]">{p.title}</div>
                          <p className="text-xs text-[#a5c6c3] mt-0.5">{p.desc}</p>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-mono-num text-xs text-[#7ef2c9] font-bold">
                            שלב {stage}/{p.maxStages}
                          </span>
                          <button
                            onClick={() => {
                              onNavigateTo(p.x - 2, p.z + 2);
                              onClose();
                            }}
                            className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-semibold text-[#edf6f2]"
                          >
                            גש לאתר
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {tab === 'secrets' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-[#c9a6ff]/10 border border-[#c9a6ff]/30 text-xs text-[#e0ceff]">
                סטטוס עתיקות: מערת הגבישים ({hud.cavernLit ? 'מוארת' : 'ממתינה לאור/תהודה'}) · עמודי רונה בשרידים ({hud.ruinPillars.filter(Boolean).length}/3 פעילים)
              </div>
              {INITIAL_SECRETS.map((sec) => {
                const found = hud.discoveredSecrets.includes(sec.id);
                return (
                  <div
                    key={sec.id}
                    className={`p-4 rounded-2xl border ${
                      found
                        ? 'bg-[#7ef2c9]/10 border-[#7ef2c9]/35'
                        : 'bg-white/[0.03] border-white/10'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-sm text-[#edf6f2]">
                        {found ? sec.title : 'סוד עמק חבוי'}
                      </strong>
                      <span className="text-[11px] font-mono-num text-[#a5c6c3]">
                        {found ? 'נחשף' : 'טרם התגלה'}
                      </span>
                    </div>
                    <p className="text-xs text-[#b5d2cf] mt-1.5 leading-relaxed">
                      {found
                        ? sec.lore
                        : 'חקור את המערה, השרידים, הטרסה והאי שמאחורי המפל ושדר תהודה (Q) כדי לחשוף.'}
                    </p>
                  </div>
                );
              })}
            </div>
          )}

          {tab === 'log' && (
            <div className="space-y-2.5">
              {hud.journal.map((entry) => (
                <div
                  key={entry.id}
                  className="p-3 rounded-xl bg-white/5 border border-white/10 flex items-start justify-between gap-3 text-xs"
                >
                  <span className="text-[#dfefe9] leading-relaxed">{entry.text}</span>
                  <span className="font-mono-num text-[11px] text-[#8cb1ae] shrink-0">
                    יום {entry.day}
                  </span>
                </div>
              ))}
            </div>
          )}

          {tab === 'bridge' && (
            <div className="space-y-4">
              <p className="text-xs text-[#b5d2cf] leading-relaxed">
                החלק הזה הוא רשות לחלוטין ונשמר מקומית בדפדפן שלך. בלי ציון מוסרי ובלי שיפוט — רק תזכורת עדינה אם תרצה לקחת צעד קטן מהמסע אל החיים האמיתיים.
              </p>

              <div className="grid sm:grid-cols-2 gap-2">
                {presetChoices.map((c) => (
                  <button
                    key={c}
                    onClick={() => setAction(c)}
                    className={`text-right p-3 rounded-xl text-xs border transition-colors ${
                      action === c
                        ? 'bg-[#7ef2c9]/15 border-[#7ef2c9] text-[#edf6f2]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#cde2dd]'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-[#b5d2cf] mb-1">הצעד שבחרתי:</label>
                  <input
                    value={action}
                    onChange={(e) => setAction(e.target.value)}
                    placeholder="או כתוב מעשה קטן משלך..."
                    className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs text-white"
                  />
                </div>
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-[#b5d2cf] mb-1">מתי / באיזה רגע?</label>
                    <input
                      value={when}
                      onChange={(e) => setWhen(e.target.value)}
                      placeholder="למשל: הערב אחרי ארוחת הערב"
                      className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#b5d2cf] mb-1">אם לא יתאפשר — מה התוכנית החלופית?</label>
                    <input
                      value={ifThen}
                      onChange={(e) => setIfThen(e.target.value)}
                      placeholder="למשל: אבדוק שוב מחר בבוקר"
                      className="w-full rounded-xl bg-black/30 border border-white/15 px-3 py-2 text-xs text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    if (!action.trim()) return;
                    onSaveRealPlan({
                      action: action.trim(),
                      when: when.trim() || 'בזמן מתאים היום',
                      ifThen: ifThen.trim(),
                      status: 'planned',
                      createdAt: Date.now(),
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-[#7ef2c9] text-[#072226] text-xs font-bold"
                >
                  שמור תוכנית אישית
                </button>
                {hud.realPlan && hud.realPlan.status !== 'done' && (
                  <button
                    onClick={() =>
                      onSaveRealPlan({ ...hud.realPlan!, status: 'done' })
                    }
                    className="px-4 py-2 rounded-xl bg-emerald-400/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold"
                  >
                    סימון: הצעד בוצע
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
