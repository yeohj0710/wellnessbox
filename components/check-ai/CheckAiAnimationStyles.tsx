export function CheckAiAnimationStyles() {
  return (
    <style jsx global>{`
      @keyframes pulseGlow {
        0%,
        100% {
          opacity: 0.7;
        }
        50% {
          opacity: 1;
        }
      }
      @keyframes dotBounce {
        0%,
        80%,
        100% {
          transform: translateY(0);
          opacity: 0.7;
        }
        40% {
          transform: translateY(-6px);
          opacity: 1;
        }
      }
    `}</style>
  );
}
