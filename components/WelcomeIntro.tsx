import React, { useEffect, useState } from "react";

// ✅ Best: transparent PNG for true background removal


// If you only have JPG:
// import SamasaLogo from "../assets/samasa-logo.jpg";

type WelcomeIntroProps = {
  onDone: () => void;
  totalMs?: number; // default 5000
};

const WelcomeIntro: React.FC<WelcomeIntroProps> = ({ onDone, totalMs = 5000 }) => {
  const [mounted, setMounted] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    const fadeMs = 550;

    const t0 = window.setTimeout(() => setMounted(true), 20); // fade in
    const t1 = window.setTimeout(() => setExiting(true), Math.max(0, totalMs - fadeMs)); // fade out
    const t2 = window.setTimeout(() => onDone(), totalMs); // remove overlay

    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [onDone, totalMs]);

  const entering = mounted && !exiting;

  return (
    <div
      className={[
        "fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden",
        "transition-opacity duration-500",
        entering ? "opacity-100" : "opacity-0",
      ].join(" ")}
      aria-hidden="true"
    >
      {/* Blur real page behind */}
      <div className="absolute inset-0 bg-white/85 backdrop-blur-2xl" />

      {/* Soft shimmer */}
      <div className="absolute inset-0 opacity-60 animate-[samasaShimmer_3.6s_ease-in-out_infinite] bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.95),transparent_45%),radial-gradient(circle_at_80%_70%,rgba(255,255,255,0.75),transparent_50%)]" />

      <div className="relative z-10 flex flex-col items-center justify-center px-6">
        {/* 3D stage */}
        <div className="samasa-stage">
          {/* orbit shadow + depth glow live behind spinner */}
          <div className="samasa-depth" />

          {/* 3D spinner */}
          <div className="samasa-spinner">
            <img
              src="/assets/samasa-logo.png" alt="SAMASA Logo"
              draggable={false}
              className={[
                "w-60 h-60 md:w-72 md:h-72 object-contain select-none",
                // keep logo crisp; the depth/shadow is handled behind it
                "drop-shadow-[0_10px_22px_rgba(15,23,42,0.12)]",
                // If using JPG and background is light, this MAY help slightly (not perfect):
                // "mix-blend-multiply",
              ].join(" ")}
            />

            {/* subtle gloss */}
            <div className="samasa-shine" />
          </div>
        </div>

        <div
          className={[
            "mt-5 text-center text-slate-900 font-semibold tracking-wide",
            "text-base md:text-xl",
            "transition-all duration-700 ease-out",
            entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3",
          ].join(" ")}
        >
          WELCOME TO OUR OFFICIAL WEBSITE
        </div>

        {/* small colored dots */}
        <div className="mt-5 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-blue-600 animate-[samasaDot_900ms_ease-in-out_infinite]" />
           <span className="w-2 h-2 rounded-full bg-yellow-400 animate-[samasaDot_900ms_ease-in-out_infinite_150ms]" />
             <span className="w-2 h-2 rounded-full bg-red-600 animate-[samasaDot_900ms_ease-in-out_infinite_300ms]" />
            </div>

      </div>

      <style>{`
        .samasa-stage {
          position: relative;
          perspective: 1100px;
          width: fit-content;
          height: fit-content;
        }

        /* Depth glow + orbiting shadow layer (behind logo) */
        .samasa-depth {
          position: absolute;
          inset: -22px;
          z-index: 0;
          pointer-events: none;
        }

        /* halo glow */
        .samasa-depth::before {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 999px;
          background: radial-gradient(
            circle at 50% 50%,
            rgba(15, 23, 42, 0.10),
            rgba(255, 255, 255, 0) 60%
          );
          filter: blur(18px);
          opacity: 0.55;
          transform: translateZ(-30px);
          animation: samasaGlowPulse 2.2s ease-in-out infinite;
        }

        /* orbiting shadow (moves around) */
        .samasa-depth::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          width: 260px;
          height: 80px;
          transform: translate(-50%, -50%);
          border-radius: 999px;
          background: radial-gradient(
            ellipse at center,
            rgba(15, 23, 42, 0.22),
            rgba(15, 23, 42, 0.00) 70%
          );
          filter: blur(14px);
          opacity: 0.35;
          animation: samasaShadowOrbit 2.2s linear infinite;
        }

        .samasa-spinner {
          position: relative;
          z-index: 2;
          transform-style: preserve-3d;
          will-change: transform;
          animation: samasaSpinFastSlow 2.2s linear infinite;
        }

        .samasa-shine {
          pointer-events: none;
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(
            120deg,
            rgba(255,255,255,0.00) 20%,
            rgba(255,255,255,0.55) 40%,
            rgba(255,255,255,0.00) 60%
          );
          transform: translateZ(22px);
          opacity: 0.55;
          mix-blend-mode: screen;
          animation: samasaShineMove 2.2s ease-in-out infinite;
        }

        /* Fast then slow 3D spin */
        @keyframes samasaSpinFastSlow {
          0%   { transform: rotateX(0deg) rotateY(0deg) scale(0.92); }
          20%  { transform: rotateX(14deg) rotateY(140deg) scale(1.00); }
          45%  { transform: rotateX(0deg) rotateY(290deg) scale(0.97); }
          70%  { transform: rotateX(-10deg) rotateY(335deg) scale(1.00); }
          100% { transform: rotateX(0deg) rotateY(360deg) scale(0.92); }
        }

        /* Shadow ellipse orbit path (subtle) */
        @keyframes samasaShadowOrbit {
          0% {
            transform: translate(-50%, -50%) translateX(0px) translateY(18px) scale(1);
            opacity: 0.28;
          }
          25% {
            transform: translate(-50%, -50%) translateX(22px) translateY(8px) scale(0.95);
            opacity: 0.36;
          }
          50% {
            transform: translate(-50%, -50%) translateX(0px) translateY(-6px) scale(0.88);
            opacity: 0.22;
          }
          75% {
            transform: translate(-50%, -50%) translateX(-22px) translateY(8px) scale(0.95);
            opacity: 0.34;
          }
          100% {
            transform: translate(-50%, -50%) translateX(0px) translateY(18px) scale(1);
            opacity: 0.28;
          }
        }

        @keyframes samasaGlowPulse {
          0%, 100% { opacity: 0.45; transform: translateZ(-30px) scale(0.98); }
          50% { opacity: 0.75; transform: translateZ(-30px) scale(1.05); }
        }

        @keyframes samasaShineMove {
          0%   { transform: translateZ(22px) translateX(-45%); opacity: .30; }
          45%  { transform: translateZ(22px) translateX(45%);  opacity: .80; }
          100% { transform: translateZ(22px) translateX(-45%); opacity: .30; }
        }

        @keyframes samasaShimmer {
          0%, 100% { opacity: .45; filter: blur(0px); }
          50% { opacity: .75; filter: blur(1px); }
        }

        @keyframes samasaDot {
          0%, 100% { transform: translateY(0px); opacity: .35; }
          50% { transform: translateY(-4px); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default WelcomeIntro;
