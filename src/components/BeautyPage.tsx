import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { BeautySubCategory, Product } from '../types/store.ts';
import { ProductCard } from './ProductCard.tsx';

type BeautyTabFilter = 'all' | BeautySubCategory;
type BeautyPriceFilter = 'all' | 'under-1000' | '1000-1400' | 'over-1400';
type BeautySortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

interface BeautyPageProps {
  products: Product[];
  justAddedId: string | null;
  wishlistIds: string[];
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const SUBCATEGORY_TABS: { id: BeautyTabFilter; label: string }[] = [
  { id: 'all', label: 'All Beauty' },
  { id: 'skincare', label: 'Serums & SPF' },
  { id: 'cleansers', label: 'Cleansers' },
  { id: 'body-care', label: 'Body & Hand Care' },
  { id: 'lip-hair', label: 'Hair & Lip Care' },
];

export function BeautyPage({
  products,
  justAddedId,
  wishlistIds,
  onBackToHome,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: BeautyPageProps) {
  const [subCategory, setSubCategory] = useState<BeautyTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<BeautyPriceFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<BeautySortOption>('featured');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const beautyProducts = useMemo(
    () => products.filter((item) => item.category === 'beauty'),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = beautyProducts.filter((item) => {
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
  }, [beautyProducts, subCategory, searchQuery, priceRange, inStockOnly, sortBy]);

  const activeFilterCount =
    (subCategory !== 'all' ? 1 : 0) +
    (priceRange !== 'all' ? 1 : 0) +
    (inStockOnly ? 1 : 0) +
    (sortBy !== 'featured' ? 1 : 0);

  const hasActiveFilters = searchQuery.trim() !== '' || activeFilterCount > 0;

  const handleResetFilters = () => {
    setSubCategory('all');
    setSearchQuery('');
    setPriceRange('all');
    setInStockOnly(false);
    setSortBy('featured');
  };

  const facialRitualProducts = useMemo(
    () =>
      beautyProducts.filter(
        (item) => item.subCategory === 'skincare' || item.subCategory === 'cleansers',
      ),
    [beautyProducts],
  );

  const bodyLipHairProducts = useMemo(
    () =>
      beautyProducts.filter(
        (item) => item.subCategory === 'body-care' || item.subCategory === 'lip-hair',
      ),
    [beautyProducts],
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10 space-y-6 sm:space-y-8">
      {/* Top Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-[#7C6354] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search hydration serum, oat cleanser, mineral SPF 50, hand balm, scalp oil, lip salve..."
          aria-label="Search beauty and skincare"
          className="w-full h-11 pl-10 pr-10 text-sm bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26] shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear beauty search"
            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#7C6354] hover:text-[#2C1A12] rounded"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Page Hero Header */}
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
              shopEase Beauty · Barrier Serums, Mineral SPF, Cleansers &amp; Botanical Balms
            </p>
            <h1
              className="mt-2 font-display font-semibold tracking-tight text-[#2C1A12] leading-[1.1]"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
            >
              Botanical Apothecary &amp; Daily Skin Care
            </h1>
            <p className="mt-3 text-[15px] text-[#63493B] leading-relaxed">
              Barrier-first formulations crafted with Indian centella, multi-weight hyaluronic acid, non-nano mineral zinc, colloidal oat, and cold-pressed botanical oils in recyclable glass and aluminum.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EFE5D6] text-xs">
            <div>
              <p className="text-[#7C6354]">Formulations</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {beautyProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Facial Care</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {facialRitualProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Body, Hair &amp; Lip</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {bodyLipHairProducts.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Right-Aligned Collapsible Filter Section */}
      <section aria-label="Beauty filters" className="flex flex-col items-end gap-2.5">
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          <span className="font-mono text-xs text-[#7C6354] tabular-nums">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={handleResetFilters}
              className="inline-flex items-center gap-1 min-h-[36px] px-2.5 text-xs font-medium text-[#2D6F99] hover:text-[#1E4E6E] whitespace-nowrap cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
          )}

          <button
            type="button"
            aria-expanded={isFilterOpen}
            aria-controls="beauty-filter-panel"
            onClick={() => setIsFilterOpen((prev) => !prev)}
            className={`inline-flex items-center gap-2 min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
              isFilterOpen || activeFilterCount > 0
                ? 'bg-[#E1F0FA] text-[#1E4E6E] border-[#A8D4F0]'
                : 'bg-[#FFFDF9] text-[#2C1A12] border-[#E4D8C6] hover:border-[#6B3F26]'
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filter</span>
            {activeFilterCount > 0 && (
              <span className="font-mono text-[11px] font-semibold tabular-nums">
                ({activeFilterCount})
              </span>
            )}
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                isFilterOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
        </div>

        {isFilterOpen && (
          <div
            id="beauty-filter-panel"
            className="w-full lg:w-auto lg:max-w-3xl bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-3.5 space-y-3 shadow-xs animate-panel-enter"
          >
            <div
              role="tablist"
              aria-label="Beauty sub-categories"
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
                    className={`min-h-[32px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

            <div className="flex flex-wrap items-center justify-end gap-2 pt-2.5 border-t border-[#EFE5D6]">
              <select
                aria-label="Filter beauty by price"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as BeautyPriceFilter)}
                className="h-9 px-2.5 text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
              >
                <option value="all">All Prices</option>
                <option value="under-1000">Under ₹1,000</option>
                <option value="1000-1400">₹1,000 – ₹1,400</option>
                <option value="over-1400">Above ₹1,400</option>
              </select>

              <button
                type="button"
                aria-pressed={inStockOnly}
                onClick={() => setInStockOnly((prev) => !prev)}
                className={`min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                  inStockOnly
                    ? 'bg-[#E1F0FA] text-[#1E4E6E] border-[#A8D4F0]'
                    : 'bg-[#FBF6EE] text-[#2C1A12] border-[#E4D8C6] hover:border-[#6B3F26]'
                }`}
              >
                In Stock Only
              </button>

              <select
                aria-label="Sort beauty"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as BeautySortOption)}
                className="h-9 px-2.5 text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
              >
                <option value="featured">Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="rating">Highest Rated</option>
              </select>
            </div>
          </div>
        )}
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
                No beauty formulations match those filters
              </h2>
              <p className="text-sm text-[#63493B] mt-1.5 max-w-md mx-auto">
                Clear your search or switch back to All Beauty to browse barrier serums, cleansers, mineral SPF, and botanical balms.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 min-h-[42px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
              >
                Show All Beauty
              </button>
            </div>
          ) : (
            <section aria-label="Filtered beauty results">
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
            {/* Section A: Daily Facial Ritual */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Cleanse, Hydrate &amp; Shield</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Daily Facial Ritual: Cleanser, Barrier Serum &amp; Mineral SPF
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {facialRitualProducts.length} formulations
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {facialRitualProducts.map((product) => (
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

            {/* Section B: Body, Scalp & Lip Care */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Restorative Care</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Botanical Hand Balm, Scalp Elixir &amp; Peptide Lip Salve
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {bodyLipHairProducts.length} formulations
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {bodyLipHairProducts.map((product) => (
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

      {/* Formulation Standards Reference Strip */}
      <section className="border-t border-[#E4D8C6] pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">01</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Cold-Pressed Botanicals
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Small-batch extracts of centella asiatica, rosehip seed, wild vetiver, and black sesame blended without synthetic dyes or silicones.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">02</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Barrier-First pH 5.5
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Dermatologist-tested pH-balanced formulas designed for sensitive skin and humid weather without stripping natural moisture lipids.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">03</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Glass &amp; Aluminum Packaging
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Bottled in UV-shielded frosted glass and infinitely recyclable aluminum tubes to protect delicate active ingredients.
          </p>
        </div>
      </section>
    </div>
  );
}
