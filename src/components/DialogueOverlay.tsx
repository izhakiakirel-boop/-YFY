import { useState } from 'react';
import { Gift, Heart, History, MessageCircle, X } from 'lucide-react';
import { DIALOGUE_TREES, NPCS_BASE, RESOURCES } from '../game/data';
import type { DialogueChoice } from '../game/data';
import type { HudSnapshot, NpcId, ResourceType } from '../game/types';

interface DialogueOverlayProps {
  npcId: NpcId;
  hud: HudSnapshot;
  onChoice: (choice: DialogueChoice) => void;
  onGift: (resType: ResourceType) => { aligned: boolean; reply: string };
  onClose: () => void;
}

export function DialogueOverlay({
  npcId,
  hud,
  onChoice,
  onGift,
  onClose,
}: DialogueOverlayProps) {
  const npc = NPCS_BASE.find((n) => n.id === npcId)!;
  const mem = hud.npcMemories[npcId];
  const need = hud.npcNeeds[npcId];
  const questDone = hud.completedQuests.includes(npc.questId);
  const promise = hud.promises.find(
    (p) => p.npc === npcId && (p.status === 'active' || p.status === 'overdue'),
  );

  const [nodeId, setNodeId] = useState<string>('root');
  const [replyText, setReplyText] = useState<string | null>(null);
  const [giftMode, setGiftMode] = useState(false);

  const tree = DIALOGUE_TREES[npcId];
  const node = tree[nodeId] || tree.root;

  const mainText =
    replyText ??
    node.getText({
      trust: mem.trust,
      conversations: mem.conversations,
      questDone,
      promiseStatus: promise?.status ?? null,
      secretsCount: hud.discoveredSecrets.length,
      cavernLit: hud.cavernLit,
      vitality: hud.vitality,
      lastTone: mem.lastChoiceTone,
      remembered: mem.rememberedEvents,
    });

  const handleSelectChoice = (c: DialogueChoice) => {
    onChoice(c);
    if (c.action === 'gift_menu') {
      setReplyText(c.responseText);
      setGiftMode(true);
      return;
    }
    if (c.action === 'close') {
      onClose();
      return;
    }
    if (c.nextNodeId && tree[c.nextNodeId]) {
      setReplyText(c.responseText);
      setNodeId(c.nextNodeId);
    } else {
      setReplyText(c.responseText);
    }
  };

  const availableResources = (Object.keys(RESOURCES) as ResourceType[]).filter(
    (rk) => (hud.inv[rk] || 0) > 0,
  );

  return (
    <div className="fixed inset-x-0 bottom-4 z-30 flex justify-center px-3 pointer-events-none">
      <div className="pointer-events-auto hud-surface-elevated rounded-3xl w-full max-w-2xl p-5 relative border border-[#7ef2c9]/30">
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
          aria-label="סגור שיחה"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Character Header */}
        <div className="flex items-start gap-3.5 mb-3">
          <div
            className="w-12 h-12 rounded-2xl flex items-center justify-center font-display text-xl font-bold shrink-0 border"
            style={{
              backgroundColor: `${npc.color}22`,
              borderColor: `${npc.color}66`,
              color: npc.color,
            }}
          >
            {npc.name[0]}
          </div>
          <div className="min-w-0 flex-1 pl-6">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="font-display text-lg font-bold text-[#edf6f2]">{npc.name}</h2>
              <span className="text-xs text-[#9ec0bd]">{npc.title}</span>
              <span className="text-white/20" aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-xs text-[#f29eb9]">
                <Heart className="w-3.5 h-3.5 fill-current" />
                <span className="font-mono-num">{mem.trust.toFixed(1)}/5</span>
              </span>
            </div>
            <p className="text-xs text-[#a5c6c3] mt-0.5">{npc.personality}</p>
          </div>
        </div>

        {/* Memory & Current Need Strip */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-[#9ec0bd] pb-3 mb-3 border-b border-white/10">
          <span className="inline-flex items-center gap-1.5">
            <MessageCircle className="w-3.5 h-3.5 text-[#7ef2c9]" />
            צורך נוכחי: <strong className="text-[#edf6f2]">{need?.label}</strong>
          </span>
          {mem.rememberedEvents[0] && (
            <span className="inline-flex items-center gap-1.5 text-[#d4b8ff]">
              <History className="w-3.5 h-3.5" />
              זוכר/ת: {mem.rememberedEvents[0]}
            </span>
          )}
        </div>

        {/* Narrative Text */}
        <p className="text-sm md:text-[15px] leading-relaxed text-[#e8f5f0] mb-4">
          {mainText}
        </p>

        {/* Branching Choices or Gift Sharing */}
        {giftMode ? (
          <div className="space-y-3">
            <div className="text-xs text-[#a5c6c3] flex items-center gap-1.5">
              <Gift className="w-4 h-4 text-[#f5b971]" />
              <span>בחר חומר לשיתוף (מומלץ ל{npc.name}: {RESOURCES[npc.favoredGift].name}):</span>
            </div>
            {availableResources.length === 0 ? (
              <p className="text-xs text-[#9ec0bd]">התיק ריק כרגע. הקשבה ושיחה עוזרות לא פחות מחפצים.</p>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {availableResources.map((rk) => (
                  <button
                    key={rk}
                    onClick={() => {
                      const res = onGift(rk);
                      setReplyText(res.reply);
                      setGiftMode(false);
                    }}
                    className={`rounded-xl px-3 py-2 text-xs font-semibold text-right border transition-colors ${
                      rk === npc.favoredGift
                        ? 'bg-[#7ef2c9]/15 border-[#7ef2c9]/60 text-[#7ef2c9]'
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#edf6f2]'
                    }`}
                  >
                    {RESOURCES[rk].name} ({hud.inv[rk]})
                  </button>
                ))}
              </div>
            )}
            <button
              onClick={() => setGiftMode(false)}
              className="text-xs text-[#9ec0bd] hover:text-white underline"
            >
              חזרה לבחירות השיחה
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {node.choices.map((c, i) => (
              <button
                key={c.id}
                onClick={() => handleSelectChoice(c)}
                className={`text-right rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-colors border ${
                  i === 0
                    ? 'bg-[#7ef2c9]/15 hover:bg-[#7ef2c9]/25 border-[#7ef2c9]/50 text-[#edf6f2]'
                    : 'bg-white/5 hover:bg-white/10 border-white/10 text-[#d8ebe6]'
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
