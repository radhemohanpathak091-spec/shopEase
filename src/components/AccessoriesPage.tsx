import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { AccessoriesSubCategory, Product } from '../types/store.ts';
import { ProductCard } from './ProductCard.tsx';

type AccessoriesTabFilter = 'all' | AccessoriesSubCategory;
type AccessoriesPriceFilter = 'all' | 'under-3000' | '3000-9500' | 'over-9500';
type AccessoriesSortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

interface AccessoriesPageProps {
  products: Product[];
  justAddedId: string | null;
  wishlistIds: string[];
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const SUBCATEGORY_TABS: { id: AccessoriesTabFilter; label: string }[] = [
  { id: 'all', label: 'All Accessories' },
  { id: 'carry', label: 'Bags & Carry' },
  { id: 'leather-goods', label: 'Wallets & Belts' },
  { id: 'horology', label: 'Watches' },
  { id: 'eyewear', label: 'Eyewear' },
];

export function AccessoriesPage({
  products,
  justAddedId,
  wishlistIds,
  onBackToHome,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: AccessoriesPageProps) {
  const [subCategory, setSubCategory] = useState<AccessoriesTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<AccessoriesPriceFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<AccessoriesSortOption>('featured');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const accessoriesProducts = useMemo(
    () => products.filter((item) => item.category === 'accessories'),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = accessoriesProducts.filter((item) => {
      if (subCategory !== 'all' && item.subCategory !== subCategory) return false;
      if (inStockOnly && !item.inStock) return false;
      if (priceRange === 'under-3000' && item.price >= 3000) return false;
      if (priceRange === '3000-9500' && (item.price < 3000 || item.price > 9500)) return false;
      if (priceRange === 'over-9500' && item.price <= 9500) return false;
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
  }, [accessoriesProducts, subCategory, searchQuery, priceRange, inStockOnly, sortBy]);

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

  const carryProducts = useMemo(
    () => accessoriesProducts.filter((item) => item.subCategory === 'carry'),
    [accessoriesProducts],
  );

  const horologyProducts = useMemo(
    () => accessoriesProducts.filter((item) => item.subCategory === 'horology'),
    [accessoriesProducts],
  );

  const eyewearAndLeatherProducts = useMemo(
    () =>
      accessoriesProducts.filter(
        (item) => item.subCategory === 'eyewear' || item.subCategory === 'leather-goods',
      ),
    [accessoriesProducts],
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
          placeholder="Search leather tote, weekender duffel, titanium watch, sunglasses, wallet, belt..."
          aria-label="Search accessories"
          className="w-full h-11 pl-10 pr-11 text-base sm:text-sm bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26] shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear accessories search"
            className="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center text-[#7C6354] hover:text-[#2C1A12] rounded"
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
              shopEase Accessories · Bridle Leather Carry, Titanium Horology, Eyewear &amp; Small Leather Goods
            </p>
            <h1
              className="mt-2 font-display font-semibold tracking-tight text-[#2C1A12] leading-[1.1]"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
            >
              Architectural Carry &amp; Daily Objects
            </h1>
            <p className="mt-3 text-[15px] text-[#63493B] leading-relaxed">
              Vegetable-tanned leather totes and weekender duffels, Grade-5 titanium automatic field watches, hand-tumbled Japanese acetate sunglasses, and saddle-stitched small leather essentials.
            </p>
          </div>

          <div className="grid grid-cols-3 sm:flex sm:items-center gap-3 sm:gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EFE5D6] text-xs w-full lg:w-auto">
            <div>
              <p className="text-[#7C6354]">Pieces</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {accessoriesProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-3 sm:pl-6">
              <p className="text-[#7C6354]">Carry &amp; Travel</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {carryProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-3 sm:pl-6">
              <p className="text-[#7C6354]">Watches, Optics &amp; Leather</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {horologyProducts.length + eyewearAndLeatherProducts.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Right-Aligned Collapsible Filter Section */}
      <section aria-label="Accessories filters" className="flex flex-col items-end gap-2.5">
        <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-2.5">
          <span className="font-mono text-xs text-[#7C6354] tabular-nums">
            {filteredProducts.length} {filteredProducts.length === 1 ? 'item' : 'items'}
          </span>

          <div className="flex items-center gap-2">
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1 min-h-[40px] sm:min-h-[36px] px-2.5 text-xs font-medium text-[#2D6F99] hover:text-[#1E4E6E] whitespace-nowrap cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset
              </button>
            )}

            <button
              type="button"
              aria-expanded={isFilterOpen}
              aria-controls="accessories-filter-panel"
              onClick={() => setIsFilterOpen((prev) => !prev)}
              className={`inline-flex items-center gap-2 min-h-[42px] sm:min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap cursor-pointer ${
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
        </div>

        {isFilterOpen && (
          <div
            id="accessories-filter-panel"
            className="w-full lg:w-auto lg:max-w-3xl bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-3.5 space-y-3 shadow-xs animate-panel-enter"
          >
            <div
              role="tablist"
              aria-label="Accessories sub-categories"
              className="flex items-center gap-1 p-1 bg-[#F3EBDD] rounded-lg overflow-x-auto no-scrollbar max-w-full"
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
                    className={`min-h-[36px] sm:min-h-[32px] px-3 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
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

            <div className="grid grid-cols-1 sm:flex sm:flex-wrap sm:items-center sm:justify-end gap-2 pt-2.5 border-t border-[#EFE5D6]">
              <select
                aria-label="Filter accessories by price"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as AccessoriesPriceFilter)}
                className="h-11 sm:h-9 px-3 sm:px-2.5 text-base sm:text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26] w-full sm:w-auto"
              >
                <option value="all">All Prices</option>
                <option value="under-3000">Under ₹3,000</option>
                <option value="3000-9500">₹3,000 – ₹9,500</option>
                <option value="over-9500">Above ₹9,500</option>
              </select>

              <button
                type="button"
                aria-pressed={inStockOnly}
                onClick={() => setInStockOnly((prev) => !prev)}
                className={`min-h-[44px] sm:min-h-[36px] px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 cursor-pointer w-full sm:w-auto ${
                  inStockOnly
                    ? 'bg-[#E1F0FA] text-[#1E4E6E] border-[#A8D4F0]'
                    : 'bg-[#FBF6EE] text-[#2C1A12] border-[#E4D8C6] hover:border-[#6B3F26]'
                }`}
              >
                In Stock Only
              </button>

              <select
                aria-label="Sort accessories"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as AccessoriesSortOption)}
                className="h-11 sm:h-9 px-3 sm:px-2.5 text-base sm:text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26] w-full sm:w-auto"
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
                No accessories match those filters
              </h2>
              <p className="text-sm text-[#63493B] mt-1.5 max-w-md mx-auto">
                Clear your search or switch back to All Accessories to browse leather bags, watches, sunglasses, wallets, and belts.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 min-h-[42px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
              >
                Show All Accessories
              </button>
            </div>
          ) : (
            <section aria-label="Filtered accessories results">
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
            {/* Section A: Bags, Travel & Horology */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Carry &amp; Timekeeping</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Architectural Bags, Weekender &amp; Titanium Watch
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {carryProducts.length + horologyProducts.length} pieces
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {[...carryProducts, ...horologyProducts].map((product) => (
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

            {/* Section B: Eyewear & Small Leather Goods */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Personal Goods</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Japanese Acetate Eyewear, Wallets &amp; Bridle Belts
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {eyewearAndLeatherProducts.length} pieces
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {eyewearAndLeatherProducts.map((product) => (
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

      {/* Craft & Materials Reference Strip */}
      <section className="border-t border-[#E4D8C6] pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">01</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Vegetable-Tanned Bridle Leather
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Full-grain hides tanned with natural tree barks and waxed for rich patina, paired with solid brass cast hardware.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">02</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Titanium &amp; Sapphire Horology
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Bead-blasted Grade-5 titanium watch cases protect 24-jewel automatic movements beneath scratch-proof sapphire glass.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">03</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Japanese Cellulose Acetate
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Plant-based 8mm acetate eyewear frames are beechwood-tumbled and fitted with polarized UV400 CR-39 optics.
          </p>
        </div>
      </section>
    </div>
  );
}
