import type { CSSProperties, ReactNode } from 'react';
import { useFlowReveal } from '../lib/useFlowReveal.ts';

interface FlowRevealProps {
  children: ReactNode;
  className?: string;
  delayMs?: number;
  variant?: 'up' | 'left' | 'right' | 'scale';
}

export function FlowReveal({
  children,
  className = '',
  delayMs = 0,
  variant = 'up',
}: FlowRevealProps) {
  const { ref, isVisible } = useFlowReveal<HTMLDivElement>();

  const hiddenTransform =
    variant === 'left'
      ? 'translate3d(-16px, 0, 0)'
      : variant === 'right'
        ? 'translate3d(16px, 0, 0)'
        : variant === 'scale'
          ? 'scale(0.96) translate3d(0, 12px, 0)'
          : 'translate3d(0, 18px, 0)';

  const style: CSSProperties = {
    opacity: isVisible ? 1 : 0,
    transform: isVisible ? 'translate3d(0, 0, 0) scale(1)' : hiddenTransform,
    transitionProperty: 'opacity, transform',
    transitionDuration: '520ms',
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: `${Math.min(delayMs, 360)}ms`,
    willChange: isVisible ? 'auto' : 'opacity, transform',
  };

  return (
    <div ref={ref} style={style} className={className}>
      {children}
    </div>
  );
}
