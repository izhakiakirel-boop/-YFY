import { Compass, Globe, Layers, Radio, ShieldAlert, X } from 'lucide-react';

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  return (
    <div className="fixed inset-0 z-40 bg-black/65 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="hud-surface-elevated rounded-3xl w-full max-w-xl p-6 relative max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 left-4 text-[#9ec0bd] hover:text-white p-1.5 rounded-lg bg-white/5"
          aria-label="סגור"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-xs font-semibold text-[#7ef2c9] mb-1">מדריך לעולם החי</div>
        <h2 className="font-display text-xl font-bold text-[#edf6f2]">שוזרים עולם 3D</h2>
        <p className="text-xs text-[#b5d2cf] mt-1 leading-relaxed">
          עמק אינסופי בגוף שלישי עם תושבים נעים, משאבים, בנייה משולבת ואתגרי הישרדות מול נבגי קמילה ורוחות צל.
        </p>

        <div className="mt-4 space-y-3 text-xs">
          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
            <Compass className="w-5 h-5 text-[#7ef2c9] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#edf6f2] block">תנועה ומצלמה</strong>
              <span className="text-[#b5d2cf]">
                <strong className="font-mono-num">WASD</strong> או חצים לתנועה · <strong className="font-mono-num">Shift</strong> לריצה · <strong className="font-mono-num">Space</strong> לקפיצה · גרירת עכבר לסיבוב מצלמה · גלגלת לזום · <strong className="font-mono-num">H</strong> לקיפול התפריט.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
            <Radio className="w-5 h-5 text-[#c9a6ff] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#edf6f2] block">איסוף, תהודה וגילוי סודות</strong>
              <span className="text-[#b5d2cf]">
                <strong className="font-mono-num">E</strong> לשיחה עם התושבים המסיירים בעמק, שרידים ומבנים · <strong className="font-mono-num">F</strong> לאיסוף חומרים · <strong className="font-mono-num">Q</strong> לשידור פעימת תהודה שחושפת מרבצים נסתרים ומאירה מוקדים.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#edf6f2] block">הישרדות, רוחות צל וטיהור קמילה</strong>
              <span className="text-[#b5d2cf]">
                נבגי קמילה פוגעים בבריאות ובחיוניות העמק ומזמנים רוחות צל — הדוף אותן עם <strong className="font-mono-num">Q</strong> או מקם פנסים ומגדלי תהודה להגנה. ספסלי מפגש וכיכר הלב משקמים את בריאותך! אם הבריאות מגיעה ל-0 או שהעמק קורס בחיוניות 0%, המשחק נעצר.
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
            <Globe className="w-5 h-5 text-[#8ff2b4] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#edf6f2] block">מרחבי הספר האינסופיים ויצירת עולם חדש</strong>
              <span className="text-[#b5d2cf]">
                צא מזרחה, מערבה או צפונה אל מעבר לעמק הראשי לטופוגרפיה אינסופית הנבנית תוך כדי הליכה. לחץ על <em>עולם חדש +</em> בסרגל העליון ליצירת עולם חדש בזמן אמת לפי זרע ואקלים!
              </span>
            </div>
          </div>

          <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex gap-3">
            <Layers className="w-5 h-5 text-[#f5b971] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[#edf6f2] block">שרשרות אנרגיה ושדרוגי רמה 1–3</strong>
              <span className="text-[#b5d2cf]">
                בחרו המצאה בשולחן התחתון ולחצו על הקרקע להצבה (<strong className="font-mono-num">R</strong> לסיבוב). קרבו <em>לוכד עננים</em> ל<em>אמת השקיה</em>, או <em>מגדל תהודה</em> לפנסים ליצירת קשתות אנרגיה חיות.
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-2.5 rounded-xl bg-[#7ef2c9] hover:bg-[#95f7d5] text-[#072226] text-xs font-bold"
        >
          חזרה לעמק
        </button>
      </div>
    </div>
  );
}
