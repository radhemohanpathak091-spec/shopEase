import { useEffect, useState } from 'react';
import { Check, Heart, Minus, Plus, Star, X } from 'lucide-react';
import { formatINR } from '../data/catalog.ts';
import type { Product } from '../types/store.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductDetailModalProps {
  product: Product | null;
  isWishlisted: boolean;
  onClose: () => void;
  onAddToCart: (product: Product, variant: string, quantity: number) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductDetailModal({
  product,
  isWishlisted,
  onClose,
  onAddToCart,
  onToggleWishlist,
}: ProductDetailModalProps) {
  const [selectedVariant, setSelectedVariant] = useState<string>('');
  const [quantity, setQuantity] = useState<number>(1);
  const [addedFeedback, setAddedFeedback] = useState<boolean>(false);

  useEffect(() => {
    if (product) {
      setSelectedVariant(product.variants[0] || '');
      setQuantity(1);
      setAddedFeedback(false);
    }
  }, [product]);

  useEffect(() => {
    if (!product) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [product, onClose]);

  if (!product) return null;

  const handleAdd = () => {
    if (!product.inStock) return;
    onAddToCart(product, selectedVariant || product.variants[0], quantity);
    setAddedFeedback(true);
    setTimeout(() => setAddedFeedback(false), 1400);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/45 backdrop-blur-[2px]"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="pdp-title"
    >
      <div
        className="relative w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white border border-[#E5E4DF] rounded-2xl shadow-xl grid grid-cols-1 md:grid-cols-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close product details"
          className="absolute top-4 right-4 z-10 w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 border border-[#E5E4DF] text-[#141413] hover:bg-[#F1F0ED] transition-colors focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="bg-[#F1F0ED] flex items-center justify-center p-6 md:p-8 min-h-[280px]">
          <div className="w-full aspect-[4/3] rounded-xl overflow-hidden bg-white">
            <ResilientImage
              src={product.image}
              alt={`${product.name} studio detail`}
              fallbackLabel={product.name}
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        <div className="p-6 sm:p-8 flex flex-col gap-5">
          <div>
            <div className="flex items-center gap-2 text-xs text-[#6B6A65]">
              <span>{product.categoryLabel}</span>
              <span aria-hidden="true">·</span>
              <span>{product.brand}</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono">{product.sku}</span>
            </div>
            <h2
              id="pdp-title"
              className="mt-2 font-display text-2xl font-semibold text-[#141413] tracking-tight"
            >
              {product.name}
            </h2>
            <div className="mt-2 flex items-center justify-between gap-4">
              <span className="font-mono text-xl font-medium text-[#141413] tabular-nums">
                {formatINR(product.price)}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[#575652] tabular-nums">
                <Star className="w-3.5 h-3.5 fill-[#141413] text-[#141413]" />
                <span className="font-medium text-[#141413]">{product.rating.toFixed(1)}</span>
                <span>({product.reviewCount} reviews)</span>
              </div>
            </div>
          </div>

          <p className="text-sm text-[#4A4945] leading-relaxed">{product.description}</p>

          <div className="space-y-4 pt-2 border-t border-[#EFEFED]">
            <div>
              <div className="flex items-center justify-between text-xs mb-2">
                <span className="font-medium text-[#141413]">{product.variantLabel}</span>
                <span className={product.inStock ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                  {product.inStock ? 'Ready to ship' : 'Currently out of stock'}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant) => {
                  const active = selectedVariant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      onClick={() => setSelectedVariant(variant)}
                      className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] ${
                        active
                          ? 'bg-[#141413] text-white border-[#141413]'
                          : 'bg-white text-[#141413] border-[#D6D5CF] hover:border-[#141413]'
                      }`}
                    >
                      {variant}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="inline-flex items-center border border-[#D6D5CF] rounded-lg bg-white">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  disabled={!product.inStock || quantity <= 1}
                  aria-label="Decrease quantity"
                  className="w-10 h-10 flex items-center justify-center text-[#141413] hover:bg-[#F8F8F7] disabled:opacity-40 rounded-l-lg"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-10 text-center font-mono text-sm tabular-nums text-[#141413]">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                  disabled={!product.inStock || quantity >= 20}
                  aria-label="Increase quantity"
                  className="w-10 h-10 flex items-center justify-center text-[#141413] hover:bg-[#F8F8F7] disabled:opacity-40 rounded-r-lg"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                type="button"
                disabled={!product.inStock}
                onClick={handleAdd}
                className={`flex-1 min-h-[42px] px-5 py-2.5 rounded-lg text-sm font-medium inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] ${
                  !product.inStock
                    ? 'bg-[#F1F0ED] text-[#8E8D87] cursor-not-allowed'
                    : addedFeedback
                      ? 'bg-[#15803D] text-white'
                      : 'bg-[#1D4ED8] text-white hover:bg-[#1E40AF]'
                }`}
              >
                {!product.inStock ? (
                  'Out of Stock'
                ) : addedFeedback ? (
                  <>
                    <Check className="w-4 h-4" />
                    Added to Bag
                  </>
                ) : (
                  `Add to Bag — ${formatINR(product.price * quantity)}`
                )}
              </button>

              <button
                type="button"
                onClick={() => onToggleWishlist(product.id)}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save to wishlist'}
                aria-pressed={isWishlisted}
                className={`w-11 h-11 flex items-center justify-center rounded-lg border transition-colors shrink-0 focus-visible:outline-2 focus-visible:outline-[#1D4ED8] ${
                  isWishlisted
                    ? 'border-[#FECACA] bg-[#FEF2F2] text-[#DC2626]'
                    : 'border-[#D6D5CF] bg-white text-[#575652] hover:border-[#141413] hover:text-[#141413]'
                }`}
              >
                <Heart className={`w-4 h-4 ${isWishlisted ? 'fill-[#DC2626]' : ''}`} />
              </button>
            </div>
          </div>

          <div className="pt-4 border-t border-[#EFEFED]">
            <h3 className="text-xs font-semibold text-[#141413] mb-2.5">
              Material & Technical Specifications
            </h3>
            <dl className="divide-y divide-[#EFEFED]">
              {product.specs.map((spec) => (
                <div key={spec.label} className="py-2 flex items-center justify-between gap-4 text-xs">
                  <dt className="text-[#6B6A65]">{spec.label}</dt>
                  <dd className="text-[#141413] font-medium text-right">{spec.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </div>
    </div>
  );
}
