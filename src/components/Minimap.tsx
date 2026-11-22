import { NPCS_BASE, VALLEY_BLIGHT_SPOTS } from '../game/data';
import { riverCenterX, WORLD_HALF } from '../game/terrain';
import type { HudSnapshot } from '../game/types';

interface MinimapProps {
  hud: HudSnapshot;
  onNavigateTo: (x: number, z: number) => void;
}

export function Minimap({ hud, onNavigateTo }: MinimapProps) {
  const size = 132;
  const toMap = (val: number) => ((val + WORLD_HALF) / (WORLD_HALF * 2)) * size;
  const fromMap = (px: number) => (px / size) * (WORLD_HALF * 2) - WORLD_HALF;

  // Build river SVG path
  const riverPts: string[] = [];
  for (let z = -WORLD_HALF; z <= WORLD_HALF; z += 12) {
    const x = riverCenterX(z);
    riverPts.push(`${riverPts.length === 0 ? 'M' : 'L'} ${toMap(x).toFixed(1)} ${toMap(z).toFixed(1)}`);
  }

  const px = Math.max(6, Math.min(size - 6, toMap(hud.playerPos.x)));
  const pz = Math.max(6, Math.min(size - 6, toMap(hud.playerPos.z)));
  const isOutInFrontier =
    Math.abs(hud.playerPos.x) > WORLD_HALF || Math.abs(hud.playerPos.z) > WORLD_HALF;

  return (
    <div className="pointer-events-auto fixed top-20 left-3 md:left-4 z-20 hidden sm:flex flex-col items-center gap-1">
      <div
        className="hud-surface rounded-2xl p-1.5 cursor-crosshair relative overflow-hidden"
        title="לחץ על המפה לניווט מהיר"
        onClick={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          const mx = e.clientX - rect.left - 6;
          const mz = e.clientY - rect.top - 6;
          onNavigateTo(fromMap(mx), fromMap(mz));
        }}
      >
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="rounded-xl bg-[#102b2f]">
          {/* Subtle biome zones */}
          <circle cx={toMap(-62)} cy={toMap(54)} r={18} fill="#7d5f3d" fillOpacity="0.45" />
          <circle cx={toMap(72)} cy={toMap(-68)} r={14} fill="#365c6e" fillOpacity="0.55" />
          <circle cx={toMap(-66)} cy={toMap(-62)} r={13} fill="#5c5973" fillOpacity="0.45" />
          <circle cx={toMap(56)} cy={toMap(50)} r={10} fill="#37785c" fillOpacity="0.55" />

          {/* River */}
          <path d={riverPts.join(' ')} fill="none" stroke="#3da8c4" strokeWidth="6" strokeLinecap="round" />

          {/* Valley Blight spots */}
          {VALLEY_BLIGHT_SPOTS.map((spot) => (
            <circle
              key={spot.id}
              cx={toMap(spot.x)}
              cy={toMap(spot.z)}
              r={3.5}
              fill="#e8488a"
              fillOpacity={hud.activeBlightCount > 0 ? 0.65 : 0.15}
            />
          ))}

          {/* Placed buildings */}
          {hud.buildings.map((b) => (
            <rect
              key={b.id}
              x={toMap(b.x) - 2}
              y={toMap(b.z) - 2}
              width={4}
              height={4}
              rx={1}
              fill="#7ef2c9"
            />
          ))}

          {/* Discovered Portals */}
          {(hud.discoveredPortals || []).map((p) => {
            const mx = Math.max(5, Math.min(size - 5, toMap(p.x)));
            const mz = Math.max(5, Math.min(size - 5, toMap(p.z)));
            return (
              <polygon
                key={p.id}
                points={`${mx},${mz - 4} ${mx + 4},${mz} ${mx},${mz + 4} ${mx - 4},${mz}`}
                fill="#88e9ff"
                stroke="#08161a"
                strokeWidth="1"
              />
            );
          })}

          {/* Patrolling NPCs (live coordinates) */}
          {NPCS_BASE.map((n) => {
            const livePos = hud.npcPositions?.[n.id];
            const nx = toMap(livePos ? livePos.x : n.homeX);
            const nz = toMap(livePos ? livePos.z : n.homeZ);
            return (
              <circle
                key={n.id}
                cx={nx}
                cy={nz}
                r={3.2}
                fill={n.color}
                stroke="#08161a"
                strokeWidth="1"
              />
            );
          })}

          {/* Player marker with heading */}
          <g transform={`translate(${px}, ${pz}) rotate(${(-hud.playerYaw * 180) / Math.PI + 180})`}>
            <polygon points="0,-6 4,4 0,2 -4,4" fill="#ffffff" stroke="#08161a" strokeWidth="1" />
          </g>
        </svg>
        <div className="text-[10px] text-[#9ec0bd] text-center mt-1 font-medium font-mono-num truncate max-w-[132px]">
          {isOutInFrontier
            ? `${hud.subBiomeName} · ${hud.distanceFromOrigin}מ'`
            : 'מפת העמק · קליק לתנועה'}
        </div>
      </div>
    </div>
  );
}
