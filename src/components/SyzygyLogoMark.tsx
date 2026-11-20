import React from 'react';

interface SyzygyLogoMarkProps {
  size?: number;
  className?: string;
}

/**
 * Animated angular celestial alignment emblem for Syzygy:
 * - Precision octagonal astrolabe frame
 * - Counter-rotating ecliptic & lunar orbital tracks (lime + sky-blue planetary nodes)
 * - Diagonal syzygy alignment axis with warm-orange eclipsed solar core
 */
export const SyzygyLogoMark: React.FC<SyzygyLogoMarkProps> = ({
  size = 32,
  className = '',
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 overflow-visible ${className}`}
      aria-hidden="true"
    >
      {/* Chamfered Angular Octagonal Frame */}
      <polygon
        points="12,2 28,2 38,12 38,28 28,38 12,38 2,28 2,12"
        fill="#1B1233"
        stroke="#46337A"
        strokeWidth="1.25"
        className="transition-colors duration-200 group-hover:stroke-[#B8FF3B]"
      />

      {/* Precision Cardinal Degree Ticks */}
      <line x1="20" y1="2.5" x2="20" y2="5.5" stroke="#6A58A3" strokeWidth="1" />
      <line x1="20" y1="34.5" x2="20" y2="37.5" stroke="#6A58A3" strokeWidth="1" />
      <line x1="2.5" y1="20" x2="5.5" y2="20" stroke="#6A58A3" strokeWidth="1" />
      <line x1="34.5" y1="20" x2="37.5" y2="20" stroke="#6A58A3" strokeWidth="1" />

      {/* Syzygy Diagonal Alignment Axis */}
      <line
        x1="8"
        y1="32"
        x2="32"
        y2="8"
        stroke="#382864"
        strokeWidth="1"
        strokeDasharray="2 2"
      />

      {/* Outer Orbit Ring + Vibrant Lime Node (Slow Clockwise Revolution) */}
      <g className="syzygy-orbit-cw">
        <circle
          cx="20"
          cy="20"
          r="13.2"
          stroke="#38BDF8"
          strokeOpacity="0.4"
          strokeWidth="1"
          strokeDasharray="16 5 4 5"
        />
        {/* Angular Diamond Planet Node (Lime) */}
        <polygon points="20,4.2 22.6,6.8 20,9.4 17.4,6.8" fill="#B8FF3B" />
      </g>

      {/* Inner Orbit Ring + Sky-Blue Satellite Node (Counter-Clockwise Revolution) */}
      <g className="syzygy-orbit-ccw">
        <circle
          cx="20"
          cy="20"
          r="8.8"
          stroke="#B8FF3B"
          strokeOpacity="0.55"
          strokeWidth="1"
          strokeDasharray="10 4"
        />
        {/* Satellite Square Node (Sky Blue) */}
        <rect x="27" y="18.2" width="3.6" height="3.6" fill="#38BDF8" />
        {/* Opposite Minor Conjunction Marker */}
        <circle cx="11.2" cy="20" r="1.4" fill="#F6F3FF" />
      </g>

      {/* Central Eclipsed Core (Warm Orange Syzygy Flare) */}
      <g className="syzygy-core-breathe">
        <circle cx="20" cy="20" r="4.6" fill="#FF7A2F" />
        {/* Crisp Lunar Eclipse Crescent Cutout */}
        <circle cx="21.7" cy="18.9" r="3.4" fill="#120B24" />
        {/* Center Pinpoint Star */}
        <rect
          x="19.2"
          y="19.2"
          width="1.6"
          height="1.6"
          transform="rotate(45 20 20)"
          fill="#B8FF3B"
        />
      </g>
    </svg>
  );
};
