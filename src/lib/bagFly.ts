export interface BagFlyDetail {
  startX: number;
  startY: number;
  image: string;
  label: string;
}

export const BAG_FLY_EVENT = 'shopease:bag-fly';

export function triggerBagFly(
  sourceEl: HTMLElement | null | undefined,
  image: string,
  label: string,
) {
  if (typeof window === 'undefined' || !sourceEl) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const rect = sourceEl.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return;

  const detail: BagFlyDetail = {
    startX: rect.left + rect.width / 2,
    startY: rect.top + rect.height / 2,
    image,
    label,
  };

  window.dispatchEvent(new CustomEvent<BagFlyDetail>(BAG_FLY_EVENT, { detail }));
}
