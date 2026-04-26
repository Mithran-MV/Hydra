"use client";

// Zero-JS CSS/SVG fallback that renders instantly while the WebGL scene loads.
// Gives the page real presence on first paint.
export function HydraFallback() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(1200px 700px at 50% 70%, rgba(55,255,158,0.18), transparent 60%), radial-gradient(900px 500px at 50% 35%, rgba(55,255,158,0.08), transparent 65%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(500px 300px at 50% 90%, rgba(5,6,10,0.9), transparent 70%)",
        }}
      />

      <svg
        viewBox="0 0 800 700"
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] h-[85%] opacity-70"
        preserveAspectRatio="xMidYMid meet"
      >
        <defs>
          <linearGradient id="neck" x1="0" y1="1" x2="0" y2="0">
            <stop offset="0%" stopColor="#0a1a14" />
            <stop offset="55%" stopColor="#0f2a20" />
            <stop offset="100%" stopColor="#37ff9e" />
          </linearGradient>
          <radialGradient id="core" cx="0.5" cy="0.5" r="0.6">
            <stop offset="0%" stopColor="#8effc8" />
            <stop offset="45%" stopColor="#37ff9e" />
            <stop offset="100%" stopColor="#052b1a" />
          </radialGradient>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="8" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* coiled base */}
        <g opacity="0.6" filter="url(#glow)">
          <ellipse cx="400" cy="620" rx="240" ry="28" fill="#37ff9e" opacity="0.15" />
          <ellipse cx="400" cy="625" rx="180" ry="16" fill="#37ff9e" opacity="0.25" />
        </g>

        {/* necks (5) — serpentine S-curves */}
        {[
          { d: "M 400 580 Q 360 450 320 380 Q 280 310 300 230", x: 300, y: 230, delay: 0 },
          { d: "M 400 580 Q 430 430 440 340 Q 450 250 420 180", x: 420, y: 180, delay: 0.2 },
          { d: "M 400 580 Q 510 470 540 380 Q 570 290 520 220", x: 520, y: 220, delay: 0.4 },
          { d: "M 400 580 Q 300 480 240 400 Q 180 320 220 240", x: 220, y: 240, delay: 0.6 },
          { d: "M 400 580 Q 390 470 395 370 Q 400 270 405 200", x: 405, y: 200, delay: 0.8 },
        ].map((neck, i) => (
          <g key={i}>
            <path
              d={neck.d}
              fill="none"
              stroke="url(#neck)"
              strokeWidth="22"
              strokeLinecap="round"
              opacity="0.9"
            />
            <path
              d={neck.d}
              fill="none"
              stroke="#37ff9e"
              strokeWidth="3"
              strokeLinecap="round"
              opacity="0.75"
              filter="url(#glow)"
              style={{
                animation: `dashPulse 3.6s ease-in-out ${neck.delay}s infinite`,
              }}
            />
            {/* head */}
            <g
              transform={`translate(${neck.x} ${neck.y})`}
              style={{
                transformOrigin: "center",
                animation: `headFloat 4s ease-in-out ${neck.delay}s infinite`,
              }}
            >
              <ellipse
                cx="0"
                cy="0"
                rx="26"
                ry="18"
                fill="#071510"
                stroke="#37ff9e"
                strokeWidth="1.2"
              />
              <polygon
                points="0,8 -16,22 16,22"
                fill="#0a1a14"
                stroke="#37ff9e"
                strokeWidth="0.8"
              />
              <circle
                cx="-7"
                cy="-3"
                r="2.5"
                fill="#37ff9e"
                filter="url(#glow)"
              />
              <circle
                cx="7"
                cy="-3"
                r="2.5"
                fill="#37ff9e"
                filter="url(#glow)"
              />
              {/* horns */}
              <polygon
                points="-10,-12 -22,-30 -6,-16"
                fill="#081010"
                stroke="#37ff9e"
                strokeWidth="0.6"
                opacity="0.85"
              />
              <polygon
                points="10,-12 22,-30 6,-16"
                fill="#081010"
                stroke="#37ff9e"
                strokeWidth="0.6"
                opacity="0.85"
              />
            </g>
          </g>
        ))}

        {/* beast's heart */}
        <circle
          cx="400"
          cy="570"
          r="48"
          fill="url(#core)"
          filter="url(#glow)"
          opacity="0.9"
        />
        <circle
          cx="400"
          cy="570"
          r="18"
          fill="#b4ffdd"
          filter="url(#glow)"
          style={{ animation: "heartbeat 2.4s ease-in-out infinite" }}
        />
      </svg>

      <style jsx>{`
        @keyframes heartbeat {
          0%, 100% { opacity: 0.9; transform: scale(1); transform-origin: 400px 570px; }
          45% { opacity: 1; }
          50% { transform: scale(1.15); }
        }
        @keyframes headFloat {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes dashPulse {
          0%, 100% { opacity: 0.25; }
          50% { opacity: 0.95; }
        }
      `}</style>
    </div>
  );
}
