import { useMemo, useState } from 'react';
import { ArrowLeft, ChevronDown, RotateCcw, Search, SlidersHorizontal, X } from 'lucide-react';
import type { Product, TechGoodsSubCategory } from '../types/store.ts';
import { ProductCard } from './ProductCard.tsx';

type TechTabFilter = 'all' | TechGoodsSubCategory;
type TechPriceFilter = 'all' | 'under-5000' | '5000-6500' | 'over-6500';
type TechSortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

interface TechGoodsPageProps {
  products: Product[];
  justAddedId: string | null;
  wishlistIds: string[];
  onBackToHome: () => void;
  onSelectProduct: (product: Product) => void;
  onQuickAdd: (product: Product) => void;
  onToggleWishlist: (productId: string) => void;
}

const SUBCATEGORY_TABS: { id: TechTabFilter; label: string }[] = [
  { id: 'all', label: 'All Tech Goods' },
  { id: 'audio', label: 'Studio Audio' },
  { id: 'desk', label: 'Keyboards & Mice' },
  { id: 'workspace', label: 'Workspace Stands' },
  { id: 'power', label: 'Power & Docks' },
];

export function TechGoodsPage({
  products,
  justAddedId,
  wishlistIds,
  onBackToHome,
  onSelectProduct,
  onQuickAdd,
  onToggleWishlist,
}: TechGoodsPageProps) {
  const [subCategory, setSubCategory] = useState<TechTabFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [priceRange, setPriceRange] = useState<TechPriceFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<TechSortOption>('featured');
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  const techProducts = useMemo(
    () => products.filter((item) => item.category === 'electronics'),
    [products],
  );

  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    let list = techProducts.filter((item) => {
      if (subCategory !== 'all' && item.subCategory !== subCategory) return false;
      if (inStockOnly && !item.inStock) return false;
      if (priceRange === 'under-5000' && item.price >= 5000) return false;
      if (priceRange === '5000-6500' && (item.price < 5000 || item.price > 6500)) return false;
      if (priceRange === 'over-6500' && item.price <= 6500) return false;
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
  }, [techProducts, subCategory, searchQuery, priceRange, inStockOnly, sortBy]);

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

  const audioProducts = useMemo(
    () => techProducts.filter((item) => item.subCategory === 'audio'),
    [techProducts],
  );

  const deskAndWorkspaceProducts = useMemo(
    () =>
      techProducts.filter(
        (item) => item.subCategory === 'desk' || item.subCategory === 'workspace',
      ),
    [techProducts],
  );

  const powerProducts = useMemo(
    () => techProducts.filter((item) => item.subCategory === 'power'),
    [techProducts],
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
          placeholder="Search ANC headphones, mechanical keyboard, wireless mouse, GaN dock, laptop stand, DAC..."
          aria-label="Search tech goods"
          className="w-full h-11 pl-10 pr-10 text-sm bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26] shadow-2xs"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            aria-label="Clear tech goods search"
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
              shopEase Tech Goods · Studio Acoustics, CNC Desk Hardware &amp; GaN Power
            </p>
            <h1
              className="mt-2 font-display font-semibold tracking-tight text-[#2C1A12] leading-[1.1]"
              style={{ fontSize: 'clamp(2rem, 3.4vw, 3rem)', textWrap: 'balance' }}
            >
              Precision Audio &amp; Desk Engineering
            </h1>
            <p className="mt-3 text-[15px] text-[#63493B] leading-relaxed">
              CNC-milled aluminum ANC headphones, balanced USB-C DAC amplifiers, open-firmware 75% mechanical keyboards, ergonomic wireless mice, anodized laptop stands, and 140W GaN charging docks.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 pt-4 lg:pt-0 border-t lg:border-t-0 border-[#EFE5D6] text-xs">
            <div>
              <p className="text-[#7C6354]">Devices</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {techProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Audio &amp; Power</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {audioProducts.length + powerProducts.length}
              </p>
            </div>
            <div className="border-l border-[#EFE5D6] pl-6">
              <p className="text-[#7C6354]">Desk &amp; Workspace</p>
              <p className="font-mono text-lg font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                {deskAndWorkspaceProducts.length}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Compact Right-Aligned Collapsible Filter Section */}
      <section aria-label="Tech goods filters" className="flex flex-col items-end gap-2.5">
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
            aria-controls="tech-goods-filter-panel"
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
            id="tech-goods-filter-panel"
            className="w-full lg:w-auto lg:max-w-3xl bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-3.5 space-y-3 shadow-xs animate-panel-enter"
          >
            <div
              role="tablist"
              aria-label="Tech goods sub-categories"
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
                aria-label="Filter tech goods by price"
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value as TechPriceFilter)}
                className="h-9 px-2.5 text-xs font-medium bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
              >
                <option value="all">All Prices</option>
                <option value="under-5000">Under ₹5,000</option>
                <option value="5000-6500">₹5,000 – ₹6,500</option>
                <option value="over-6500">Above ₹6,500</option>
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
                aria-label="Sort tech goods"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as TechSortOption)}
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
                No tech goods match those filters
              </h2>
              <p className="text-sm text-[#63493B] mt-1.5 max-w-md mx-auto">
                Clear your search or switch back to All Tech Goods to browse studio audio, mechanical keyboards, mice, risers, and GaN docks.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 min-h-[42px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
              >
                Show All Tech Goods
              </button>
            </div>
          ) : (
            <section aria-label="Filtered tech goods results">
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
            {/* Section A: Studio Audio & GaN Power */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Acoustics &amp; Charging</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Studio ANC Audio, Balanced DAC &amp; GaN Power
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {audioProducts.length + powerProducts.length} devices
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {[...audioProducts, ...powerProducts].map((product) => (
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

            {/* Section B: Desk Input & Workspace Hardware */}
            <section className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-2 pb-4 border-b border-[#E4D8C6]">
                <div>
                  <p className="text-xs font-medium text-[#2D6F99]">Desk Setup</p>
                  <h2 className="mt-1 font-display text-xl sm:text-2xl font-semibold text-[#2C1A12]">
                    Mechanical Keyboards, Wireless Mice &amp; Risers
                  </h2>
                </div>
                <p className="text-xs text-[#7C6354] font-mono tabular-nums">
                  {deskAndWorkspaceProducts.length} devices
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {deskAndWorkspaceProducts.map((product) => (
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

      {/* Hardware Engineering Reference Strip */}
      <section className="border-t border-[#E4D8C6] pt-10 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">01</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            CNC-Milled 6063 Aluminum
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Every keyboard chassis, laptop riser, DAC housing, and headphone yoke is machined from solid anodized aluminum without brittle plastic shells.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">02</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            Open Firmware &amp; USB-C Standard
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            QMK/VIA keyboard customization, lossless wired USB-C DAC audio, and universal Qi2/PD 3.1 charging built without proprietary lock-in.
          </p>
        </div>
        <div>
          <p className="font-mono text-xs text-[#2D6F99]">03</p>
          <h3 className="mt-2 font-display text-base font-semibold text-[#2C1A12]">
            18-Month Hardware Warranty
          </h3>
          <p className="mt-1.5 text-sm text-[#63493B] leading-relaxed">
            Backed by replacement ear cushions, hot-swap switches, and domestic warranty service across India.
          </p>
        </div>
      </section>
    </div>
  );
}
