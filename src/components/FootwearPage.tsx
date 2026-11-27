import { useMemo, useState } from 'react';
import { ArrowLeft, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { FootwearSubCategory, Product } from '../types/store.ts';
import { ProductCard } from './ProductCard.tsx';

type FootwearTabFilter = 'all' | FootwearSubCategory;
type FootwearPriceFilter = 'all' | 'under-1000' | '1000-1400' | 'over-1400';
type FootwearSortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

interface FootwearPageProps {
  products: Product[];
  justAddedId: string | null;
  wishlistIds: string[];
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const SUBCATEGORY_TABS: { id: FootwearTabFilter; label: string }[] = [
  { id: 'all', label: 'All Footwear' },
  { id: 'sneakers', label: 'Sneakers & Runners' },
  { id: 'loafers', label: 'Loafers' },
  { id: 'boots', label: 'Boots' },
  { id: 'slides', label: 'Slides & Sandals' },
];

export function FootwearPage({
  products,
  justAddedId,
  wishlistIds,
  onBackToHome,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: FootwearPageProps) {
  const [subCategory, setSubCategory] = useState<FootwearTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<FootwearPriceFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<FootwearSortOption>('featured');

  const footwearProducts = useMemo(
    () => products.filter((item) => item.category === 'footwear'),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = footwearProducts.filter((item) => {
      if (subCategory !== 'all' && item.subCategory !== subCategory) return false;
      if (inStockOnly && !item.inStock) return false;
      if (priceRange === 'under-1000' && item.price >= 1000) return false;
      if (priceRange === '1000-1400' && (item.price < 1000 || item.price > 1400)) return false;
      if (priceRange === 'over-1400' && item.price <= 1400) return false;
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
  }, [footwearProducts, subCategory, searchQuery, priceRange, inStockOnly, sortBy]);

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

  const sneakerProducts = useMemo(
    () => footwearProducts.filter((item) => item.subCategory === 'sneakers'),
    [footwearProducts],
  );

  const dressAndBootProducts = useMemo(
    () =>
      footwearProducts.filter(
        (item) => item.subCategory === 'loafers' || item.subCategory === 'boots',
      ),
    [footwearProducts],
  );

  const slideProducts = useMemo(
    () => footwearProducts.filter((item) => item.subCategory === 'slides'),
    [footwearProducts],
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
              className="inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-medium text-[#1E4E6E] bg-[#E1F0FA] hover:bg-[#CBE4F6] border border-[#A8D4F0] rounded-lg transition-colors whitespace-nowrap cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Home
            </button>
            <p className="mt-5 text-xs font-medium text-[#2D6F99]">
              shopEase Footwear · Sneakers, Suede Loafers, Chelsea Boots &amp; Cork Slides
            </p>
            <h1
              className="mt-2 font-display font-semibold tracking-tight text-[#2C1A12] leading-[1.1]"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
            >
              Crafted Footwear Collection
            </h1>
            <p className="mt-3 text-[15px] text-[#63493B] leading-relaxed">
              Step into full-grain calfskin sneakers, suede retro runners, Goodyear-welted Chelsea boots, Italian suede loafers, and contoured cork slides built for all-day comfort.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EFE5D6] text-xs">
            <div>
              <p className="text-[#7C6354]">Pairs</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {footwearProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Sneakers</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {sneakerProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Loafers &amp; Boots</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {dressAndBootProducts.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Filter & Search Toolbar */}
      <section aria-label="Footwear filters" className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-4 space-y-4">
        <div className="flex flex-col lg:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#7C6354] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search sneakers, runners, loafers, Chelsea boots, cork slides, suede..."
              aria-label="Search footwear"
              className="w-full h-11 pl-10 pr-10 text-sm bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:bg-[#FFFDF9] focus:border-[#6B3F26]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Clear footwear search"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#7C6354] hover:text-[#2C1A12] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div
            role="tablist"
            aria-label="Footwear sub-categories"
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
                  className={`min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
              aria-label="Filter footwear by price"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value as FootwearPriceFilter)}
              className="h-10 px-3 text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
            >
              <option value="all">All Prices (₹799 – ₹1,599)</option>
              <option value="under-1000">Under ₹1,000</option>
              <option value="1000-1400">₹1,000 – ₹1,400</option>
              <option value="over-1400">₹1,401 – ₹1,599</option>
            </select>

            <button
              type="button"
              aria-pressed={inStockOnly}
              onClick={() => setInStockOnly((prev) => !prev)}
              className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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
                className="inline-flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium text-[#2D6F99] hover:text-[#1E4E6E] whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Filters
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[#7C6354] tabular-nums">
              {filteredProducts.length} {filteredProducts.length === 1 ? 'pair' : 'pairs'}
            </span>
            <select
              aria-label="Sort footwear"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as FootwearSortOption)}
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
                No footwear matches those filters
              </h2>
              <p className="text-sm text-[#63493B] mt-1.5 max-w-md mx-auto">
                Clear your search or switch back to All Footwear to browse sneakers, loafers, Chelsea boots, and slides.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 min-h-[42px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
              >
                Show All Footwear
              </button>
            </div>
          ) : (
            <section aria-label="Filtered footwear results">
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
            {/* Section A: Sneakers, Runners & High-Tops */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Daily Rotation</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Sneakers, Runners &amp; Canvas High-Tops
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {sneakerProducts.length} silhouettes
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {sneakerProducts.map((product) => (
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

            {/* Section B: Loafers, Boots & Easy Slides */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Welted Craft &amp; Resort Comfort</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Suede Loafers, Chelsea Boots &amp; Cork Slides
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {dressAndBootProducts.length + slideProducts.length} styles
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {[...dressAndBootProducts, ...slideProducts].map((product) => (
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

      {/* Sizing & Care Strip */}
      <section className="border-t border-[#E4D8C6] pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">01</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            True UK Sizing
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Built on ergonomic anatomical lasts in UK 6–11 with generous forefoot room and supportive cork-latex footbeds.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">02</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Resoleable Construction
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Stitched cup soles, Blake-welted loafers, and 360° Goodyear storm-welted Chelsea boots engineered for years of wear.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">03</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Free Size Exchanges
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Need a different UK size? Enjoy free 30-day doorstep size exchanges and express shipping on orders above ₹4,999.
          </p>
        </div>
      </section>
    </div>
  );
}
