import type {
  AchievementDefinition,
  BiomePresetId,
  BiomePresetMeta,
  BlueprintId,
  CommunityProjectState,
  NpcId,
  ResourceInventory,
  ResourceType,
  SecretDiscovery,
  ZoneId,
} from './types';
import { MAIN_BRIDGE_POS } from './terrain';

export interface ResourceMeta {
  id: ResourceType;
  name: string;
  shortDesc: string;
  color: string;
  hex: number;
}

export const RESOURCES: Record<ResourceType, ResourceMeta> = {
  wood: {
    id: 'wood',
    name: 'ענפי אלון',
    shortDesc: 'עץ גמיש ועמיד לבניית גשרים, אמות מים ומבנים.',
    color: '#d9a066',
    hex: 0xd9a066,
  },
  glow: {
    id: 'glow',
    name: 'גבישי אור-ירח',
    shortDesc: 'מינרל מאיר מהיער וממערת הגבישים. מזין פנסים ומגדלי תהודה.',
    color: '#88e9ff',
    hex: 0x88e9ff,
  },
  water: {
    id: 'water',
    name: 'מי מעיין טהורים',
    shortDesc: 'מים חיים מהנהר ומלוכדי העננים. משקים ומפריחים אדמה צמאה.',
    color: '#63c5ff',
    hex: 0x63c5ff,
  },
  rune: {
    id: 'rune',
    name: 'אבני רונה עתיקות',
    shortDesc: 'שרידים מגולפים מהשעון העתיק ומהמערה. נדרשים לשדרוגים מתקדמים.',
    color: '#c9a6ff',
    hex: 0xc9a6ff,
  },
  seed: {
    id: 'seed',
    name: 'זרעי פלא',
    shortDesc: 'זרעים נדירים שנולדים בגינות פורחות ובשרידי העמק.',
    color: '#8ff2b4',
    hex: 0x8ff2b4,
  },
};

export interface BlueprintTierInfo {
  name: string;
  desc: string;
  cost: Partial<ResourceInventory>;
}

export interface BlueprintMeta {
  id: BlueprintId;
  name: string;
  shortRole: string;
  accentColor: string;
  accentHex: number;
  synergyWith: BlueprintId[];
  tiers: [BlueprintTierInfo, BlueprintTierInfo, BlueprintTierInfo];
}

export const BLUEPRINTS: BlueprintMeta[] = [
  {
    id: 'bridge',
    name: 'גשר מעבר',
    shortRole: 'מחבר בין גדות הנחל ומאפשר לתושבים לחצות את העמק.',
    accentColor: '#7ef2c9',
    accentHex: 0x7ef2c9,
    synergyWith: ['lantern', 'bench'],
    tiers: [
      {
        name: 'גשר עץ וחבלים',
        desc: 'מעבר יציב מעל הזרם. פותח תנועה חופשית בין הכיכר ליער.',
        cost: { wood: 3, glow: 1 },
      },
      {
        name: 'גשר קשתות מואר',
        desc: 'קורות עץ מעוגלות עם עמודי עששיות שמאירים את המים בלילה.',
        cost: { wood: 3, glow: 2, rune: 1 },
      },
      {
        name: 'גשר קהילתי מפואר',
        desc: 'גשר עמק ראשי עם סככת עץ ומפרצי תצפית על הנחל.',
        cost: { wood: 4, glow: 2, rune: 2, seed: 1 },
      },
    ],
  },
  {
    id: 'lantern',
    name: 'פנס רוח וסולאר',
    shortRole: 'מאיר שבילי לילה, מפיג ערפל במערה ומזמין גחליליות.',
    accentColor: '#f5b971',
    accentHex: 0xf5b971,
    synergyWith: ['bench', 'resonance', 'bridge'],
    tiers: [
      {
        name: 'עמוד אור חמים',
        desc: 'פנס אבן ועץ שמאיר רדיוס רחב בלילה ומסייע בהתמצאות.',
        cost: { wood: 1, glow: 2 },
      },
      {
        name: 'פנס טורבינת רוח',
        desc: 'להבים מסתובבים ברוח המגבירים את טווח האור ומאיצים ספסלים סמוכים.',
        cost: { wood: 2, glow: 2, rune: 1 },
      },
      {
        name: 'מגדלור העמק',
        desc: 'עמוד אור קריסטלי המפיג ערפל סמיך וחושף שרידים נסתרים בקרבתו.',
        cost: { wood: 2, glow: 3, rune: 2 },
      },
    ],
  },
  {
    id: 'irrigator',
    name: 'אמת השקיה וגן',
    shortRole: 'מזרימה מים אל קרקע צמאה, מצמיחה צמחייה ומשנה את האקולוגיה.',
    accentColor: '#63c5ff',
    accentHex: 0x63c5ff,
    synergyWith: ['raincatcher', 'resonance'],
    tiers: [
      {
        name: 'תעלת השקיה חכמה',
        desc: 'מוליכת מים בסיסית שמרווה את הקרקע ומתחילה להצמיח עשבים וניצנים.',
        cost: { wood: 2, water: 2 },
      },
      {
        name: 'טחנת מים ומזרקה',
        desc: 'גלגל מים מסתובב המזרים חיים לרדיוס גדול ומצמיח שיחי פריחה.',
        cost: { wood: 3, water: 2, seed: 1 },
      },
      {
        name: 'גן הידראולי פורח',
        desc: 'מקדש גן מדורג שמחייה טרסות שלמות ומניב זרעי פלא באופן מחזורי.',
        cost: { wood: 3, water: 3, rune: 1, seed: 2 },
      },
    ],
  },
  {
    id: 'raincatcher',
    name: 'לוכד עננים וטל',
    shortRole: 'אוגר לחות ומי גשם ומזין מערכות השקיה בקרבתו.',
    accentColor: '#98e2ff',
    accentHex: 0x98e2ff,
    synergyWith: ['irrigator', 'resonance'],
    tiers: [
      {
        name: 'רשת ערפל תלת-רגלית',
        desc: 'לוכדת טיפות טל וגשם וממלאת את מלאי המים בהדרגה.',
        cost: { wood: 2, glow: 1, water: 1 },
      },
      {
        name: 'טורבינת עיבוי מנחושת',
        desc: 'מפיקה מים גם ברוח קלה ומזרימה צינור אוטומטי לאמות השקיה סמוכות.',
        cost: { wood: 2, water: 2, rune: 1 },
      },
      {
        name: 'מגדל שמיים ומאגר',
        desc: 'קולטן גבוה עם מפרשי רוח המזין את כל אזור הטרסה בלי תלות בגשם.',
        cost: { wood: 3, glow: 2, water: 2, rune: 2 },
      },
    ],
  },
  {
    id: 'bench',
    name: 'ספסל ומדורת מפגש',
    shortRole: 'יוצר לב חברתי שמושך אליו את התושבים ומשקם קשרים.',
    accentColor: '#e996b8',
    accentHex: 0xe996b8,
    synergyWith: ['lantern', 'bridge'],
    tiers: [
      {
        name: 'ספסל עץ ואבן',
        desc: 'מקום לשבת ולעצור ליד השביל; מאפשר מנוחה ושחזור אנרגיה.',
        cost: { wood: 2, glow: 1 },
      },
      {
        name: 'פינת מדורה מקורה',
        desc: 'ספסלים סביב אבן חום זוהרת. תושבים מגיעים לשוחח כאן בשעות הערב.',
        cost: { wood: 3, glow: 2, seed: 1 },
      },
      {
        name: 'ביתן סיפורי העמק',
        desc: 'פרגולה פתוחה עם מפת זיכרון חיה שמעצימה את חיוניות העמק.',
        cost: { wood: 4, glow: 2, rune: 1, seed: 2 },
      },
    ],
  },
  {
    id: 'resonance',
    name: 'מגדל תהודה ורוח',
    shortRole: 'מגביר המצאות סמוכות בשרשרת אנרגיה ומעיר שרידים עתיקים.',
    accentColor: '#c9a6ff',
    accentHex: 0xc9a6ff,
    synergyWith: ['lantern', 'raincatcher', 'irrigator'],
    tiers: [
      {
        name: 'פעמון רוח תהודתי',
        desc: 'ממיר רוח לתדרים עדינים ומאיץ קצב עבודה של המצאות קרובות.',
        cost: { wood: 1, glow: 2, rune: 1 },
      },
      {
        name: 'אובליסק גביש מרחף',
        desc: 'שולח קשתות אנרגיה גלויות לפנסים ולוכדי עננים בטווח 26 מטר.',
        cost: { wood: 2, glow: 3, rune: 2 },
      },
      {
        name: 'משואה הרמונית של העמק',
        desc: 'תחנת שדה מלאה שמסנכרנת אנרגיה, מאירה מרחקים ומאיצה צמיחה.',
        cost: { wood: 2, glow: 3, rune: 3, seed: 2 },
      },
    ],
  },
];

export const ZONES: Record<
  ZoneId,
  { name: string; subtitle: string; color: string }
> = {
  plaza: {
    name: 'כיכר הלב העתיקה',
    subtitle: 'מרכז הכפר השקט. מכאן יוצאים כל השבילים אל קצוות העמק.',
    color: '#7ef2c9',
  },
  river: {
    name: 'גדות הנחל החוצה',
    subtitle: 'מים קרירים זורמים מצפון לדרום וממתינים למעברים חדשים.',
    color: '#63c5ff',
  },
  forest: {
    name: 'יער הזוהר והצללים',
    subtitle: 'חופת עצים גבוהה שבה הרוח והאור מספרים סיפור בלי מילים.',
    color: '#a89dff',
  },
  cavern: {
    name: 'מערת הגבישים התהודתית',
    subtitle: 'נקיק בזלת צפון-מזרחי ובו גבישים רדומים הממתינים לאור ותהודה.',
    color: '#88e9ff',
  },
  ruins: {
    name: 'שרידי השעון העתיק',
    subtitle: 'שלושה עמודי רונה שבורים מהתקופה שבה העמק פעל כמערכת אחת.',
    color: '#d4b8ff',
  },
  terrace: {
    name: 'הטרסה היבשה',
    subtitle: 'רמה צחיחה בדרום-מערב שרק מחזור מים מתוכנן יכול להחזיר לה חיים.',
    color: '#f5b971',
  },
  island: {
    name: 'אי המפל החבוי',
    subtitle: 'אי מוקף זרם מזרחי ומפל צלול. שמור לממציאים שלא מפחדים לחקור.',
    color: '#8ff2b4',
  },
  frontier: {
    name: 'מרחבי הספר האינסופיים',
    subtitle: 'ארץ פרא פתוחה ללא גבול — רכסים, מונוליתים עתיקים, נבגי קמילה ומשאבים נדירים.',
    color: '#f5b971',
  },
};

export const BIOME_PRESETS: Record<BiomePresetId, BiomePresetMeta> = {
  verdant: {
    id: 'verdant',
    name: 'עמק ירוק עשיר',
    desc: 'אחו פורח, יערות אלון זוהרים וזרם מים רגוע עם איום קמילה מאוזן.',
    accentColor: '#7ef2c9',
    grassHex: 0x478052,
    forestHex: 0x33664b,
    rockHex: 0x6f7a76,
    skyTintHex: 0x7ebde0,
    waterHex: 0x2c8da1,
    riverAmpScale: 1.0,
    hillScale: 1.0,
    blightRate: 1.0,
  },
  arid_winds: {
    id: 'arid_winds',
    name: 'מדבר רוחות ומצוקים',
    desc: 'רמות טרקוטה, רכסי סלע תלולים, רוחות חזקות וקמילה תוקפנית יותר.',
    accentColor: '#f5b971',
    grassHex: 0xa48554,
    forestHex: 0x687246,
    rockHex: 0x8b6e58,
    skyTintHex: 0xc2ab8e,
    waterHex: 0x357a85,
    riverAmpScale: 0.72,
    hillScale: 1.38,
    blightRate: 1.28,
  },
  mystic_night: {
    id: 'mystic_night',
    name: 'יער לילה מכושף',
    desc: 'אווירת בין-ערביים מסתורית, קריסטלים שופעים, אך רוחות צל צפופות יותר.',
    accentColor: '#c9a6ff',
    grassHex: 0x2f595a,
    forestHex: 0x21444e,
    rockHex: 0x4b556b,
    skyTintHex: 0x52699c,
    waterHex: 0x26658c,
    riverAmpScale: 1.05,
    hillScale: 1.15,
    blightRate: 1.35,
  },
  archipelago: {
    id: 'archipelago',
    name: 'ארכיפלג נהרות ואיים',
    desc: 'מישורי מים רחבים, נהרות מתפתלים ואיים פראיים מלאי זרעים ומי מעיין.',
    accentColor: '#63c5ff',
    grassHex: 0x428862,
    forestHex: 0x2e6e58,
    rockHex: 0x697c7e,
    skyTintHex: 0x82c7e6,
    waterHex: 0x259bb8,
    riverAmpScale: 1.65,
    hillScale: 0.65,
    blightRate: 0.9,
  },
};

export interface NpcPatrolStop {
  x: number;
  z: number;
  pause: number;
  activity: string;
}

export const NPC_PATROL_ROUTES: Record<NpcId, NpcPatrolStop[]> = {
  noa: [
    { x: -6, z: -15, pause: 5, activity: 'בודקת שרטוטי גשר' },
    { x: 2.2, z: -14, pause: 5.5, activity: 'סוקרת את קורות הגדה' },
    { x: -13, z: 6, pause: 5, activity: 'מבקרת במרכז הכיכר' },
    { x: -2.5, z: 45, pause: 5.5, activity: 'בוחנת את אבני המעבר בדרום' },
  ],
  mika: [
    { x: 40, z: -20, pause: 5, activity: 'מסיירת בשביל היער' },
    { x: 56, z: -42, pause: 6, activity: 'מקשיבה להד המערה' },
    { x: 47, z: -4, pause: 5, activity: 'בודקת את עצי הזוהר' },
    { x: 31, z: -15, pause: 5, activity: 'מתקרבת לשפת הנחל' },
  ],
  tali: [
    { x: -52, z: 46, pause: 6, activity: 'בודקת לחות בטרסה' },
    { x: -64, z: 57, pause: 5.5, activity: 'מטפחת זרעים עתיקים' },
    { x: -37, z: 29, pause: 4.5, activity: 'מסיירת במעלה השביל' },
    { x: -24, z: 14, pause: 5, activity: 'עוצרת בשולי הכיכר' },
  ],
  oren: [
    { x: -12, z: 14, pause: 5.5, activity: 'מתכנן את הכיכר' },
    { x: -22, z: -6, pause: 5, activity: 'בודק את בתי הכפר' },
    { x: -32, z: -25, pause: 5, activity: 'משקיף אל השרידים' },
    { x: -15, z: 2, pause: 5.5, activity: 'סוקר את מצפן העמק' },
  ],
};

export const VALLEY_BLIGHT_SPOTS: Array<{ id: string; x: number; z: number; hp: number; radius: number }> = [
  { id: 'blight_south_bend', x: 30, z: 32, hp: 2, radius: 7.5 },
  { id: 'blight_nw_ridge', x: -42, z: -34, hp: 2, radius: 7.5 },
  { id: 'blight_ne_edge', x: 52, z: -46, hp: 2, radius: 7.5 },
];

export const INITIAL_SECRETS: SecretDiscovery[] = [
  {
    id: 'secret_cavern_crystal',
    title: 'לב מערת הגבישים',
    zone: 'cavern',
    x: 72,
    z: -68,
    lore: 'כשהאור פוגע בנטיפי הבזלת, מתגלה חריטה: "לא נוצרנו לחיות בצל, אלא ללמוד איך אור נוגע באבן."',
    reward: { glow: 3, rune: 2 },
    discovered: false,
  },
  {
    id: 'secret_ruins_sundial',
    title: 'שעון העונות של השוזרים',
    zone: 'ruins',
    x: -66,
    z: -62,
    lore: 'שלושת עמודי הרונה סובבים יחד ומגלים את שרטוט המים הקדום — העמק תמיד שגשג רק כשרוח, מים ואדם התחברו יחד.',
    reward: { rune: 3, seed: 2 },
    discovered: false,
  },
  {
    id: 'secret_waterfall_shrine',
    title: 'אבן המעיין באי החבוי',
    zone: 'island',
    x: 56,
    z: 50,
    lore: 'מאחורי רסס המפל חבוי תא זרעים עתיק שנשמר מאז היובש הגדול. הזרעים עדיין נושמים.',
    reward: { seed: 3, water: 3 },
    discovered: false,
  },
  {
    id: 'secret_terrace_root',
    title: 'שורש הזיכרון היבש',
    zone: 'terrace',
    x: -74,
    z: 62,
    lore: 'מתחת לאדמה הסדוקה של הטרסה חבוי גזע מאובן ובתוכו אבני רונה שספגו טל במשך מאות שנים.',
    reward: { wood: 3, rune: 2 },
    discovered: false,
  },
  {
    id: 'secret_forest_arch',
    title: 'מעגל הגחליליות העתיק',
    zone: 'forest',
    x: 68,
    z: -12,
    lore: 'כאן ישבו פעם שומרי היער לפני שהגשר נקרע. אבן המצפן עדיין מכוונת אל הכיכר.',
    reward: { glow: 2, seed: 2, wood: 2 },
    discovered: false,
  },
];

export const COMMUNITY_PROJECTS_DATA: CommunityProjectState[] = [
  {
    id: 'proj_grand_arch',
    title: 'מעבר האחדות בנחל',
    desc: 'פרויקט משותף עם נעה ואורן: שיקום רציף האבן המרכזי וחיבור גדות הנחל בפעמוני רוח.',
    stage: 0,
    maxStages: 3,
    x: MAIN_BRIDGE_POS.x - 10,
    z: MAIN_BRIDGE_POS.z + 5,
    requirements: [
      { label: 'שלב 1: יסודות אבן וקורות עץ', cost: { wood: 4, rune: 1 } },
      { label: 'שלב 2: תאורת נהר ואבן רונה', cost: { glow: 3, rune: 2 } },
      { label: 'שלב 3: קשת פורחת על הגדה', cost: { wood: 3, seed: 2 }, minVitality: 35 },
    ],
  },
  {
    id: 'proj_water_conservatory',
    title: 'חממת הזרעים של הטרסה',
    desc: 'פרויקט עם טלי: מערכת אגירה והנבטה שהופכת את הטרסה למקור חיים לכל העמק.',
    stage: 0,
    maxStages: 3,
    x: -54,
    z: 46,
    requirements: [
      { label: 'שלב 1: תעלת אבן אוגרת', cost: { wood: 3, water: 3 } },
      { label: 'שלב 2: מסגרת זכוכית וקריסטל', cost: { glow: 3, seed: 2 } },
      { label: 'שלב 3: מערכת מחזור מלאה', cost: { water: 3, rune: 2, seed: 2 }, minVitality: 45 },
    ],
  },
  {
    id: 'proj_observatory',
    title: 'מצפה הכוכבים והתהודה',
    desc: 'פרויקט עם מיקה: אובליסק שמיים בכיכר המרכזית שמראה את הדופק החי של העמק כולו.',
    stage: 0,
    maxStages: 3,
    x: -6,
    z: -14,
    requirements: [
      { label: 'שלב 1: בסיס תהודה משולש', cost: { wood: 3, rune: 2 } },
      { label: 'שלב 2: עדשת אור-ירח ממוקדת', cost: { glow: 4, rune: 2 } },
      { label: 'שלב 3: משואת שמיים קהילתית', cost: { glow: 3, rune: 3, seed: 2 }, minVitality: 60 },
    ],
  },
];

export interface NpcProfile {
  id: NpcId;
  name: string;
  title: string;
  color: string;
  accentHex: number;
  homeX: number;
  homeZ: number;
  questId: string;
  questTitle: string;
  questTarget: { x: number; z: number; radius: number };
  acceptableBlueprints: BlueprintId[];
  favoredGift: ResourceType;
  personality: string;
}

export const NPCS_BASE: NpcProfile[] = [
  {
    id: 'noa',
    name: 'נעה',
    title: 'שוזרת שבילים',
    color: '#f29eb9',
    accentHex: 0xf29eb9,
    homeX: 1,
    homeZ: -15,
    questId: 'quest_bridge',
    questTitle: 'לחבר את שתי הגדות',
    questTarget: { x: MAIN_BRIDGE_POS.x, z: MAIN_BRIDGE_POS.z, radius: 13 },
    acceptableBlueprints: ['bridge'],
    favoredGift: 'wood',
    personality: 'סבלנית, פרקטית ורגישה לריחוק בין אנשים. שונאת הבטחות ריקות, מעריכה כנות.',
  },
  {
    id: 'mika',
    name: 'מיקה',
    title: 'שומרת אור וחוקרת מערות',
    color: '#b4a3ff',
    accentHex: 0xb4a3ff,
    homeX: 40,
    homeZ: -20,
    questId: 'quest_light',
    questTitle: 'אור עדין ביער ובפתח המערה',
    questTarget: { x: 48, z: -26, radius: 16 },
    acceptableBlueprints: ['lantern', 'resonance'],
    favoredGift: 'glow',
    personality: 'מופנמת, פואטית וסקרנית. אוהבת את הלילה אך מפחדת שהעמק יישכח בחשכה.',
  },
  {
    id: 'tali',
    name: 'טלי',
    title: 'בוטנאית אוספת זרעים',
    color: '#7ef2c9',
    accentHex: 0x7ef2c9,
    homeX: -48,
    homeZ: 42,
    questId: 'quest_garden',
    questTitle: 'להחזיר מים וחיים לטרסה',
    questTarget: { x: -58, z: 52, radius: 18 },
    acceptableBlueprints: ['irrigator', 'raincatcher'],
    favoredGift: 'water',
    personality: 'עקשנית, חדה ומחוברת לאדמה. לא רוצה שיעשו עבורה טובה — רוצה שותפות מחשבה.',
  },
  {
    id: 'oren',
    name: 'אורן',
    title: 'חרש וארכיטקט קהילה',
    color: '#f5b971',
    accentHex: 0xf5b971,
    homeX: -12,
    homeZ: 16,
    questId: 'quest_gather',
    questTitle: 'ליצור לב מפגש מחודש בכיכר',
    questTarget: { x: -12, z: 6, radius: 16 },
    acceptableBlueprints: ['bench', 'lantern'],
    favoredGift: 'rune',
    personality: 'אדם של ידיים טובות שלמד לבנות הכול חוץ מזמן פנוי לאנשים. מחפש משמעות מחברת.',
  },
];

export interface DialogueChoice {
  id: string;
  label: string;
  tone: 'empathy' | 'curious' | 'practical';
  trustDelta?: number;
  moodDelta?: number;
  responseText: string;
  rememberNote?: string;
  action?: 'take_promise' | 'renegotiate' | 'release_promise' | 'gift_menu' | 'close';
  nextNodeId?: string;
}

export interface DialogueNode {
  id: string;
  getText: (ctx: {
    trust: number;
    conversations: number;
    questDone: boolean;
    promiseStatus: string | null;
    secretsCount: number;
    cavernLit: boolean;
    vitality: number;
    lastTone: string | null;
    remembered: string[];
  }) => string;
  choices: DialogueChoice[];
}

export const DIALOGUE_TREES: Record<NpcId, Record<string, DialogueNode>> = {
  noa: {
    root: {
      id: 'root',
      getText: (c) => {
        if (c.questDone) {
          return c.conversations > 2
            ? 'אתה יודע, מאז שבנית את המעבר אני רואה את אורן ומיקה נפגשים באמצע הגשר כמעט כל ערב. מה דעתך — עכשיו כשהצדדים מחוברים, הגשר צריך גם תאורה או שדרוג?'
            : 'הנחל כבר לא מפריד בינינו. שים לב איך האנשים חוצים עכשיו לבד אל היער ואל הכיכר — זה לא רק עץ וחבלים, זה שינה את כל הקצב של העמק.';
        }
        if (c.promiseStatus === 'overdue') {
          return 'הזמן שדיברנו עליו חלף ולא חזרת, אבל טוב שבאת עכשיו. בשביל לקחת אחריות לא צריך להיות מושלם — מספיק להגיד בכנות איפה הדברים עומדים. מה קורה עם הגשר?';
        }
        if (c.promiseStatus === 'active') {
          return 'אני זוכרת שלקחת על עצמך לחבר את הגדות. אם חסרים לך ענפים או גביש אור-ירח, אפשר לעצור רגע ולחשוב מחדש — לא חייבים לרוץ לבד.';
        }
        if (c.lastTone === 'empathy') {
          return 'עדיין מהדהד לי איך הקשבת בפעם הקודמת. הגשר השבור הזה הוא לא רק בעיית מעבר — אנשים בצד היער ובצד הכיכר הפסיקו לשמוע זה את זה.';
        }
        return 'הזרם חתך את השביל הראשי כבר לפני שתי עונות. אפשר לדלג בין אבני המעבר בדרום, אבל כל עוד לב העמק חצוי, אף אחד לא עובר בקלות. איך תרצה לגשת לזה?';
      },
      choices: [
        {
          id: 'noa_deep',
          label: 'לשאול מה באמת השתנה מאז שהגשר נפל',
          tone: 'empathy',
          trustDelta: 0.5,
          moodDelta: 6,
          rememberNote: 'התעניינת בסיפור האנושי שמאחורי הגשר השבור.',
          responseText:
            'לפני שהנהר עלה על גדותיו, מיקה הייתה יורדת מהיער בכל ערב להביא אור. היום כל אחד תקוע בצד שלו. אם תבנה גשר — ואם נשדרג אותו בהמשך — נחזיר לא רק דרך, אלא שגרה.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'noa_explore',
          label: 'לשאול על קיצורי דרך וסודות מעבר לנהר',
          tone: 'curious',
          trustDelta: 0.3,
          moodDelta: 4,
          rememberNote: 'שאלת על שבילי הנחל והאי הדרומי.',
          responseText:
            'בדרום הרחוק יש סלעי מעבר שאפשר לדלג עליהם, וליד המפל המזרחי מסתתר אי שאף אחד לא חצה אליו שנים. תשתמש בפעימת התהודה (Q) — הקרקע תזכיר לך מה חבוי שם.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'noa_promise',
          label: 'לקחת אחריות על בניית המעבר ולסמן יעד',
          tone: 'practical',
          trustDelta: 0.3,
          moodDelta: 5,
          action: 'take_promise',
          rememberNote: 'התחייבת בגלוי לבנות את המעבר בנחל.',
          responseText:
            'מעולה. אני לא מצפה לנסים בין רגע — רק לשותפות הוגנת. אם התוכנית תתעכב, פשוט חזור לדבר איתי.',
        },
        {
          id: 'noa_gift',
          label: 'לשתף חומר מהתיק או לתאם מחדש',
          tone: 'practical',
          action: 'gift_menu',
          responseText: 'בוא נראה מה יש לך בתיק ומה יכול לעזור לנו עכשיו.',
        },
      ],
    },
    follow_up: {
      id: 'follow_up',
      getText: () => 'אם יש לך זמן, בחר איך נתקדם מכאן — כל צעד קטן משנה את הקצב.',
      choices: [
        {
          id: 'noa_commit_after',
          label: 'אני לוקח על עצמי לבנות את הגשר',
          tone: 'practical',
          trustDelta: 0.3,
          action: 'take_promise',
          responseText: 'תודה. נתראה כשהקורות יפגשו את הגדה השנייה.',
        },
        {
          id: 'noa_reneg',
          label: 'אני צריך לשנות זמנים / לתאם מחדש',
          tone: 'empathy',
          action: 'renegotiate',
          responseText: 'מעריכה שאמרת מראש. עדיף תוכנית מציאותית על שקט מביך.',
        },
        {
          id: 'noa_bye',
          label: 'אמשיך לחקור את הסביבה עכשיו',
          tone: 'curious',
          action: 'close',
          responseText: 'לך בשקט. השביל מחכה.',
        },
      ],
    },
  },
  mika: {
    root: {
      id: 'root',
      getText: (c) => {
        if (c.cavernLit) {
          return 'ראיתי את האור שלך חודר לתוך מערת הגבישים! כל החריטות על הבזלת התעוררו. אתה לא רק בונה פנסים — אתה מעיר זיכרונות שהעמק שכח.';
        }
        if (c.questDone) {
          return 'האור ביער רך ומזמין עכשיו. לא מסנוור, לא מבטל את החשכה — אלא הופך את הלילה למקום שאפשר לנשום בו. ניסית לחבר פנס למגדל תהודה?';
        }
        if (c.promiseStatus === 'overdue') {
          return 'הלילה ירד שוב והשביל עדיין חשוך, אבל אני רואה שחזרת. עצם זה שלא נעלמת אומר הרבה יותר ממה שאתה חושב.';
        }
        return 'היער של מזרח העמק מתעורר באמת רק בשקיעה. אבל בלי פנס רוח או מגדל תהודה עדין, אף אחד לא מעז להיכנס עד למערת הגבישים שבצפון. מה מסקרן אותך ביער?';
      },
      choices: [
        {
          id: 'mika_cavern',
          label: 'לשאול על מערת הגבישים שבצפון-מזרח',
          tone: 'curious',
          trustDelta: 0.5,
          moodDelta: 7,
          rememberNote: 'שוחחת עם מיקה על סודות מערת הגבישים.',
          responseText:
            'פתח המערה אפוף ערפל כבד. אם תציב פנס רוח קרוב לכניסה — או תשדר פעימת תהודה (Q) — הערפל יתפזר והנטיפים ינצנצו. בפנים תמצא אבני רונה נדירות וכתובת עתיקה.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'mika_feelings',
          label: 'להקשיב למה שהיער מסמל עבורה',
          tone: 'empathy',
          trustDelta: 0.6,
          moodDelta: 8,
          rememberNote: 'הקשבת לפחד של מיקה שהעמק יהפוך למנוכר.',
          responseText:
            'אנשים חושבים שאני אוהבת בדידות. האמת? אני פשוט אוהבת שקט שיש בו נוכחות של עוד מישהו שלא ממהר. פנס ליד ספסל יוצר בדיוק את התחושה הזו.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'mika_promise',
          label: 'להתחייב להאיר את שביל היער',
          tone: 'practical',
          trustDelta: 0.3,
          action: 'take_promise',
          responseText: 'אחכה לראות את הזוהר הראשון בין העצים.',
        },
        {
          id: 'mika_gift',
          label: 'לשתף חומרים מהתיק',
          tone: 'practical',
          action: 'gift_menu',
          responseText: 'תן לי לראות מה אספת בדרך.',
        },
      ],
    },
    follow_up: {
      id: 'follow_up',
      getText: () => 'היער מקשיב למי שמאט את הצעד. מה תרצה לעשות הלאה?',
      choices: [
        {
          id: 'mika_promise_2',
          label: 'אקח אחריות על הארת היער',
          tone: 'practical',
          action: 'take_promise',
          responseText: 'נהדר. פנס רוח או מגדל תהודה יעשו פלאים.',
        },
        {
          id: 'mika_reneg',
          label: 'לתאם מחדש או לשחרר התחייבות',
          tone: 'empathy',
          action: 'renegotiate',
          responseText: 'תודה על השקיפות. מותר לשנות כיוון.',
        },
        {
          id: 'mika_bye',
          label: 'יוצא לבדוק את המערה והעצים',
          tone: 'curious',
          action: 'close',
          responseText: 'אם תשמע הדהוד בקירות, זו המערה שעונה לך.',
        },
      ],
    },
  },
  tali: {
    root: {
      id: 'root',
      getText: (c) => {
        if (c.questDone && c.vitality >= 55) {
          return 'תראה מה קרה לטרסה! האדמה הסדוקה שותה מים, הפרחים נפתחים והאיילים מתחילים להציץ מלמטה. זו שרשרת מים אמיתית — לוכד עננים, אמת השקיה, ואנחנו ביחד.';
        }
        if (c.questDone) {
          return 'הטיפות הראשונות הגיעו לשורשים. אבל כדי להפריח את הטרסה כולה ולהצמיח זרעי פלא, שווה לחבר לוכד עננים קרוב לאמת ההשקיה ולשדרג אותם.';
        }
        if (c.promiseStatus === 'overdue') {
          return 'השמש ממשיכה לייבש את הרמה, ואני עדיין מחכה. אני מעריכה שחזרת לדבר גלוי במקום להיעלם — בוא נבדוק יחד מה חסר כדי להזיז את המים.';
        }
        return 'כולם מביאים דלי מים וחושבים שפתרו בעיה. דלי מתאדה תוך שעה! מה שחסר על הטרסה הגבוהה הזאת הוא מערכת: אמת השקיה שמחוברת ללוכד עננים, כדי שהאדמה תשתקם מעצמה.';
      },
      choices: [
        {
          id: 'tali_system',
          label: 'לשאול איך לחבר לוכד עננים ואמת השקיה',
          tone: 'curious',
          trustDelta: 0.45,
          moodDelta: 6,
          rememberNote: 'התייעצת עם טלי על הנדסת מחזור המים של הטרסה.',
          responseText:
            'כשבונים לוכד עננים ואמת השקיה במרחק של עד 26 מטר זה מזה, נוצר קו זרימה קבוע! ואם מוסיפים מגדל תהודה, אפילו בימים יבשים המים זורמים. כשהצמחייה מגיעה לפריחה מלאה, נולדים זרעי פלא.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'tali_empathy',
          label: 'לשאול למה היא נאבקת דווקא על הקרקע הכי יבשה',
          tone: 'empathy',
          trustDelta: 0.6,
          moodDelta: 8,
          rememberNote: 'הבנת שטלי מאמינה שדווקא המקום הכי מוזנח ראוי לטיפול.',
          responseText:
            'קל מאוד לגדל פרחים על גדת הנחל. האתגר האמיתי — והסיפוק האמיתי — הוא לקחת מדרון שכולם ויתרו עליו, ולהראות שאפשר להשיב לו חיים בסבלנות.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'tali_promise',
          label: 'להתחייב לבנות מערכת השקיה לטרסה',
          tone: 'practical',
          action: 'take_promise',
          responseText: 'קדימה. בוא נחבר כאן מים שישארו לאורך זמן.',
        },
        {
          id: 'tali_gift',
          label: 'להציע מים או זרעים מהתיק',
          tone: 'practical',
          action: 'gift_menu',
          responseText: 'בוא נבדוק מה בתיק מתאים עכשיו לאדמה.',
        },
      ],
    },
    follow_up: {
      id: 'follow_up',
      getText: () => 'כל טיפה במקום הנכון שווה יותר מעשר הבטחות. איך נמשיך?',
      choices: [
        {
          id: 'tali_commit_2',
          label: 'אני מתחייב לבנות את ההשקיה על הטרסה',
          tone: 'practical',
          action: 'take_promise',
          responseText: 'מעולה. שים לב לצבע האדמה כשההשקיה מתחילה לפעול!',
        },
        {
          id: 'tali_reneg',
          label: 'לעדכן תוכנית / לשחרר זמנית',
          tone: 'empathy',
          action: 'renegotiate',
          responseText: 'בסדר גמור. כנות עדיפה על חיפזון.',
        },
        {
          id: 'tali_bye',
          label: 'אצא לאסוף מים וענפים',
          tone: 'curious',
          action: 'close',
          responseText: 'אל תשכח לבדוק את המדרון הדרום-מערבי.',
        },
      ],
    },
  },
  oren: {
    root: {
      id: 'root',
      getText: (c) => {
        if (c.questDone && c.vitality >= 50) {
          return 'שמת לב שהכיכר כבר לא רק מעבר מנקודה לנקודה? יש ספסל, יש אור, והאנשים עוצרים בלי שתהיה שום תקלה לתקן. זה הדבר הכי קשה שבניתי בחיים.';
        }
        if (c.questDone) {
          return 'הספסל עומד בכיכר ומזמין לעצור. אם נוסיף לידו פנס רוח או נשדרג אותו למדורת מפגש, התושבים יתחילו להגיע לכאן בערבים.';
        }
        if (c.promiseStatus === 'overdue') {
          return 'אחי, גם אני נוטה לדחות שיחות כשאני עסוק בלתקן דברים. העיקר שחזרת. בוא נתאם מתי ואיך יוצרים כאן מקום שאפשר פשוט להיות בו.';
        }
        return 'בניתי בתים, תיקנתי גגות, חיברתי קורות — אבל הכיכר הזו ריקה. אנשים מדברים רק כשמשהו נשבר. חסר לנו מקום מפגש: ספסל, מדורה או פנס שמזמין לעצור בלי סיבה.';
      },
      choices: [
        {
          id: 'oren_ruins',
          label: 'לשאול על השרידים העתיקים בצפון-מערב וכיצד משדרגים המצאות',
          tone: 'curious',
          trustDelta: 0.45,
          moodDelta: 6,
          rememberNote: 'למדת מאורן על עמודי הרונה ושדרוגי הרמה של כל המצאה.',
          responseText:
            'כל המצאה שאתה מציב בעולם ניתנת לשדרוג עד רמה 3! בשביל רמות מתקדמות תצטרך אבני רונה מהשרידים בצפון-מערב. לך לשם ותפעיל את שלושת עמודי האבן — העתיקות מתעוררות כשנוגעים בהן עם רוח ואנרגיה.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'oren_empathy',
          label: 'לדבר איתו על הלחץ לתקן הכול לבד',
          tone: 'empathy',
          trustDelta: 0.6,
          moodDelta: 8,
          rememberNote: 'אורן שיתף איתך את הקושי שלו לעצור ולנוח.',
          responseText:
            'כל החיים חשבתי שערך של אדם נמדד במה שהוא מספיק לתקן. רק לאחרונה הבנתי שמי שיושב ומקשיב רגע במרכז הכפר מחזיק את הקהילה לא פחות ממי שמחזיק פטיש.',
          nextNodeId: 'follow_up',
        },
        {
          id: 'oren_promise',
          label: 'להתחייב ליצור מקום מפגש בכיכר',
          tone: 'practical',
          action: 'take_promise',
          responseText: 'ידיים טובות יש לך. בוא נהפוך את הכיכר למקום חי.',
        },
        {
          id: 'oren_gift',
          label: 'לשתף משאב או אבן רונה',
          tone: 'practical',
          action: 'gift_menu',
          responseText: 'נראה מה נמצא אצלך בתיק.',
        },
      ],
    },
    follow_up: {
      id: 'follow_up',
      getText: () => 'בסוף המלאכה הכי חשובה היא מה שקורה בין אנשים. מה הצעד הבא?',
      choices: [
        {
          id: 'oren_commit_2',
          label: 'אבנה מקום מפגש ומדורה בכיכר',
          tone: 'practical',
          action: 'take_promise',
          responseText: 'מצוין. נסה לשלב ליד הספסל גם פנס רוח.',
        },
        {
          id: 'oren_reneg',
          label: 'לעדכן תוכנית / לשנות התחייבות',
          tone: 'empathy',
          action: 'renegotiate',
          responseText: 'אין בעיה בכלל. תיאום מחדש הוא חלק מבנייה נכונה.',
        },
        {
          id: 'oren_bye',
          label: 'ממשיך לחקור את העמק',
          tone: 'curious',
          action: 'close',
          responseText: 'שים לב לפרויקטים המשותפים כשתרצה לבנות בגדול.',
        },
      ],
    },
  },
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  {
    id: 'ach_first_spark',
    title: 'ניצוץ ראשון במלאכה',
    desc: 'הצבת את ההמצאה הראשונה שלך בשבילי העמק.',
    category: 'build',
    categoryLabel: 'בנייה',
    target: 1,
    reward: { wood: 2, glow: 1 },
  },
  {
    id: 'ach_build_streak',
    title: 'רצף בנייה הרמוני',
    desc: 'הקמת רצף של 4 המצאות פעילות ברחבי העמק.',
    category: 'build',
    categoryLabel: 'בנייה',
    target: 4,
    reward: { glow: 2, rune: 1 },
  },
  {
    id: 'ach_synergy_weaver',
    title: 'שוזר המערכות',
    desc: 'חיברת לפחות 2 קווי סינרגיה פעילים בין המצאות סמוכות.',
    category: 'build',
    categoryLabel: 'בנייה',
    target: 2,
    reward: { rune: 2 },
  },
  {
    id: 'ach_master_architect',
    title: 'אדריכל העמק',
    desc: 'שדרגת המצאה לרמה 3 המתקדמת ביותר.',
    category: 'mastery',
    categoryLabel: 'מומחיות',
    target: 1,
    reward: { seed: 2, rune: 2 },
  },
  {
    id: 'ach_pulse_seeker',
    title: 'קורא התדרים',
    desc: 'שידרת 3 גלי תהודה (Q) לסריקת משאבים ומסתורין.',
    category: 'explore',
    categoryLabel: 'חקירה',
    target: 3,
    reward: { glow: 1 },
  },
  {
    id: 'ach_cavern_light',
    title: 'מאיר המעמקים',
    desc: 'פיזרת את הערפל והארת את מערת הגבישים התהודתית.',
    category: 'explore',
    categoryLabel: 'חקירה',
    target: 1,
    reward: { glow: 2 },
  },
  {
    id: 'ach_ruins_awakener',
    title: 'מעיר השעון העתיק',
    desc: 'הדלקת את כל 3 עמודי הרונה בשרידים השקועים.',
    category: 'explore',
    categoryLabel: 'חקירה',
    target: 3,
    reward: { rune: 2 },
  },
  {
    id: 'ach_all_secrets',
    title: 'חוקר כל הסודות',
    desc: 'גילית את כל 5 הסודות העתיקים במפת העמק.',
    category: 'explore',
    categoryLabel: 'חקירה',
    target: 5,
    reward: { rune: 3, seed: 3 },
  },
  {
    id: 'ach_world_wanderer',
    title: 'נווד שבעת האזורים',
    desc: 'ביקרת בכל 7 אזורי העמק — מהכיכר ועד אי המפל החבוי.',
    category: 'explore',
    categoryLabel: 'חקירה',
    target: 7,
    reward: { water: 2, wood: 2 },
  },
  {
    id: 'ach_kindred_spirits',
    title: 'לב הקהילה',
    desc: 'השלמת את משימות כל 4 תושבי העמק: נעה, מיקה, טלי ואורן.',
    category: 'bond',
    categoryLabel: 'קהילה',
    target: 4,
    reward: { seed: 3, glow: 2 },
  },
  {
    id: 'ach_community_builder',
    title: 'בונה המונומנטים',
    desc: 'השלמת פרויקט קהילתי רב-שלבי עד לשלב 3/3.',
    category: 'bond',
    categoryLabel: 'קהילה',
    target: 1,
    reward: { rune: 2, seed: 2 },
  },
  {
    id: 'ach_valley_bloom',
    title: 'תחייה מלאה של העמק',
    desc: 'הבאת את מדד חיוניות העמק ל-80% ומעלה.',
    category: 'mastery',
    categoryLabel: 'מומחיות',
    target: 80,
    reward: { seed: 3, rune: 3 },
  },
];
