import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import {
  ArrowRight,
  CheckCircle2,
  ShoppingBag,
  X,
} from 'lucide-react';
import { AccessoriesPage } from './components/AccessoriesPage.tsx';
import { AccountPage, type AccountTab } from './components/AccountPage.tsx';
import { AuthDrawer, type AuthSuccessMeta } from './components/AuthDrawer.tsx';
import { BeautyPage } from './components/BeautyPage.tsx';
import { CartDrawer } from './components/CartDrawer.tsx';
import { ClothesPage } from './components/ClothesPage.tsx';
import { FootwearPage } from './components/FootwearPage.tsx';
import { HomeLivingPage } from './components/HomeLivingPage.tsx';
import { LoadingPage } from './components/LoadingPage.tsx';
import { ProductCard } from './components/ProductCard.tsx';
import { ProductDetailModal } from './components/ProductDetailModal.tsx';
import { ResilientImage } from './components/ResilientImage.tsx';
import { TechGoodsPage } from './components/TechGoodsPage.tsx';
import { HERO_IMAGE, PRODUCTS } from './data/catalog.ts';
import {
  addWishlistItem,
  createOrder as createSupabaseOrder,
  loadUserStoreData,
  removeCartItem as removeSupabaseCartItem,
  removeWishlistItem as removeSupabaseWishlistItem,
  syncCartItems as syncSupabaseCartItems,
  syncWishlistItems as syncSupabaseWishlistItems,
  updateCartItemQuantity as updateSupabaseCartItemQuantity,
  updateUserProfile as updateSupabaseProfile,
  upsertCartItem as upsertSupabaseCartItem,
} from './lib/supabaseStore.ts';
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

const SHOP_BY_CATEGORIES: {
  id: ProductCategory;
  title: string;
  subtitle: string;
  image: string;
}[] = [
  {
    id: 'electronics',
    title: 'Tech Goods',
    subtitle: 'Audio, Keyboards, Mice & Docks',
    image: '/src/assets/images/product_anc_headphones_1795513367126.jpg',
  },
  {
    id: 'apparel',
    title: 'Fashion',
    subtitle: 'Jeans, Korean Pants & Shirts',
    image: '/src/assets/images/clothes_korean_pants_1795521624857.jpg',
  },
  {
    id: 'footwear',
    title: 'Footwear',
    subtitle: 'Sneakers, Loafers, Boots & Slides',
    image: '/src/assets/images/product_leather_sneakers_1795523787294.jpg',
  },
  {
    id: 'home-living',
    title: 'Home & Living',
    subtitle: 'Ceramics, Throws, Lamps & Candles',
    image: '/src/assets/images/product_pourover_set_1795523787352.jpg',
  },
  {
    id: 'accessories',
    title: 'Accessories',
    subtitle: 'Bags, Watches, Eyewear & Leather',
    image: '/src/assets/images/product_leather_tote_1795513368076.jpg',
  },
  {
    id: 'beauty',
    title: 'Beauty',
    subtitle: 'Serums, Cleansers, SPF & Balms',
    image: '/src/assets/images/product_hydration_serum_1795523788162.jpg',
  },
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
  const [selectedCategory, setSelectedCategory] = useState<ProductCategory | null>(null);

  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  const [authToken, setAuthToken] = useState<string | null>(null);
  const [supabaseUserId, setSupabaseUserId] = useState<string | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [wishlistIds, setWishlistIds] = useState<string[]>([]);

  const [view, setView] = useState<
    | 'store'
    | 'clothes'
    | 'footwear'
    | 'home-living'
    | 'accessories'
    | 'tech-goods'
    | 'beauty'
    | 'account'
  >(() => {
    if (typeof window === 'undefined') return 'store';
    if (window.location.pathname === '/account') return 'account';
    if (window.location.pathname === '/clothes') return 'clothes';
    if (window.location.pathname === '/footwear') return 'footwear';
    if (window.location.pathname === '/home-living') return 'home-living';
    if (window.location.pathname === '/accessories') return 'accessories';
    if (window.location.pathname === '/tech-goods' || window.location.pathname === '/electronics') {
      return 'tech-goods';
    }
    if (window.location.pathname === '/beauty') return 'beauty';
    return 'store';
  });
  const [accountTab, setAccountTab] = useState<AccountTab>('profile');

  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [isPageLoading, setIsPageLoading] = useState(false);
  const [loadingMeta, setLoadingMeta] = useState<{ title: string; label: string }>({
    title: 'shopEase',
    label: 'Preparing clothes, accessories & tech goods...',
  });
  const [showLoadingOverlay, setShowLoadingOverlay] = useState(true);
  const [routeSweepKey, setRouteSweepKey] = useState(0);
  const [showAnnouncement, setShowAnnouncement] = useState(true);

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [notification, setNotification] = useState<{
    title: string;
    message: string;
  } | null>(null);

  const categoriesRef = useRef<HTMLElement | null>(null);
  const viewRef = useRef(view);
  viewRef.current = view;
  const cartItemsRef = useRef(cartItems);
  cartItemsRef.current = cartItems;
  const wishlistIdsRef = useRef(wishlistIds);
  wishlistIdsRef.current = wishlistIds;
  const transitionTimersRef = useRef<{
    swap?: ReturnType<typeof setTimeout>;
    done?: ReturnType<typeof setTimeout>;
  }>({});

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => {
      setNotification(null);
    }, 6000);
    return () => clearTimeout(timer);
  }, [notification]);

  const overlayActive = isInitialLoading || isPageLoading;

  useEffect(() => {
    if (overlayActive) {
      setShowLoadingOverlay(true);
      return;
    }
    const timer = setTimeout(() => {
      setShowLoadingOverlay(false);
    }, 280);
    return () => clearTimeout(timer);
  }, [overlayActive]);

  useEffect(() => {
    const timers = transitionTimersRef.current;
    return () => {
      if (timers.swap) clearTimeout(timers.swap);
      if (timers.done) clearTimeout(timers.done);
    };
  }, []);

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
      setSupabaseUserId(null);
      setAuthToken(token);
      setUser(backendUser);
      await hydrateAuthenticatedData(token);
    },
    [hydrateAuthenticatedData],
  );

  const resolveSupabaseUserId = useCallback(async (): Promise<string | null> => {
    if (supabaseUserId) return supabaseUserId;
    const { data } = await supabase.auth.getSession();
    const uid = data.session?.user?.id ?? null;
    if (uid) setSupabaseUserId(uid);
    return uid;
  }, [supabaseUserId]);

  const applySupabaseSession = useCallback(
    async (session: Session | null, sbUser: SupabaseUser | null) => {
      if (!session || !sbUser) {
        setSupabaseUserId(null);
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

      setSupabaseUserId(sbUser.id);
      setAuthToken(session.access_token);
      setUser((prev) =>
        prev && prev.id === sbUser.id
          ? prev
          : {
              id: sbUser.id,
              name: displayName,
              email: sbUser.email || '',
              createdAt: sbUser.created_at || new Date().toISOString(),
            },
      );

      setOrdersLoading(true);
      try {
        const guestCart = cartItemsRef.current;
        const guestWishlist = wishlistIdsRef.current;
        const storeData = await loadUserStoreData(sbUser);

        const mergedCart = mergeCartItems(storeData.cartItems, guestCart);
        const mergedWishlist = Array.from(new Set([...storeData.wishlistIds, ...guestWishlist]));

        setUser(storeData.profile);
        setOrders(storeData.orders);
        setCartItems(mergedCart);
        setWishlistIds(mergedWishlist);

        if (guestCart.length > 0) {
          await syncSupabaseCartItems(sbUser.id, mergedCart);
        }
        if (guestWishlist.length > 0) {
          await syncSupabaseWishlistItems(sbUser.id, mergedWishlist);
        }
      } catch (err) {
        console.warn('Supabase table query failed:', err);
        const message =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Unable to load your data from Supabase.';
        if (/permission denied|does not exist|schema cache/i.test(message)) {
          setNotification({
            title: 'Supabase Permissions Needed',
            message:
              'Please run the updated SQL in supabase/schema.sql inside your Supabase SQL Editor to grant table permissions.',
          });
        }
        await hydrateAuthenticatedData(session.access_token);
      } finally {
        setOrdersLoading(false);
      }
    },
    [hydrateAuthenticatedData],
  );

  const transitionToView = useCallback(
    (
      targetView:
        | 'store'
        | 'clothes'
        | 'footwear'
        | 'home-living'
        | 'accessories'
        | 'tech-goods'
        | 'beauty'
        | 'account',
      options?: {
        pushPath?: string;
        afterSwap?: () => void;
      },
    ) => {
      if (transitionTimersRef.current.swap) clearTimeout(transitionTimersRef.current.swap);
      if (transitionTimersRef.current.done) clearTimeout(transitionTimersRef.current.done);

      if (options?.pushPath && window.location.pathname !== options.pushPath) {
        window.history.pushState(null, '', options.pushPath);
      }

      const metaByView = {
        store: {
          title: 'shopEase Home',
          label: 'Loading storefront highlights & departments...',
        },
        clothes: {
          title: 'Clothes Collection',
          label: 'Loading jeans, Korean pants, linen pants & shirts...',
        },
        footwear: {
          title: 'Footwear Collection',
          label: 'Loading sneakers, suede loafers, Chelsea boots & cork slides...',
        },
        'home-living': {
          title: 'Home & Living',
          label: 'Loading stoneware ceramics, organic textiles, lamps & candles...',
        },
        accessories: {
          title: 'Accessories Collection',
          label: 'Loading leather bags, titanium watches, eyewear & wallets...',
        },
        'tech-goods': {
          title: 'Tech Goods',
          label: 'Loading ANC headphones, mechanical keyboards, mice & GaN docks...',
        },
        beauty: {
          title: 'Beauty & Apothecary',
          label: 'Loading botanical serums, cleansers, mineral SPF & balms...',
        },
        account: {
          title: 'My Account',
          label: 'Loading your profile, orders, wishlist & tracking...',
        },
      };

      if (viewRef.current === targetView) {
        setRouteSweepKey((k) => k + 1);
        options?.afterSwap?.();
        return;
      }

      setLoadingMeta(metaByView[targetView]);
      setShowLoadingOverlay(true);
      setIsPageLoading(true);
      setRouteSweepKey((k) => k + 1);

      transitionTimersRef.current.swap = setTimeout(() => {
        setView(targetView);
        options?.afterSwap?.();
      }, 180);

      transitionTimersRef.current.done = setTimeout(() => {
        setIsPageLoading(false);
      }, 430);
    },
    [],
  );

  useEffect(() => {
    let mounted = true;
    const startTime = Date.now();

    const finishInitialLoad = () => {
      if (!mounted) return;
      const elapsed = Date.now() - startTime;
      const remaining = Math.max(0, 620 - elapsed);
      setTimeout(() => {
        if (mounted) setIsInitialLoading(false);
      }, remaining);
    };

    const maxBootTimer = setTimeout(() => {
      if (mounted) setIsInitialLoading(false);
    }, 1800);

    void supabase.auth
      .getSession()
      .then(async ({ data }) => {
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
      })
      .finally(() => {
        clearTimeout(maxBootTimer);
        finishInitialLoad();
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted || event === 'INITIAL_SESSION' || event === 'USER_UPDATED') return;
      if (session) {
        void applySupabaseSession(session, session.user);
      } else if (event === 'SIGNED_OUT') {
        setSupabaseUserId(null);
        setAuthToken(null);
        setUser(null);
        setOrders([]);
        setWishlistIds([]);
      }
    });

    const handlePopState = () => {
      if (window.location.pathname === '/account') {
        transitionToView('account');
      } else if (window.location.pathname === '/clothes') {
        transitionToView('clothes');
      } else if (window.location.pathname === '/footwear') {
        transitionToView('footwear');
      } else if (window.location.pathname === '/home-living') {
        transitionToView('home-living');
      } else if (window.location.pathname === '/accessories') {
        transitionToView('accessories');
      } else if (
        window.location.pathname === '/tech-goods' ||
        window.location.pathname === '/electronics'
      ) {
        transitionToView('tech-goods');
      } else if (window.location.pathname === '/beauty') {
        transitionToView('beauty');
      } else {
        transitionToView('store');
      }
    };
    window.addEventListener('popstate', handlePopState);

    return () => {
      mounted = false;
      clearTimeout(maxBootTimer);
      subscription.unsubscribe();
      window.removeEventListener('popstate', handlePopState);
    };
  }, [applyBackendSession, applySupabaseSession, transitionToView]);

  const totalBagCount = useMemo(
    () => cartItems.reduce((sum, item) => sum + item.quantity, 0),
    [cartItems],
  );

  const highlightProducts = useMemo(
    () => PRODUCTS.filter((item) => item.trending || item.bestSeller).slice(0, 6),
    [],
  );

  const selectedCategoryMeta = useMemo(
    () => SHOP_BY_CATEGORIES.find((c) => c.id === selectedCategory) ?? null,
    [selectedCategory],
  );

  const selectedCategoryProducts = useMemo(
    () => (selectedCategory ? PRODUCTS.filter((item) => item.category === selectedCategory) : []),
    [selectedCategory],
  );

  const openStoreView = () => {
    transitionToView('store', {
      pushPath: '/',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openClothesView = () => {
    transitionToView('clothes', {
      pushPath: '/clothes',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openFootwearView = () => {
    transitionToView('footwear', {
      pushPath: '/footwear',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openHomeLivingView = () => {
    transitionToView('home-living', {
      pushPath: '/home-living',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openAccessoriesView = () => {
    transitionToView('accessories', {
      pushPath: '/accessories',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openTechGoodsView = () => {
    transitionToView('tech-goods', {
      pushPath: '/tech-goods',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openBeautyView = () => {
    transitionToView('beauty', {
      pushPath: '/beauty',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const openAccountView = (tab: AccountTab = 'profile') => {
    if (!user) {
      setAuthMode('login');
      setIsAuthOpen(true);
      return;
    }
    setAccountTab(tab);
    transitionToView('account', {
      pushPath: '/account',
      afterSwap: () => window.scrollTo({ top: 0, behavior: 'auto' }),
    });
  };

  const handleCategoryNavClick = (category: ProductCategory) => {
    setSelectedCategory(category);
    if (view !== 'store') {
      transitionToView('store', {
        pushPath: '/',
        afterSwap: () => {
          setTimeout(() => {
            categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 80);
        },
      });
    } else {
      setRouteSweepKey((k) => k + 1);
      categoriesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleAddToCart = async (product: Product, variant?: string, quantity = 1) => {
    if (!product.inStock) return;
    const chosenVariant = variant || product.variants[0];
    const nextCart = mergeCartItems(cartItemsRef.current, [
      { productId: product.id, variant: chosenVariant, quantity },
    ]);
    setCartItems(nextCart);
    setJustAddedId(product.id);
    setTimeout(() => {
      setJustAddedId((current) => (current === product.id ? null : current));
    }, 1100);

    const activeSbUserId = await resolveSupabaseUserId();
    if (activeSbUserId) {
      const updatedItem = nextCart.find(
        (item) => item.productId === product.id && item.variant === chosenVariant,
      );
      if (updatedItem) {
        try {
          await upsertSupabaseCartItem(activeSbUserId, updatedItem);
        } catch (err) {
          console.warn('Supabase cart upsert failed:', err);
          setNotification({
            title: 'Bag Sync Error',
            message:
              err instanceof Error
                ? err.message
                : 'Could not save bag item to Supabase. Check table permissions.',
          });
        }
      }
    } else {
      await syncCartToServer(nextCart);
    }
  };

  const handleToggleWishlist = async (productId: string) => {
    const previousWishlist = wishlistIdsRef.current;
    const exists = previousWishlist.includes(productId);
    const nextWishlist = exists
      ? previousWishlist.filter((id) => id !== productId)
      : [productId, ...previousWishlist];
    setWishlistIds(nextWishlist);

    const activeSbUserId = await resolveSupabaseUserId();
    if (activeSbUserId) {
      try {
        if (exists) {
          await removeSupabaseWishlistItem(activeSbUserId, productId);
        } else {
          await addWishlistItem(activeSbUserId, productId);
        }
      } catch (err) {
        console.warn('Supabase wishlist update failed:', err);
        setWishlistIds(previousWishlist);
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not save wishlist item to Supabase.';
        setNotification({
          title: 'Wishlist Not Saved',
          message: /permission denied/i.test(msg)
            ? 'Supabase denied access to wishlist_items. Please run the updated supabase/schema.sql (including GRANT statements) in your Supabase SQL Editor.'
            : msg,
        });
      }
    } else {
      await syncWishlistToServer(nextWishlist);
    }
  };

  const handleUpdateProfile = async (updates: {
    name: string;
    dob: string;
    phone: string;
    defaultAddress: ShippingAddress | null;
  }) => {
    const activeSbUserId = await resolveSupabaseUserId();
    if (!authToken && !activeSbUserId) {
      throw new Error('Please sign in to update your profile.');
    }

    if (activeSbUserId) {
      const savedProfile = await updateSupabaseProfile(activeSbUserId, updates);
      setUser(savedProfile);
      try {
        await supabase.auth.updateUser({
          data: {
            name: savedProfile.name,
            full_name: savedProfile.name,
            display_name: savedProfile.name,
            dob: savedProfile.dob ?? null,
            phone: savedProfile.phone ?? null,
            defaultAddress: savedProfile.defaultAddress ?? null,
          },
        });
      } catch {
        // Profile row is already saved in Supabase `profiles` table
      }
      return;
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
    setNotification({
      title: 'Local Session Only',
      message:
        'Saved locally because no active Supabase Auth session was found. Please Sign Out and Sign In again to save directly to Supabase.',
    });
  };

  const handleUpdateQuantity = async (productId: string, variant: string, quantity: number) => {
    const previousCart = cartItemsRef.current;
    const nextCart =
      quantity <= 0
        ? previousCart.filter(
            (item) => !(item.productId === productId && item.variant === variant),
          )
        : previousCart.map((item) =>
            item.productId === productId && item.variant === variant
              ? { ...item, quantity: Math.min(20, quantity) }
              : item,
          );
    setCartItems(nextCart);
    const activeSbUserId = await resolveSupabaseUserId();
    if (activeSbUserId) {
      try {
        await updateSupabaseCartItemQuantity(activeSbUserId, productId, variant, quantity);
      } catch (err) {
        console.warn('Supabase cart quantity update failed:', err);
        setCartItems(previousCart);
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not update bag item in Supabase.';
        setNotification({
          title: 'Bag Sync Error',
          message: /permission denied/i.test(msg)
            ? 'Supabase denied access to cart_items. Please run supabase/schema.sql in your Supabase SQL Editor.'
            : msg,
        });
      }
    } else {
      await syncCartToServer(nextCart);
    }
  };

  const handleRemoveItem = async (productId: string, variant: string) => {
    const previousCart = cartItemsRef.current;
    const nextCart = previousCart.filter(
      (item) => !(item.productId === productId && item.variant === variant),
    );
    setCartItems(nextCart);
    const activeSbUserId = await resolveSupabaseUserId();
    if (activeSbUserId) {
      try {
        await removeSupabaseCartItem(activeSbUserId, productId, variant);
      } catch (err) {
        console.warn('Supabase cart delete failed:', err);
        setCartItems(previousCart);
        const msg =
          err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Could not remove bag item from Supabase.';
        setNotification({
          title: 'Bag Sync Error',
          message: /permission denied/i.test(msg)
            ? 'Supabase denied access to cart_items. Please run supabase/schema.sql in your Supabase SQL Editor.'
            : msg,
        });
      }
    } else {
      await syncCartToServer(nextCart);
    }
  };

  const handleAuthSuccess = async (
    session: Session | null,
    supabaseUser: SupabaseUser | null,
    meta?: AuthSuccessMeta,
  ) => {
    await applySupabaseSession(session, supabaseUser);
    if (meta?.isNewAccount && meta.name && supabaseUser && session) {
      try {
        const updatedProfile = await updateSupabaseProfile(supabaseUser.id, {
          name: meta.name,
          dob: '',
          phone: '',
          defaultAddress: null,
        });
        setUser(updatedProfile);
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
        message: meta.supabaseSynced
          ? 'You have successfully created an account. Your details are saved in shopEase and Supabase!'
          : 'You have successfully created an account in shopEase. Supabase Auth paused sync due to its email rate limit—turn off "Confirm email" in Supabase Auth or add SUPABASE_SECRET_KEY in Secrets to sync every signup immediately.',
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
    setSupabaseUserId(null);
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
    const activeSbUserId = await resolveSupabaseUserId();
    if (!authToken && !activeSbUserId) {
      throw new Error('Please sign in before placing your order.');
    }

    if (activeSbUserId) {
      const order = await createSupabaseOrder(
        activeSbUserId,
        cartItemsRef.current,
        shippingAddress,
        paymentMethod,
      );
      setCartItems([]);
      setOrders((prev) => [order, ...prev]);
      return order;
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
    <div className="min-h-screen flex flex-col bg-[#FBF6EE] text-[#2C1A12]">
      {view === 'store' && showAnnouncement && (
        <div
          role="region"
          aria-label="Store announcement"
          className="bg-[#3B2316] text-[#FFFDF9] border-b border-[#4E2C19] h-9 px-4 flex items-center justify-between gap-3 text-xs"
        >
          <span className="hidden sm:inline-block w-7 shrink-0" aria-hidden="true" />
          <div className="flex items-center justify-center gap-2 sm:gap-3 min-w-0 truncate">
            <span className="truncate">
              Discover new arrivals. Exclusive styles, just for you
            </span>
            <a
              href="#trending"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
              }}
              className="text-[#B8DDF5] hover:text-[#FFFDF9] font-medium underline underline-offset-2 whitespace-nowrap shrink-0 transition-colors"
            >
              Shop Trending
            </a>
          </div>
          <button
            type="button"
            onClick={() => setShowAnnouncement(false)}
            aria-label="Dismiss announcement"
            className="w-7 h-7 flex items-center justify-center rounded text-[#E4D8C6] hover:text-[#FFFDF9] hover:bg-[#4E2C19] transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Top Bar Contract: [Brand title, one line] — [4-5 nav links] — [1 primary action] */}
      <header className="sticky top-0 z-40 bg-[#FBF6EE]/95 backdrop-blur-sm border-b border-[#E4D8C6]">
        {routeSweepKey > 0 && (
          <div
            key={routeSweepKey}
            aria-hidden="true"
            className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-[#6B3F26] via-[#2D6F99] to-[#68B0DF] animate-route-sweep pointer-events-none"
          />
        )}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="/"
            onClick={(e) => {
              e.preventDefault();
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="font-display text-base sm:text-lg font-bold tracking-tight text-[#2C1A12] whitespace-nowrap shrink-0"
          >
            shopEase
          </a>

          <nav
            aria-label="Primary navigation"
            className="hidden md:flex items-center gap-4 lg:gap-5 text-xs lg:text-sm font-medium text-[#63493B] min-w-0 overflow-x-auto [scrollbar-width:none]"
          >
            <button
              type="button"
              onClick={() => {
                setSelectedCategory(null);
                openStoreView();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'store' && selectedCategory === null
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Home
            </button>
            <button
              type="button"
              onClick={openClothesView}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'clothes'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Clothes
            </button>
            <button
              type="button"
              onClick={openFootwearView}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'footwear'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Footwear
            </button>
            <button
              type="button"
              onClick={openHomeLivingView}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'home-living'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Home &amp; Living
            </button>
            <button
              type="button"
              onClick={openAccessoriesView}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'accessories'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Accessories
            </button>
            <button
              type="button"
              onClick={openTechGoodsView}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'tech-goods'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Tech Goods
            </button>
            <button
              type="button"
              onClick={openBeautyView}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'beauty'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              Beauty
            </button>
            <button
              type="button"
              onClick={() => openAccountView('profile')}
              className={`hover:text-[#2C1A12] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                view === 'account'
                  ? 'text-[#2C1A12] underline decoration-[#6B3F26] decoration-2 underline-offset-4'
                  : ''
              }`}
            >
              {firstName ? `Account (${firstName})` : 'Account'}
            </button>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setIsCartOpen(true)}
              className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-medium text-[#FFFDF9] bg-[#6B3F26] hover:bg-[#4E2C19] rounded-lg transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5CA4D6]"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span className="font-mono tabular-nums">Bag ({totalBagCount})</span>
            </button>
          </div>
        </div>
      </header>

      <main id="top" className="flex-1">
        <div key={view} className="animate-page-enter">
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
        ) : view === 'clothes' ? (
          <ClothesPage
            products={PRODUCTS}
            justAddedId={justAddedId}
            wishlistIds={wishlistIds}
            onBackToHome={() => {
              setSelectedCategory(null);
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={(product) => handleAddToCart(product)}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : view === 'footwear' ? (
          <FootwearPage
            products={PRODUCTS}
            justAddedId={justAddedId}
            wishlistIds={wishlistIds}
            onBackToHome={() => {
              setSelectedCategory(null);
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={(product) => handleAddToCart(product)}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : view === 'home-living' ? (
          <HomeLivingPage
            products={PRODUCTS}
            justAddedId={justAddedId}
            wishlistIds={wishlistIds}
            onBackToHome={() => {
              setSelectedCategory(null);
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={(product) => handleAddToCart(product)}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : view === 'accessories' ? (
          <AccessoriesPage
            products={PRODUCTS}
            justAddedId={justAddedId}
            wishlistIds={wishlistIds}
            onBackToHome={() => {
              setSelectedCategory(null);
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={(product) => handleAddToCart(product)}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : view === 'tech-goods' ? (
          <TechGoodsPage
            products={PRODUCTS}
            justAddedId={justAddedId}
            wishlistIds={wishlistIds}
            onBackToHome={() => {
              setSelectedCategory(null);
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={(product) => handleAddToCart(product)}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : view === 'beauty' ? (
          <BeautyPage
            products={PRODUCTS}
            justAddedId={justAddedId}
            wishlistIds={wishlistIds}
            onBackToHome={() => {
              setSelectedCategory(null);
              openStoreView();
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onSelectProduct={(product) => setSelectedProduct(product)}
            onQuickAdd={(product) => handleAddToCart(product)}
            onToggleWishlist={handleToggleWishlist}
          />
        ) : (
          <>
        {/* Section 1: Storefront Hero */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-12 pb-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-5 flex flex-col justify-between bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-7 sm:p-10">
              <div>
                <p className="text-xs font-medium text-[#2D6F99]">
                  New Arrivals · Clothes, Accessories & Tech Goods
                </p>
                <h1
                  className="mt-4 font-display font-semibold tracking-tight text-[#2C1A12] leading-[1.08]"
                  style={{ fontSize: 'clamp(2.25rem, 3.6vw, 3.25rem)', textWrap: 'balance' }}
                >
                  Everyday style and smart tech, all in one place.
                </h1>
                <p className="mt-5 text-[15px] text-[#63493B] leading-relaxed max-w-[42ch]">
                  Shop comfortable clothes, classic accessories, and reliable tech goods—made for daily life and priced clearly in rupees.
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-[#EFE5D6] flex flex-wrap items-center gap-3">
                <a
                  href="#trending"
                  onClick={(e) => {
                    e.preventDefault();
                    document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                  className="inline-flex items-center gap-2 min-h-[44px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-sm font-medium rounded-lg transition-colors whitespace-nowrap shrink-0"
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
                  className="inline-flex items-center min-h-[44px] px-4 py-2.5 text-sm font-medium text-[#1E4E6E] bg-[#E1F0FA] hover:bg-[#CBE4F6] border border-[#A8D4F0] rounded-lg transition-colors whitespace-nowrap shrink-0"
                >
                  {user ? 'My Account & Orders' : 'Sign In / Join'}
                </button>
              </div>
            </div>

            <div className="lg:col-span-7 rounded-2xl overflow-hidden border border-[#E4D8C6] bg-[#F3EBDD] min-h-[280px] sm:min-h-[380px]">
              <ResilientImage
                src={HERO_IMAGE}
                alt="shopEase studio collection featuring charcoal merino overshirt, anodized aluminum headphones, and espresso leather briefcase"
                fallbackLabel="shopEase Collection"
                className="w-full h-full object-cover"
              />
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl px-6 py-4 text-xs">
            <div className="flex items-center justify-between sm:justify-start sm:gap-3">
              <span className="font-semibold text-[#2C1A12]">Free Delivery</span>
              <span className="text-[#7C6354]">Orders above ₹4,999</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:border-l sm:border-[#EFE5D6] sm:pl-6">
              <span className="font-semibold text-[#2C1A12]">Safe Checkout</span>
              <span className="text-[#7C6354]">Secure sign-in & order tracking</span>
            </div>
            <div className="flex items-center justify-between sm:justify-start sm:gap-3 sm:border-l sm:border-[#EFE5D6] sm:pl-6">
              <span className="font-semibold text-[#2C1A12]">Easy Returns</span>
              <span className="text-[#7C6354]">30-day return & warranty support</span>
            </div>
          </div>
        </section>

        {/* Section 2: Shop by Categories */}
        <section
          id="categories"
          ref={categoriesRef}
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-t border-[#E4D8C6]"
        >
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-6">
            <div>
              <p className="text-xs font-medium text-[#2D6F99]">Browse Departments</p>
              <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#2C1A12]">
                Shop by Categories
              </h2>
            </div>
            <button
              type="button"
              onClick={openClothesView}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#2D6F99] hover:text-[#1E4E6E] whitespace-nowrap self-start sm:self-auto"
            >
              Open Full Clothes Collection
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {SHOP_BY_CATEGORIES.map((cat) => {
              const count = PRODUCTS.filter((p) => p.category === cat.id).length;
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    if (cat.id === 'apparel') {
                      setSelectedCategory(null);
                      openClothesView();
                      return;
                    }
                    if (cat.id === 'footwear') {
                      setSelectedCategory(null);
                      openFootwearView();
                      return;
                    }
                    if (cat.id === 'home-living') {
                      setSelectedCategory(null);
                      openHomeLivingView();
                      return;
                    }
                    if (cat.id === 'accessories') {
                      setSelectedCategory(null);
                      openAccessoriesView();
                      return;
                    }
                    if (cat.id === 'electronics') {
                      setSelectedCategory(null);
                      openTechGoodsView();
                      return;
                    }
                    if (cat.id === 'beauty') {
                      setSelectedCategory(null);
                      openBeautyView();
                      return;
                    }
                    setSelectedCategory((prev) => (prev === cat.id ? null : cat.id));
                  }}
                  className={`group text-left rounded-xl overflow-hidden border transition-all duration-200 hover:-translate-y-0.5 active:scale-[0.98] cursor-pointer focus-visible:outline-2 focus-visible:outline-[#5CA4D6] ${
                    isSelected
                      ? 'bg-[#E1F0FA] border-[#5CA4D6]'
                      : 'bg-[#FFFDF9] border-[#E4D8C6] hover:border-[#6B3F26]'
                  }`}
                >
                  <div className="aspect-[4/3] w-full bg-[#F3EBDD] overflow-hidden">
                    <ResilientImage
                      src={cat.image}
                      alt={cat.title}
                      fallbackLabel={cat.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  </div>
                  <div className="p-3.5">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-sm font-semibold text-[#2C1A12] truncate">
                        {cat.title}
                      </h3>
                      <span className="font-mono text-[11px] text-[#7C6354] tabular-nums shrink-0">
                        {count}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-[#63493B] truncate">{cat.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>

          {selectedCategoryMeta && selectedCategoryProducts.length > 0 && (
            <div
              key={selectedCategoryMeta.id}
              className="mt-6 pt-6 border-t border-[#E4D8C6] animate-panel-enter"
            >
              <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
                <div>
                  <h3 className="font-display text-lg font-semibold text-[#2C1A12]">
                    {selectedCategoryMeta.title}
                  </h3>
                  <p className="text-xs text-[#63493B]">
                    {selectedCategoryMeta.subtitle} · {selectedCategoryProducts.length} items
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {selectedCategoryMeta.id === 'apparel' && (
                    <button
                      type="button"
                      onClick={openClothesView}
                      className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#FFFDF9] bg-[#6B3F26] hover:bg-[#4E2C19] rounded-lg transition-colors whitespace-nowrap"
                    >
                      Open Clothes Page
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(null)}
                    aria-label={`Close ${selectedCategoryMeta.title} preview`}
                    className="inline-flex items-center gap-1 min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#1E4E6E] bg-[#E1F0FA] hover:bg-[#CBE4F6] border border-[#A8D4F0] rounded-lg transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                    Close
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
                {selectedCategoryProducts.map((product) => (
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
            </div>
          )}
        </section>

        {/* Section 3: Trending / Best Selling Products */}
        <section
          id="trending"
          className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 border-t border-[#E4D8C6]"
        >
          <div className="mb-6">
            <p className="text-xs font-medium text-[#2D6F99]">Customer Favorites</p>
            <h2 className="mt-1 font-display text-2xl sm:text-3xl font-semibold tracking-tight text-[#2C1A12]">
              Trending & Best Selling Products
            </h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {highlightProducts.map((product) => (
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
        </section>

        {/* Section 4: Material & Craftsmanship Standards */}
        <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 border-t border-[#E4D8C6]">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <p className="font-mono text-xs text-[#2D6F99]">01</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#2C1A12]">
                Tailored Textiles
              </h3>
              <p className="mt-2 text-sm text-[#63493B] leading-relaxed">
                Double-faced Italian merino, shuttle-loomed Japanese selvedge, and heavyweight organic loopback cotton selected for multi-season longevity.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#2D6F99]">02</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#2C1A12]">
                Architectural Carry
              </h3>
              <p className="mt-2 text-sm text-[#63493B] leading-relaxed">
                Vegetable-tanned full-grain hides, Grade-5 titanium watch cases, and hand-finished Japanese cellulose acetate built for daily utility.
              </p>
            </div>
            <div>
              <p className="font-mono text-xs text-[#2D6F99]">03</p>
              <h3 className="mt-2 font-display text-lg font-semibold text-[#2C1A12]">
                Precision Tech Goods
              </h3>
              <p className="mt-2 text-sm text-[#63493B] leading-relaxed">
                CNC-milled aluminum acoustics, open-firmware mechanical keyboards, and weighted Qi2 power docks engineered without disposable plastics.
              </p>
            </div>
          </div>
        </section>
          </>
        )}
        </div>
      </main>

      {/* Footer Section */}
      <footer className="border-t border-[#1E3A5F] bg-[#0F2744] text-[#FFFDF9]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 pb-10 border-b border-[#22436B]">
            <div className="space-y-3">
              <p className="font-display text-lg font-bold tracking-tight text-[#FFFDF9]">
                shopEase
              </p>
              <p className="text-xs text-[#D4E3F3] leading-relaxed max-w-[28ch]">
                Everyday clothes, electronics, footwear, home & living, accessories, and beauty—curated in Indian Rupee pricing.
              </p>
              <button
                type="button"
                onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
                className="inline-flex items-center gap-1.5 min-h-[34px] px-3 py-1.5 text-xs font-medium text-[#0F2744] bg-[#E1F0FA] hover:bg-[#CBE4F6] border border-[#A8D4F0] rounded-lg transition-colors whitespace-nowrap"
              >
                Back to Top
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <h3 className="font-display text-xs font-semibold text-[#FFFDF9]">
                Shop by Categories
              </h3>
              <ul className="space-y-2 text-[#D4E3F3]">
                <li>
                  <button type="button" onClick={openClothesView} className="hover:text-[#FFFDF9] transition-colors">
                    Fashion & Clothes
                  </button>
                </li>
                <li>
                  <button type="button" onClick={openTechGoodsView} className="hover:text-[#FFFDF9] transition-colors">
                    Tech Goods & Electronics
                  </button>
                </li>
                <li>
                  <button type="button" onClick={openFootwearView} className="hover:text-[#FFFDF9] transition-colors">
                    Footwear
                  </button>
                </li>
                <li>
                  <button type="button" onClick={openHomeLivingView} className="hover:text-[#FFFDF9] transition-colors">
                    Home & Living
                  </button>
                </li>
                <li>
                  <button type="button" onClick={openAccessoriesView} className="hover:text-[#FFFDF9] transition-colors">
                    Accessories
                  </button>
                </li>
                <li>
                  <button type="button" onClick={openBeautyView} className="hover:text-[#FFFDF9] transition-colors">
                    Beauty
                  </button>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5 text-xs">
              <h3 className="font-display text-xs font-semibold text-[#FFFDF9]">
                Account & Orders
              </h3>
              <ul className="space-y-2 text-[#D4E3F3]">
                <li>
                  <button type="button" onClick={() => openAccountView('profile')} className="hover:text-[#FFFDF9] transition-colors">
                    My Profile & DOB
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openAccountView('orders')} className="hover:text-[#FFFDF9] transition-colors">
                    Orders & Tracking
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => openAccountView('wishlist')} className="hover:text-[#FFFDF9] transition-colors">
                    Saved Wishlist
                  </button>
                </li>
                <li>
                  <button type="button" onClick={() => setIsCartOpen(true)} className="hover:text-[#FFFDF9] transition-colors">
                    Shopping Bag ({totalBagCount})
                  </button>
                </li>
                {!user && (
                  <li>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('register');
                        setIsAuthOpen(true);
                      }}
                      className="hover:text-[#FFFDF9] transition-colors"
                    >
                      Sign In / Create Account
                    </button>
                  </li>
                )}
              </ul>
            </div>

            <div className="space-y-2.5 text-xs">
              <h3 className="font-display text-xs font-semibold text-[#FFFDF9]">
                Customer Care
              </h3>
              <ul className="space-y-2 text-[#D4E3F3]">
                <li>Free delivery on orders above ₹4,999</li>
                <li>30-day easy returns & size exchange</li>
                <li>Card & Cash on Delivery across India</li>
                <li className="text-[#9CD0F5] font-medium">support@shopease.in</li>
              </ul>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-[#AFC7DF]">
            <p>© 2026 shopEase. All rights reserved.</p>
          </div>
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
          className="fixed top-20 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm bg-[#FFFDF9] border border-[#A8D4F0] rounded-xl shadow-lg p-4 flex items-start gap-3 animate-toast-enter"
        >
          <CheckCircle2 className="w-5 h-5 text-[#15803D] shrink-0 mt-0.5" />
          <div className="flex-1 min-w-0">
            <p className="font-display text-sm font-semibold text-[#2C1A12]">
              {notification.title}
            </p>
            <p className="mt-1 text-xs text-[#63493B] leading-relaxed">
              {notification.message}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNotification(null)}
            aria-label="Dismiss notification"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-[#7C6354] hover:bg-[#F3EBDD] hover:text-[#2C1A12] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {showLoadingOverlay && (
        <LoadingPage
          isVisible={overlayActive}
          title={loadingMeta.title}
          label={loadingMeta.label}
          mode={isInitialLoading ? 'initial' : 'transition'}
        />
      )}
    </div>
  );
}
