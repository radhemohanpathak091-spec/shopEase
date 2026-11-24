import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import {
  ArrowRight,
  CheckCircle2,
  RotateCcw,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { AccountPage, type AccountTab } from './components/AccountPage.tsx';
import { AuthDrawer, type AuthSuccessMeta } from './components/AuthDrawer.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { ResilientImage } from './components/ResilientImage.tsx';
import { HERO_IMAGE, PRODUCTS } from './data/catalog.ts';
import { supabase } from './supabaseClient.js';
import type {
  CartItem,
  Order,
  PaymentMethod,
  Product,
  ProductCategory,
  ShippingAddress,
  UserProfile,
} from './types/store.ts';

type CategoryFilter = 'all' | ProductCategory;
type PriceRangeFilter = 'all' | 'under-5000' | '5000-10000' | 'over-10000';
type SortOption = 'featured' | 'price-asc' | 'price-desc' | 'rating';

const CATEGORY_TABS: { id: CategoryFilter; label: string }[] = [
  { id: 'all', label: 'All Goods' },
  { id: 'apparel', label: 'Apparel' },
  { id: 'accessories', label: 'Accessories' },
  { id: 'electronics', label: 'Electronics' },
];

function mergeCartItems(base: CartItem[], incoming: CartItem[]): CartItem[] {
  const merged = new Map<string, CartItem>();
  for (const item of [...base, ...incoming]) {
    const key = `${item.productId}::${item.variant}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(20, existing.quantity + item.quantity);
    } else {
      merged.set(key, { ...item });
    }
  }
  return Array.from(merged.values());
}

export default function App() {
  const [products, setProducts] = useState<Product[]>(PRODUCTS);
  const [catalogLoading, setCatalogLoading] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [priceRange, setPriceRange] = useState<PriceRangeFilter>('all');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>('featured');

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [view, setView] = useState<'store' | 'account'>(() =>
    typeof window !== 'undefined' && window.location.pathname === '/account' ? 'account' : 'store',
  );
  const [accountTab, setAccountTab] = useState<AccountTab>('profile');

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  const catalogRef = useRef<HTMLElement | null>(null);

  const syncCartToServer = useCallback(
    async (items: CartItem[], tokenOverride?: string | null) => {
      const token = tokenOverride ?? authToken;
      if (!token) return;
      try {
        const response = await fetch('/api/cart', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ items }),
        });
        if (response.ok) {
          const data = (await response.json()) as { items?: CartItem[] };
          if (Array.isArray(data.items)) {
            setCartItems(data.items);
          }
        }
      } catch {
        // Keep optimistic in-memory cart if transient network error occurs
      }
    },
    [authToken],
  );

  const syncWishlistToServer = useCallback(
    async (productIds: string[], tokenOverride?: string | null) => {
      const token = tokenOverride ?? authToken;
      if (!token) return;
      try {
        const response = await fetch('/api/wishlist', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ productIds }),
        });
        if (response.ok) {
          const data = (await response.json()) as { productIds?: string[] };
          if (Array.isArray(data.productIds)) {
            setWishlistIds(data.productIds);
          }
        }
      } catch {
        // Keep optimistic in-memory wishlist if transient network error occurs
      }
    },
    [authToken],
  );

  const fetchOrders = useCallback(async (token: string) => {
    setOrdersLoading(true);
    try {
      const response = await fetch('/api/orders', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = (await response.json()) as { orders?: Order[] };
        setOrders(Array.isArray(data.orders) ? data.orders : []);
      }
    } finally {
      setOrdersLoading(false);
    }
  }, []);

  const hydrateAuthenticatedData = useCallback(
    async (token: string) => {
      try {
        const [profileRes, cartRes, wishlistRes] = await Promise.all([
          fetch('/api/profile', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/cart', {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch('/api/wishlist', {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (profileRes.ok) {
          const profileData = (await profileRes.json()) as { user?: UserProfile };
          if (profileData.user) {
            setUser(profileData.user);
          }
        }

        if (cartRes.ok) {
          const cartData = (await cartRes.json()) as { items?: CartItem[] };
          const serverCart = Array.isArray(cartData.items) ? cartData.items : [];
          setCartItems((prev) => {
            const merged = mergeCartItems(serverCart, prev);
            if (prev.length > 0) {
              void syncCartToServer(merged, token);
            }
            return merged;
          });
        }

        if (wishlistRes.ok) {
          const wishlistData = (await wishlistRes.json()) as { productIds?: string[] };
          const serverWishlist = Array.isArray(wishlistData.productIds)
            ? wishlistData.productIds
            : [];
          setWishlistIds((prev) => {
            const merged = Array.from(new Set([...serverWishlist, ...prev]));
            if (prev.length > 0) {
              void syncWishlistToServer(merged, token);
            }
            return merged;
          });
        }
      } catch {
        // Keep current in-memory state if transient fetch error occurs
      }

      await fetchOrders(token);
    },
    [fetchOrders, syncCartToServer, syncWishlistToServer],
  );

  const applyBackendSession = useCallback(
    async (token: string, backendUser: UserProfile) => {
      setAuthToken(token);
      setUser(backendUser);
      await hydrateAuthenticatedData(token);
    },
    [hydrateAuthenticatedData],
  );

  const applySupabaseSession = useCallback(
    async (session: Session | null, sbUser: SupabaseUser | null) => {
      if (!session || !sbUser) {
        setAuthToken(null);
        setUser(null);
        setOrders([]);
        setWishlistIds([]);
        return;
      }

      const displayName =
        (typeof sbUser.user_metadata?.name === 'string' && sbUser.user_metadata.name.trim()) ||
        sbUser.email?.split('@')[0] ||
        'Shopper';

      setAuthToken(session.access_token);
      setUser({
        id: sbUser.id,
        name: displayName,
        email: sbUser.email || '',
        createdAt: sbUser.created_at || new Date().toISOString(),
      });

      await hydrateAuthenticatedData(session.access_token);
    },
    [hydrateAuthenticatedData],
  );

  useEffect(() => {
    let mounted = true;
    void supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      if (data.session) {
        await applySupabaseSession(data.session, data.session.user);
        return;
      }
      try {
        const res = await fetch('/api/auth/me');
        if (mounted && res.ok) {
          const meData = (await res.json()) as { token?: string; user?: UserProfile };
          if (meData.token && meData.user) {
            await applyBackendSession(meData.token, meData.user);
          }
        }
      } catch {
        // No active cookie session
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (session) {
        void applySupabaseSession(session, session.user);
      } else if (event === 'SIGNED_OUT') {
        setAuthToken(null);
        setUser(null);
        setOrders([]);
        setWishlistIds([]);
      }
    });

    const handlePopState = () => {
      setView(window.location.pathname === '/account' ? 'account' : 'store');
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      mounted = false;
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyBackendSession, applySupabaseSession]);

  useEffect(() => {
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setCatalogLoading(true);
      try {
        const params = new URLSearchParams();
        if (searchQuery.trim()) params.set('q', searchQuery.trim());
        if (categoryFilter !== 'all') params.set('category', categoryFilter);
        if (inStockOnly) params.set('inStock', 'true');
        if (sortBy !== 'featured') params.set('sort', sortBy);
        if (priceRange === 'under-5000') {
          params.set('maxPrice', '4999');
        } else if (priceRange === '5000-10000') {
          params.set('minPrice', '5000');
          params.set('maxPrice', '10000');
        } else if (priceRange === 'over-10000') {
          params.set('minPrice', '10001');
        }

        const response = await fetch(`/api/products?${params.toString()}`, {
          signal: controller.signal,
        });
        if (response.ok) {
          const data = (await response.json()) as { products: Product[] };
          setProducts(data.products);
        }
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          // Retain current products on abort/network error
        }
      } finally {
        setCatalogLoading(false);
      }
    }, 120);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [searchQuery, categoryFilter, priceRange, inStockOnly, sortBy]);

  const totalBagCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    categoryFilter !== 'all' ||
    priceRange !== 'all' ||
    inStockOnly ||
    sortBy !== 'featured';

  const handleResetFilters = () => {
    setSearchQuery('');
    setCategoryFilter('all');
    setPriceRange('all');
    setInStockOnly(false);
    setSortBy('featured');
  };

  const openStoreView = () => {
    setView('store');
    if (window.location.pathname !== '/') {
      window.history.pushState(null, '', '/');
    }
  };

  const openAccountView = (tab: AccountTab = 'profile') => {
    if (!user) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    setAccountTab(tab);
    setView('account');
    if (window.location.pathname !== '/account') {
      window.history.pushState(null, '', '/account');
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCategoryNavClick = (category: CategoryFilter) => {
    setCategoryFilter(category);
    if (view !== 'store') {
      openStoreView();
      setTimeout(() => {
        catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 60);
    } else {
      catalogRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddToCart = (product: Product, variant?: string, quantity = 1) => {
    if (!product.inStock) return;
    const chosenVariant = variant || product.variants[0];
    const nextCart = mergeCartItems(cartItems, [
      { productId: product.id, variant: chosenVariant, quantity },
    ]);
    setCartItems(nextCart);
    void syncCartToServer(nextCart);
    setJustAddedId(product.id);
    setTimeout(() => {
      setJustAddedId((current) => (current === product.id ? null : current));
    }, 1100);
  };

  const handleToggleWishlist = (productId: string) => {
    const exists = wishlistIds.includes(productId);
    const nextWishlist = exists
      ? wishlistIds.filter((id) => id !== productId)
      : [productId, ...wishlistIds];
    setWishlistIds(nextWishlist);
    void syncWishlistToServer(nextWishlist);
  };

  const handleUpdateProfile = async (updates: {
    name: string;
    dob: string;
    phone: string;
    defaultAddress: ShippingAddress | null;
  }) => {
    if (!authToken) {
      throw new Error('Please sign in to update your profile.');
    }
    const response = await fetch('/api/profile', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(updates),
    });
    const data = (await response.json()) as { user?: UserProfile; error?: string };
    if (!response.ok || !data.user) {
      throw new Error(data.error || 'Could not save account details.');
    }
    setUser(data.user);
  };

  const handleUpdateQuantity = (productId: string, variant: string, quantity: number) => {
    const nextCart =
      quantity <= 0
        ? cartItems.filter((item) => !(item.productId === productId && item.variant === variant))
        : cartItems.map((item) =>
            item.productId === productId && item.variant === variant
              ? { ...item, quantity: Math.min(20, quantity) }
              : item,
          );
    setCartItems(nextCart);
    void syncCartToServer(nextCart);
  };

  const handleRemoveItem = (productId: string, variant: string) => {
    const nextCart = cartItems.filter(
      (item) => !(item.productId === productId && item.variant === variant),
    );
    setCartItems(nextCart);
    void syncCartToServer(nextCart);
  };

  const handleAuthSuccess = async (
    session: Session | null,
    supabaseUser: SupabaseUser | null,
    meta?: AuthSuccessMeta,
  ) => {
    await applySupabaseSession(session, supabaseUser);
    if (meta?.isNewAccount && meta.name && session?.access_token) {
      try {
        const res = await fetch('/api/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ name: meta.name }),
        });
        if (res.ok) {
          const profileData = (await res.json()) as { user?: UserProfile };
          if (profileData.user) {
            setUser(profileData.user);
          }
        }
      } catch {
        // Non-blocking profile name sync
      }
    }
    setView('store');
    if (meta?.isNewAccount) {
      setNotification({
        title: 'Account Created',
        message: meta.needsConfirmation
          ? `You have successfully created an account (${meta.email}). Please check your email to confirm before signing in.`
          : 'You have successfully created an account. Welcome to shopEase!',
      });
    }
  };

  const handleBackendAuthSuccess = async (
    token: string,
    backendUser: UserProfile,
    meta?: AuthSuccessMeta,
  ) => {
    await applyBackendSession(token, backendUser);
    setView('store');
    if (meta?.isNewAccount) {
      setNotification({
        title: 'Account Created',
        message: 'You have successfully created an account. Welcome to shopEase!',
      });
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
    } catch {
      // Clear local client state even if logout request fails
    }
    setAuthToken(null);
    setUser(null);
    setOrders([]);
    setCartItems([]);
    setWishlistIds([]);
    openStoreView();
  };

  const handlePlaceOrder = async (
    shippingAddress: ShippingAddress,
    paymentMethod: PaymentMethod,
  ): Promise<Order> => {
    if (!authToken) {
      throw new Error('Please sign in before placing your order.');
    }
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        items: cartItems,
        shippingAddress,
        paymentMethod,
      }),
    });
    const data = (await response.json()) as { order?: Order; error?: string };
    if (!response.ok || !data.order) {
      throw new Error(data.error || 'Could not place order.');
    }
    setCartItems([]);
    setOrders((prev) => [data.order!, ...prev]);
    return data.order;
  };

  const firstName = user ? user.name.split(' ')[0] : null;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8F8F7] text-[#141413]">
      {/* Top Bar Contract: [Brand title, one line] — [4-5 nav links] — [1 primary action] */}
      <header className="sticky top-0 z-40 bg-[#F8F8F7]/95 backdrop-blur-sm border-b border-[#E5E4DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#141413] whitespace-nowrap shrink-0"
          >
            shopEase
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-6 text-sm font-medium text-[#575652]"
          >
            <button
              type="button"
              onClick={() => {
                setCategoryFilter('all');
                openStoreView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 ${
                view === 'store' && categoryFilter === 'all'
                  ? 'text-[#141413] underline underline-offset-4'
                  : ''
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavClick('apparel')}
              className={`hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 ${
                view === 'store' && categoryFilter === 'apparel'
                  ? 'text-[#141413] underline underline-offset-4'
                  : ''
              }`}
            >
              Clothes
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavClick('accessories')}
              className={`hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 ${
                view === 'store' && categoryFilter === 'accessories'
                  ? 'text-[#141413] underline underline-offset-4'
                  : ''
              }`}
            >
              Accessories
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavClick('electronics')}
              className={`hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 ${
                view === 'store' && categoryFilter === 'electronics'
                  ? 'text-[#141413] underline underline-offset-4'
                  : ''
              }`}
            >
              Tech Goods
            </button>
            <button
              type="button"
              onClick={() => openAccountView('profile')}
              className={`hover:text-[#141413] transition-colors whitespace-nowrap shrink-0 ${
                view === 'account' ? 'text-[#141413] underline underline-offset-4' : ''
              }`}
            >
              {firstName ? `Account (${firstName})` : 'Account'}
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-medium text-white bg-[#141413] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D4ED8]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">Bag ({totalBagCount})</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        {view === 'account' && user ? (
          <AccountPage
            user={user}
            orders={orders}
            ordersLoading={ordersLoading}
            wishlistIds={wishlistIds}
            products={PRODUCTS}
            initialTab={accountTab}
            onBackToShop={openStoreView}
            onUpdateProfile={handleUpdateProfile}
            onRemoveWishlist={handleToggleWishlist}
            onAddToCart={(product, variant) => handleAddToCart(product, variant, 1)}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onLogout={handleLogout}
          />
        ) : (
          <>
        {/* Section 1: Storefront Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between bg-white border border-[#E5E4DF] rounded-2xl p-7 sm:p-10">
              <div>
                <p className="text-xs font-medium text-[#575652]">
                  New Arrivals · Clothes, Accessories & Electronics
                </p>
                <h1
                  className="mt-4 font-display font-semibold tracking-tight text-[#141413] leading-[1.08]"
                  style={{ fontSize: 'clamp(2.25rem, 3.6vw, 3.25rem)', textWrap: 'balance' }}
                >
                  Everyday style and smart tech, all in one place.
                </h1>
                <p className="mt-5 text-[15px] text-[#575652] leading-relaxed max-w-[42ch]">
                  Shop comfortable clothes, classic accessories, and reliable electronics—made for daily life and priced clearly in rupees.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-[#EFEFED] flex flex-wrap items-center gap-3">
                <a
                  href="#catalog"
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  Shop Now
                  <ArrowRight className="w-4 h-4" />
                </a>
                <button
                  type="button"
                  onClick={() => {
                    if (user) {
                      openAccountView('orders');
                    } else {
                      setAuthMode('register');
                      setIsAuthOpen(true);
                    }
                  }}
                  className="inline-flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium text-[#141413] bg-[#F8F8F7] hover:bg-[#EFEFED] border border-[#E5E4DF] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'My Account & Orders' : 'Sign In / Join'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-[#E5E4DF] bg-[#EFEFED] min-h-[280px] sm:min-h-[380px]">
              <ResilientImage
                src={HERO_IMAGE}
                alt="shopEase studio collection featuring charcoal merino overshirt, anodized aluminum headphones, and espresso leather briefcase"
                fallbackLabel="shopEase Collection"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-white border border-[#E5E4DF] rounded-xl px-6 py-4 text-xs">
            <div className="flex items-center justify-between sm:justify-start sm:gap-3">
              <span className="font-semibold text-[#141413]">Free Delivery</span>
              <span className="text-[#6B6A65]">Orders above ₹4,999</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:border-l sm:border-[#EFEFED] sm:pl-6">
              <span className="font-semibold text-[#141413]">Safe Checkout</span>
              <span className="text-[#6B6A65]">Secure sign-in & order tracking</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:border-l sm:border-[#EFEFED] sm:pl-6">
              <span className="font-semibold text-[#141413]">Easy Returns</span>
              <span className="text-[#6B6A65]">30-day return & warranty support</span>
            </div>
          </div>
        </section>

        {/* Section 2: Search, Multi-Facet Filters & Product Grid */}
        <section
          id="catalog"
          ref={catalogRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12"
        >
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
            <div>
              <h2 className="font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#141413]">
                Curated Catalog
              </h2>
              <p className="mt-1 text-sm text-[#575652]">
                Filter by department, price bracket, stock availability, or search materials.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs text-[#575652]">
              <span className="font-mono tabular-nums">
                {catalogLoading
                  ? 'Updating...'
                  : `Showing ${products.length} of ${PRODUCTS.length} items`}
              </span>
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 text-[#1D4ED8] hover:text-[#1E40AF] font-medium whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset Filters
                </button>
              )}
            </div>
          </div>

          {/* Search & Filter Toolbar */}
          <div className="bg-white border border-[#E5E4DF] rounded-xl p-4 mb-8 space-y-4">
            <div className="flex flex-col lg:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-[#6B6A65] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search clothes, watches, headphones, merino, titanium..."
                  aria-label="Search products"
                  className="w-full h-11 pl-10 pr-10 text-sm bg-[#F8F8F7] border border-[#E5E4DF] rounded-lg text-[#141413] placeholder:text-[#8E8D87] focus:outline-none focus:bg-white focus:border-[#1D4ED8]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search query"
                    className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-[#6B6A65] hover:text-[#141413] rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Category Segmented Tabs */}
              <div
                role="tablist"
                aria-label="Product categories"
                className="flex items-center gap-1 p-1 bg-[#F1F0ED] rounded-lg overflow-x-auto"
              >
                {CATEGORY_TABS.map((tab) => {
                  const active = categoryFilter === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      role="tab"
                      aria-selected={active}
                      onClick={() => setCategoryFilter(tab.id)}
                      className={`min-h-[36px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                        active
                          ? 'bg-white text-[#141413] shadow-xs'
                          : 'text-[#575652] hover:text-[#141413]'
                      }`}
                    >
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-[#EFEFED]">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-[#575652] mr-1">
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  Filters:
                </span>

                <select
                  aria-label="Filter by price range"
                  value={priceRange}
                  onChange={(e) => setPriceRange(e.target.value as PriceRangeFilter)}
                  className="h-10 px-3 text-xs font-medium bg-[#F8F8F7] border border-[#E5E4DF] rounded-lg text-[#141413] focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value="all">All Prices</option>
                  <option value="under-5000">Under ₹5,000</option>
                  <option value="5000-10000">₹5,000 – ₹10,000</option>
                  <option value="over-10000">Above ₹10,000</option>
                </select>

                <button
                  type="button"
                  aria-pressed={inStockOnly}
                  onClick={() => setInStockOnly((prev) => !prev)}
                  className={`min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                    inStockOnly
                      ? 'bg-[#141413] text-white border-[#141413]'
                      : 'bg-[#F8F8F7] text-[#141413] border-[#E5E4DF] hover:border-[#141413]'
                  }`}
                >
                  In Stock Only
                </button>

                <button
                  type="button"
                  onClick={() => openAccountView('profile')}
                  className="md:hidden min-h-[40px] px-3.5 py-2 text-xs font-medium rounded-lg border border-[#E5E4DF] bg-[#F8F8F7] text-[#141413] whitespace-nowrap shrink-0"
                >
                  {firstName ? `Account (${firstName})` : 'Account'}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <label htmlFor="sort-select" className="text-xs text-[#6B6A65]">
                  Sort
                </label>
                <select
                  id="sort-select"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as SortOption)}
                  className="h-10 px-3 text-xs font-medium bg-[#F8F8F7] border border-[#E5E4DF] rounded-lg text-[#141413] focus:outline-none focus:border-[#1D4ED8]"
                >
                  <option value="featured">Featured</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Product Grid */}
          {products.length === 0 ? (
            <div className="bg-white border border-[#E5E4DF] rounded-2xl p-12 text-center">
              <h3 className="font-display text-lg font-semibold text-[#141413]">
                No products match those filters
              </h3>
              <p className="text-sm text-[#575652] mt-1.5 max-w-md mx-auto">
                Try clearing your search terms or switching back to all categories and price ranges.
              </p>
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-5 min-h-[42px] px-5 py-2.5 bg-[#1D4ED8] hover:bg-[#1E40AF] text-white text-xs font-medium rounded-lg transition-colors"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  justAddedId={justAddedId}
                  isWishlisted={wishlistIds.includes(product.id)}
                  onSelect={(item) => setSelectedProduct(item)}
                  onQuickAdd={(item) => handleAddToCart(item)}
                  onToggleWishlist={handleToggleWishlist}
                />
              ))}
            </div>
          )}
        </section>

        {/* Section 3: Material & Craftsmanship Standards */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#E5E4DF]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="font-mono text-xs text-[#6B6A65]">01</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#141413]">
                Tailored Textiles
              </h3>
              <p className="mt-2 text-sm text-[#575652] leading-relaxed">
                Double-faced Italian merino, shuttle-loomed Japanese selvedge, and heavyweight organic loopback cotton selected for multi-season longevity.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#6B6A65]">02</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#141413]">
                Architectural Carry
              </h3>
              <p className="mt-2 text-sm text-[#575652] leading-relaxed">
                Vegetable-tanned full-grain hides, Grade-5 titanium watch cases, and hand-finished Japanese cellulose acetate built for daily utility.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#6B6A65]">03</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#141413]">
                Precision Electronics
              </h3>
              <p className="mt-2 text-sm text-[#575652] leading-relaxed">
                CNC-milled aluminum acoustics, open-firmware mechanical keyboards, and weighted Qi2 power docks engineered without disposable plastics.
              </p>
            </div>
          </div>
        </section>
          </>
        )}
      </main>

      {/* Section 4: Footer */}
      <footer className="border-t border-[#E5E4DF] bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs text-[#6B6A65]">
          <p className="font-medium text-[#141413]">shopEase</p>
          <div className="flex flex-wrap items-center gap-6">
            <button
              type="button"
              onClick={() => handleCategoryNavClick('apparel')}
              className="hover:text-[#141413] transition-colors"
            >
              Apparel
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavClick('accessories')}
              className="hover:text-[#141413] transition-colors"
            >
              Accessories
            </button>
            <button
              type="button"
              onClick={() => handleCategoryNavClick('electronics')}
              className="hover:text-[#141413] transition-colors"
            >
              Electronics
            </button>
            <button
              type="button"
              onClick={() => openAccountView('orders')}
              className="hover:text-[#141413] transition-colors"
            >
              Account & Orders
            </button>
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="hover:text-[#141413] transition-colors"
            >
              Shopping Bag
            </button>
          </div>
          <p>© 2026 shopEase</p>
        </div>
      </footer>

      <ProductDetailModal
        product={selectedProduct}
        isWishlisted={selectedProduct ? wishlistIds.includes(selectedProduct.id) : false}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
      />

      <CartDrawer
        isOpen={isCartOpen}
        items={cartItems}
        products={PRODUCTS}
        user={user}
        onClose={() => setIsCartOpen(false)}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onOpenAuth={() => {
          setIsCartOpen(false);
          setAuthMode('login');
          setIsAuthOpen(true);
        }}
        onPlaceOrder={handlePlaceOrder}
      />

      <AuthDrawer
        isOpen={isAuthOpen}
        user={user}
        orders={orders}
        ordersLoading={ordersLoading}
        initialMode={authMode}
        onClose={() => setIsAuthOpen(false)}
        onAuthSuccess={handleAuthSuccess}
        onBackendAuthSuccess={handleBackendAuthSuccess}
        onLogout={handleLogout}
      />

      {notification && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-white border border-[#BBF7D0] rounded-xl shadow-lg p-4 flex items-start gap-3"
        >
          <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold text-[#141413]">
              {notification.title}
            </p>
            <p className="mt-1 text-xs text-[#4A4945] leading-relaxed">
              {notification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#6B6A65] hover:bg-[#F1F0ED] hover:text-[#141413] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
