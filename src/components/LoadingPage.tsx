import { ShoppingBag } from 'lucide-react';

interface LoadingPageProps {
  isVisible: boolean;
  title?: string;
  label?: string;
  mode?: 'initial' | 'transition';
}

export function LoadingPage({
  isVisible,
  title = 'shopEase',
  label = 'Preparing clothes, accessories & tech goods...',
  mode = 'initial',
}: LoadingPageProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${title}`}
      aria-hidden={!isVisible}
      className={`fixed inset-0 z-50 flex flex-col items-center justify-center px-6 transition-all duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] ${
        mode === 'transition' ? 'bg-[#FBF6EE]/95 backdrop-blur-xs' : 'bg-[#FBF6EE]'
      } ${
        isVisible ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-[1.01] pointer-events-none'
      }`}
    >
      <div className="w-full max-w-sm bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-8 text-center shadow-sm animate-modal-enter">
        <div className="w-12 h-12 mx-auto rounded-xl bg-[#E1F0FA] border border-[#A8D4F0] flex items-center justify-center mb-5 animate-pulse">
          <ShoppingBag className="w-5 h-5 text-[#1E4E6E]" strokeWidth={1.75} />
        </div>

        <h2 className="font-display text-2xl font-bold tracking-tight text-[#2C1A12]">
          {title}
        </h2>
        <p className="mt-2 text-xs text-[#63493B] leading-relaxed">
          {label}
        </p>

        <div className="mt-6 h-1.5 w-full bg-[#F3EBDD] rounded-full overflow-hidden">
          <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-[#6B3F26] via-[#2D6F99] to-[#68B0DF] animate-loader-bar" />
        </div>
      </div>
    </div>
  );
}
