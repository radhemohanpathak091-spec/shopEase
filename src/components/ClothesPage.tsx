import { useMemo, useState } from 'react';
import { ArrowLeft, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { ClothesSubCategory, Product } from '../types/store.ts';
import { ProductCard } from './ProductCard.tsx';

type ClothesTabFilter = 'all' | ClothesSubCategory;
type ClothesPriceFilter = 'all' | 'under-900' | '900-1200' | 'over-1200';
type ClothesSortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

interface ClothesPageProps {
  products: Product[];
  justAddedId: string | null;
  wishlistIds: string[];
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const SUBCATEGORY_TABS: { id: ClothesTabFilter; label: string }[] = [
  { id: 'all', label: 'All Clothes' },
  { id: 'jeans', label: 'Jeans' },
  { id: 'korean-pants', label: 'Korean Pants' },
  { id: 'linen-pants', label: 'Linen Pants' },
  { id: 'shirts', label: 'Shirts' },
  { id: 'outerwear', label: 'Jackets & Knits' },
];

export function ClothesPage({
  products,
  justAddedId,
  wishlistIds,
  onBackToHome,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: ClothesPageProps) {
  const [subCategory, setSubCategory] = useState<ClothesTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<ClothesPriceFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<ClothesSortOption>('featured');

  const clothesProducts = useMemo(
    () => products.filter((item) => item.category === 'apparel'),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = clothesProducts.filter((item) => {
      if (subCategory !== 'all' && item.subCategory !== subCategory) return false;
      if (inStockOnly && !item.inStock) return false;
      if (priceRange === 'under-900' && item.price >= 900) return false;
      if (priceRange === '900-1200' && (item.price < 900 || item.price > 1200)) return false;
      if (priceRange === 'over-1200' && item.price <= 1200) return false;
      if (q) {
        const haystack =
          `${item.name} ${item.brand} ${item.material} ${item.description} ${item.tag || ''} ${item.subCategory || ''}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sortBy === 'price-asc') {
      list = [...list].sort((a, b) => a.price - b.price);
    } else if (sortBy === 'price-desc') {
      list = [...list].sort((a, b) => b.price - a.price);
    } else if (sortBy === 'rating') {
      list = [...list].sort((a, b) => b.rating - a.rating);
    }

    return list;
  }, [clothesProducts, subCategory, searchQuery, priceRange, inStockOnly, sortBy]);

  const hasActiveFilters =
    subCategory !== 'all' ||
    searchQuery.trim() !== '' ||
    priceRange !== 'all' ||
    inStockOnly ||
    sortBy !== 'featured';

  const handleResetFilters = () => {
    setSubCategory('all');
    setSearchQuery('');
    setPriceRange('all');
    setInStockOnly(false);
    setSortBy('featured');
  };

  const bottomsProducts = useMemo(
    () =>
      clothesProducts.filter(
        (item) =>
          item.subCategory === 'jeans' ||
          item.subCategory === 'korean-pants' ||
          item.subCategory === 'linen-pants',
      ),
    [clothesProducts],
  );

  const shirtProducts = useMemo(
    () => clothesProducts.filter((item) => item.subCategory === 'shirts'),
    [clothesProducts],
  );

  const outerwearProducts = useMemo(
    () => clothesProducts.filter((item) => item.subCategory === 'outerwear'),
    [clothesProducts],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12 space-y-10">
      {/* Page Header */}
      <section className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-6 sm:p-10">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-2xl">
            <button
              type="button"
              onClick={onBackToHome}
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-[#1E4E6E] bg-[#E1F0FA] hover:bg-[#CBE4F6] border border-[#A8D4F0] rounded-lg transition-colors whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
            <p className="mt-5 text-xs font-medium text-[#2D6F99]">
              shopEase Wardrobe · Jeans, Korean Pants, Linen Pants & Four Shirt Styles
            </p>
            <h1
              className="mt-2 font-display font-semibold tracking-tight text-[#2C1A12] leading-[1.1]"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
            >
              Everyday Clothes Collection
            </h1>
            <p className="mt-3 text-[15px] text-[#63493B] leading-relaxed">
              Explore structured selvedge & vintage jeans, pleated wide-leg Korean pants, breathable flax linen trousers, and four signature shirt cuts designed for year-round wear.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EFE5D6] text-xs">
            <div>
              <p className="text-[#7C6354]">Pieces</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {clothesProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Bottoms</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {bottomsProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Shirt Styles</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {shirtProducts.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section aria-label="Clothes filters" className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7C6354] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search jeans, Korean pants, linen pants, Oxford, Cuban, flannel..."
              aria-label="Search clothes"
              className="w-full h-11 pl-10 pr-10 text-sm bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:bg-[#FFFDF9] focus:border-[#6B3F26]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear clothes search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#7C6354] hover:text-[#2C1A12] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Clothes sub-categories"
            className="flex items-center gap-1 p-1 bg-[#F3EBDD] rounded-lg overflow-x-auto"
          >
            {SUBCATEGORY_TABS.map((tab) => {
              const active = subCategory === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSubCategory(tab.id)}
                  className={`min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#FFFDF9] text-[#2C1A12] shadow-xs'
                      : 'text-[#63493B] hover:text-[#2C1A12]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EFE5D6]">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#63493B] mr-1">
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filters:
            </span>

            <select
              aria-label="Filter clothes by price"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value as ClothesPriceFilter)}
              className="h-10 px-3 text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
            >
              <option value="all">All Prices (₹599 – ₹1,499)</option>
              <option value="under-900">Under ₹900</option>
              <option value="900-1200">₹900 – ₹1,200</option>
              <option value="over-1200">₹1,201 – ₹1,499</option>
            </select>

            <button
              type="button"
              aria-pressed={inStockOnly}
              onClick={() => setInStockOnly((prev) => !prev)}
              className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                inStockOnly
                  ? 'bg-[#E1F0FA] text-[#1E4E6E] border-[#A8D4F0]'
                  : 'bg-[#FBF6EE] text-[#2C1A12] border-[#E4D8C6] hover:border-[#6B3F26]'
              }`}
            >
              In Stock Only
            </button>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-[#2D6F99] hover:text-[#1E4E6E] whitespace-nowrap shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#7C6354] tabular-nums">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
            </span>
            <select
              aria-label="Sort clothes"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as ClothesSortOption)}
              className="h-10 px-3 text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
            >
              <option value="featured">Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="rating">Highest Rated</option>
            </select>
          </div>
        </div>
      </section>

      {/* Catalog Views */}
      <div
        key={hasActiveFilters ? `filtered-${subCategory}-${priceRange}-${sortBy}-${inStockOnly}` : 'curated'}
        className="animate-panel-enter"
      >
      {hasActiveFilters ? (
        filteredProducts.length === 0 ? (
          <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-12 text-center">
            <h2 className="font-display text-lg font-semibold text-[#2C1A12]">
              No clothes match those filters
            </h2>
            <p className="text-sm text-[#63493B] mt-1.5 max-w-md mx-auto">
              Clear your search or switch back to All Clothes to browse jeans, Korean pants, linen pants, and shirts.
            </p>
            <button
              type="button"
              onClick={handleResetFilters}
              className="mt-5 min-h-[42px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
            >
              Show All Clothes
            </button>
          </div>
        ) : (
          <section aria-label="Filtered clothes results">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {filteredProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  justAddedId={justAddedId}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelect={onSelectProduct}
                  onQuickAdd={onQuickAdd}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        )
      ) : (
        <div className="space-y-12">
          {/* Section A: Jeans, Korean Pants & Linen Pants */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
              <div>
                <p className="text-xs font-medium text-[#2D6F99]">Bottoms Collection</p>
                <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                  Jeans, Korean Pants & Linen Pants
                </h2>
              </div>
              <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                {bottomsProducts.length} silhouettes
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {bottomsProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  justAddedId={justAddedId}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelect={onSelectProduct}
                  onQuickAdd={onQuickAdd}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>

          {/* Section B: Four Signature Shirt Styles */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
              <div>
                <p className="text-xs font-medium text-[#2D6F99]">Four Collar & Fabric Cuts</p>
                <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                  Oxford, Cuban, Mandarin Linen & Flannel Shirts
                </h2>
              </div>
              <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                {shirtProducts.length} shirt styles
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {shirtProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  justAddedId={justAddedId}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelect={onSelectProduct}
                  onQuickAdd={onQuickAdd}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>

          {/* Section C: Outerwear & Knitwear */}
          <section className="space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
              <div>
                <p className="text-xs font-medium text-[#2D6F99]">Layering Staples</p>
                <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                  Jackets, Overshirts & Heavyweight Knits
                </h2>
              </div>
              <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                {outerwearProducts.length} layers
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {outerwearProducts.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  justAddedId={justAddedId}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelect={onSelectProduct}
                  onQuickAdd={onQuickAdd}
                  onToggleWishlist={onToggleWishlist}
                />
              ))}
            </div>
          </section>
        </div>
      )}
      </div>

      {/* Fit & Care Reference Strip */}
      <section className="border-t border-[#E4D8C6] pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">01</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Denim & Korean Waist Sizing
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Jeans and Seoul pleated Korean pants are cut in waist sizes 28 to 36 with true-to-size mid-rise proportions and relaxed leg room.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">02</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Breathable Linen & Cotton
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            All shirts and linen trousers are pre-washed to prevent shrinkage and soften the weave from the very first wear.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">03</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Easy Exchanges & Free Delivery
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Free shipping on orders above ₹4,999 across India, backed by straightforward 30-day size exchanges and returns.
          </p>
        </div>
      </section>
    </div>
  );
}
