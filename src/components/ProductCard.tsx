import { Check, Heart, Plus, Star } from 'lucide-react';
import { formatINR } from '../data/catalog.ts';
import type { Product } from '../types/store.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface ProductCardProps {
  product: Product;
  justAddedId: string | null;
  isWishlisted: boolean;
  onSelect: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

export function ProductCard({
  product,
  justAddedId,
  isWishlisted,
  onSelect,
  onQuickAdd,
  onToggleWishlist,
}: ProductCardProps) {
  const isJustAdded = justAddedId === product.id;

  return (
    <article className="group flex flex-col bg-white border border-[#E5E4DF] rounded-xl overflow-hidden transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[#C9C8C2]">
      <div className="relative aspect-[4/3] w-full bg-[#F1F0ED] overflow-hidden">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="w-full h-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
          aria-label={`View details for ${product.name}`}
        >
          <ResilientImage
            src={product.image}
            alt={`${product.name} by ${product.brand}`}
            fallbackLabel={product.name}
            className="w-full h-full object-cover transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] group-hover:scale-[1.02]"
          />
        </button>

        <button
          type="button"
          onClick={() => onToggleWishlist(product.id)}
          aria-label={isWishlisted ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
          aria-pressed={isWishlisted}
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg bg-white/90 hover:bg-white border border-[#E5E4DF] text-[#141413] transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-[#1D4ED8]"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : 'text-[#575652]'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center justify-between gap-2 text-xs text-[#6B6A65]">
          <p className="truncate">
            <span>{product.categoryLabel}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{product.brand}</span>
            {product.tag && (
              <>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="text-[#1D4ED8] font-medium">{product.tag}</span>
              </>
            )}
          </p>
          <span className="inline-flex items-center gap-1 text-[#141413] font-mono tabular-nums shrink-0">
            <Star className="w-3.5 h-3.5 fill-[#141413] text-[#141413]" />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <div className="flex-1">
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] rounded"
          >
            <h3 className="font-display text-base font-semibold text-[#141413] leading-snug group-hover:text-[#1D4ED8] transition-colors">
              {product.name}
            </h3>
          </button>
          <p className="mt-1 text-xs text-[#6B6A65] line-clamp-1">{product.material}</p>
        </div>

        <div className="pt-3 border-t border-[#EFEFED] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[15px] font-medium text-[#141413] tabular-nums">
              {formatINR(product.price)}
            </span>
            <span className="text-[11px] text-[#6B6A65]">
              {product.inStock ? 'In Stock' : 'Restocking Soon'}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => onQuickAdd(product)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8] ${
              !product.inStock
                ? 'bg-[#F1F0ED] text-[#8E8D87] cursor-not-allowed'
                : isJustAdded
                  ? 'bg-[#15803D] text-white'
                  : 'bg-[#141413] text-white hover:bg-[#1D4ED8]'
            }`}
          >
            {!product.inStock ? (
              'Unavailable'
            ) : isJustAdded ? (
              <>
                <Check className="w-3.5 h-3.5" />
                Added
              </>
            ) : (
              <>
                <Plus className="w-3.5 h-3.5" />
                Add to Bag
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}
