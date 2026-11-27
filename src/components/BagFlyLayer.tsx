import { useEffect, useState, type CSSProperties, type RefObject } from 'react';
import { BAG_FLY_EVENT, type BagFlyDetail } from '../lib/bagFly.ts';

interface FlyingToken {
  id: number;
  startX: number;
  startY: number;
  dx: number;
  dy: number;
  image: string;
  label: string;
}

interface BagFlyLayerProps {
  targetRef: RefObject<HTMLButtonElement | null>;
  onLand?: () => void;
}

export function BagFlyLayer({ targetRef, onLand }: BagFlyLayerProps) {
  const [tokens, setTokens] = useState<FlyingToken[]>([]);

  useEffect(() => {
    let nextId = 1;
    const timers: number[] = [];

    const handleFly = (event: Event) => {
      const custom = event as CustomEvent<BagFlyDetail>;
      const detail = custom.detail;
      if (!detail || !targetRef.current) return;

      const targetRect = targetRef.current.getBoundingClientRect();
      if (targetRect.width === 0 && targetRect.height === 0) return;

      const targetX = targetRect.left + targetRect.width / 2;
      const targetY = targetRect.top + targetRect.height / 2;
      const id = nextId++;

      const token: FlyingToken = {
        id,
        startX: detail.startX,
        startY: detail.startY,
        dx: targetX - detail.startX,
        dy: targetY - detail.startY,
        image: detail.image,
        label: detail.label,
      };

      setTokens((prev) => [...prev.slice(-4), token]);

      const landTimer = window.setTimeout(() => {
        onLand?.();
      }, 460);

      const cleanupTimer = window.setTimeout(() => {
        setTokens((prev) => prev.filter((item) => item.id !== id));
      }, 580);

      timers.push(landTimer, cleanupTimer);
    };

    window.addEventListener(BAG_FLY_EVENT, handleFly);
    return () => {
      window.removeEventListener(BAG_FLY_EVENT, handleFly);
      timers.forEach((t) => window.clearTimeout(t));
    };
  }, [onLand, targetRef]);

  if (tokens.length === 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 pointer-events-none z-[70] overflow-hidden"
    >
      {tokens.map((token) => {
        const xStyle = {
          left: `${token.startX - 20}px`,
          top: `${token.startY - 20}px`,
          '--fly-x': `${token.dx}px`,
        } as CSSProperties;

        const yStyle = {
          '--fly-y': `${token.dy}px`,
        } as CSSProperties;

        return (
          <div key={token.id} style={xStyle} className="fixed animate-bag-fly-x">
            <div
              style={yStyle}
              className="w-10 h-10 rounded-full overflow-hidden border-2 border-[#6B3F26] bg-[#FFFDF9] shadow-lg animate-bag-fly-y"
            >
              <img
                src={token.image}
                alt={token.label}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
