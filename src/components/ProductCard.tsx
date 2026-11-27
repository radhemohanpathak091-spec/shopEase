import { Check, Heart, Plus, Star } from 'lucide-react';
import { formatINR } from '../lib/catalogData.ts';
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
    <article className="group flex flex-col bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl overflow-hidden transition-transform duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] hover:-translate-y-0.5 hover:border-[#CBB9A0]">
      <div className="relative aspect-[4/3] w-full bg-[#F3EBDD] overflow-hidden">
        <button
          type="button"
          onClick={() => onSelect(product)}
          className="w-full h-full text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CA4D6]"
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
          className="absolute top-3 right-3 w-10 h-10 flex items-center justify-center rounded-lg bg-[#FFFDF9]/95 hover:bg-[#E1F0FA] border border-[#E4D8C6] hover:border-[#A8D4F0] text-[#2C1A12] transition-colors shadow-xs focus-visible:outline-2 focus-visible:outline-[#5CA4D6]"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              isWishlisted ? 'fill-[#DC2626] text-[#DC2626]' : 'text-[#63493B]'
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col flex-1 p-5 gap-3">
        <div className="flex items-center justify-between gap-2 text-xs text-[#7C6354]">
          <p className="truncate">
            <span>{product.categoryLabel}</span>
            <span aria-hidden="true" className="mx-1.5">·</span>
            <span>{product.brand}</span>
            {product.tag && (
              <>
                <span aria-hidden="true" className="mx-1.5">·</span>
                <span className="text-[#2D6F99] font-medium">{product.tag}</span>
              </>
            )}
          </p>
          <span className="inline-flex items-center gap-1 text-[#2C1A12] font-mono tabular-nums shrink-0">
            <Star className="w-3.5 h-3.5 fill-[#6B3F26] text-[#6B3F26]" />
            {product.rating.toFixed(1)}
          </span>
        </div>

        <div className="flex-1">
          <button
            type="button"
            onClick={() => onSelect(product)}
            className="text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CA4D6] rounded"
          >
            <h3 className="font-display text-base font-semibold text-[#2C1A12] leading-snug group-hover:text-[#6B3F26] transition-colors">
              {product.name}
            </h3>
          </button>
          <p className="mt-1 text-xs text-[#63493B] line-clamp-1">{product.material}</p>
        </div>

        <div className="pt-3 border-t border-[#EFE5D6] flex items-center justify-between gap-3">
          <div className="flex flex-col">
            <span className="font-mono text-[15px] font-medium text-[#2C1A12] tabular-nums">
              {formatINR(product.price)}
            </span>
            <span className="text-[11px] text-[#7C6354]">
              {product.inStock ? 'In Stock' : 'Restocking Soon'}
            </span>
          </div>

          <button
            type="button"
            disabled={!product.inStock}
            onClick={() => onQuickAdd(product)}
            className={`inline-flex items-center justify-center gap-1.5 min-h-[40px] px-4 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CA4D6] ${
              !product.inStock
                ? 'bg-[#F3EBDD] text-[#9A8476] cursor-not-allowed'
                : isJustAdded
                  ? 'bg-[#15803D] text-white'
                  : 'bg-[#6B3F26] text-[#FFFDF9] hover:bg-[#4E2C19]'
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
