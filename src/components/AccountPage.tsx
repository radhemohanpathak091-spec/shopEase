import { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Heart,
  LogOut,
  MapPin,
  Package,
  PackageCheck,
  Search,
  ShoppingBag,
  Trash2,
  Truck,
  User,
} from 'lucide-react';
import { formatINR } from '../lib/catalogData.ts';
import type { Order, Product, ShippingAddress, UserProfile } from '../types/store.ts';
import { ResilientImage } from './ResilientImage.tsx';

export type AccountTab = 'profile' | 'orders' | 'wishlist';

interface AccountPageProps {
  user: UserProfile;
  orders: Order[];
  ordersLoading: boolean;
  wishlistIds: string[];
  products: Product[];
  initialTab?: AccountTab;
  onBackToShop: () => void;
  onUpdateProfile: (updates: {
    name: string;
    dob: string;
    phone: string;
    defaultAddress: ShippingAddress | null;
  }) => Promise<void>;
  onRemoveWishlist: (productId: string) => void;
  onAddToCart: (product: Product, variant?: string) => void;
  onSelectProduct: (product: Product) => void;
  onLogout: () => Promise<void>;
}

const TRACKING_STEPS = [
  'Order Confirmed',
  'Packed at Warehouse',
  'In Transit',
  'Delivered',
] as const;

function formatOrderDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function getFallbackEta(createdAt: string): string {
  const created = new Date(createdAt);
  if (Number.isNaN(created.getTime())) return 'Within 4–5 business days';
  const eta = new Date(created.getTime() + 4 * 24 * 60 * 60 * 1000);
  return eta.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function AccountPage({
  user,
  orders,
  ordersLoading,
  wishlistIds,
  products,
  initialTab = 'profile',
  onBackToShop,
  onUpdateProfile,
  onRemoveWishlist,
  onAddToCart,
  onSelectProduct,
  onLogout,
}: AccountPageProps) {
  const [activeTab, setActiveTab] = useState<AccountTab>(initialTab);
  const [orderSearch, setOrderSearch] = useState('');

  const [name, setName] = useState(user.name);
  const [dob, setDob] = useState(user.dob || '');
  const [phone, setPhone] = useState(user.phone || '');
  const [street, setStreet] = useState(user.defaultAddress?.street || '');
  const [city, setCity] = useState(user.defaultAddress?.city || '');
  const [postalCode, setPostalCode] = useState(user.defaultAddress?.postalCode || '');
  const [country, setCountry] = useState(user.defaultAddress?.country || 'India');

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSaved, setProfileSaved] = useState(false);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    setName(user.name);
    setDob(user.dob || '');
    setPhone(user.phone || '');
    setStreet(user.defaultAddress?.street || '');
    setCity(user.defaultAddress?.city || '');
    setPostalCode(user.defaultAddress?.postalCode || '');
    setCountry(user.defaultAddress?.country || 'India');
  }, [user]);

  const wishlistProducts = useMemo(
    () => products.filter((p) => wishlistIds.includes(p.id)),
    [products, wishlistIds],
  );

  const totalSpent = useMemo(
    () => orders.reduce((sum, order) => sum + order.total, 0),
    [orders],
  );

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    if (!q) return orders;
    return orders.filter((order) => {
      const tracking = (order.trackingNumber || `SHP-${order.id.replace('ORD-', '')}`).toLowerCase();
      const itemMatch = order.items.some((item) => item.name.toLowerCase().includes(q));
      return order.id.toLowerCase().includes(q) || tracking.includes(q) || itemMatch;
    });
  }, [orders, orderSearch]);

  const todayIso = new Date().toISOString().split('T')[0];

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileError(null);
    setProfileSaved(false);
    setSavingProfile(true);
    try {
      const hasAddressInput =
        street.trim() !== '' || city.trim() !== '' || postalCode.trim() !== '';
      await onUpdateProfile({
        name: name.trim(),
        dob: dob.trim(),
        phone: phone.trim(),
        defaultAddress: hasAddressInput
          ? {
              fullName: name.trim(),
              street: street.trim(),
              city: city.trim(),
              postalCode: postalCode.trim(),
              country: country.trim() || 'India',
            }
          : null,
      });
      setProfileSaved(true);
      setTimeout(() => setProfileSaved(false), 3500);
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : err && typeof err === 'object' && 'message' in err
            ? String((err as { message: unknown }).message)
            : 'Unable to save profile details.';
      setProfileError(msg);
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
      {/* Top Breadcrumb & Sign Out */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <button
          type="button"
          onClick={onBackToShop}
          className="inline-flex items-center gap-2 min-h-[40px] px-3.5 py-2 text-xs font-medium text-[#1E4E6E] bg-[#E1F0FA] border border-[#A8D4F0] rounded-lg hover:bg-[#CBE4F6] transition-colors whitespace-nowrap shrink-0"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Storefront
        </button>

        <button
          type="button"
          onClick={onLogout}
          className="inline-flex items-center gap-2 min-h-[40px] px-4 py-2 text-xs font-medium text-[#2C1A12] bg-[#FFFDF9] border border-[#E4D8C6] rounded-lg hover:bg-[#FEF2F2] hover:text-[#991B1B] hover:border-[#FECACA] transition-colors whitespace-nowrap shrink-0"
        >
          <LogOut className="w-3.5 h-3.5" />
          Sign Out
        </button>
      </div>

      {/* Account Header & Summary Metrics */}
      <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-6 sm:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#EFE5D6]">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#6B3F26] text-[#FFFDF9] flex items-center justify-center font-display text-lg font-semibold shrink-0">
              {user.name.slice(0, 1).toUpperCase()}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold text-[#2C1A12] tracking-tight">
                {user.name}
              </h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#63493B]">
                <span>{user.email}</span>
                <span aria-hidden="true">·</span>
                <span>
                  {user.dob ? `DOB: ${formatOrderDate(user.dob)}` : 'DOB not added yet'}
                </span>
                <span aria-hidden="true">·</span>
                <span>Member since {formatOrderDate(user.createdAt)}</span>
              </div>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Account sections"
            className="flex items-center gap-1 p-1 bg-[#F3EBDD] rounded-lg overflow-x-auto"
          >
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'profile'}
              onClick={() => setActiveTab('profile')}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-[#FFFDF9] text-[#2C1A12] shadow-xs'
                  : 'text-[#63493B] hover:text-[#2C1A12]'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              Profile & Details
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'orders'}
              onClick={() => setActiveTab('orders')}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'orders'
                  ? 'bg-[#FFFDF9] text-[#2C1A12] shadow-xs'
                  : 'text-[#63493B] hover:text-[#2C1A12]'
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Orders & Tracking ({orders.length})
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={activeTab === 'wishlist'}
              onClick={() => setActiveTab('wishlist')}
              className={`inline-flex items-center gap-1.5 min-h-[38px] px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'wishlist'
                  ? 'bg-[#FFFDF9] text-[#2C1A12] shadow-xs'
                  : 'text-[#63493B] hover:text-[#2C1A12]'
              }`}
            >
              <Heart className="w-3.5 h-3.5" />
              Wishlist ({wishlistProducts.length})
            </button>
          </div>
        </div>

        <div className="pt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
          <div>
            <p className="text-[#7C6354]">Previous Orders</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#2C1A12] tabular-nums">
              {orders.length}
            </p>
          </div>
          <div className="sm:border-l sm:border-[#EFE5D6] sm:pl-6">
            <p className="text-[#7C6354]">Saved in Wishlist</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#2C1A12] tabular-nums">
              {wishlistProducts.length}
            </p>
          </div>
          <div className="sm:border-l sm:border-[#EFE5D6] sm:pl-6">
            <p className="text-[#7C6354]">Total Order Value</p>
            <p className="mt-1 font-mono text-xl font-semibold text-[#2C1A12] tabular-nums">
              {formatINR(totalSpent)}
            </p>
          </div>
        </div>
      </div>

      {/* Tab 1: Profile & Details */}
      {activeTab === 'profile' && (
        <div key="profile" className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-panel-enter">
          <form
            onSubmit={handleProfileSubmit}
            className="lg:col-span-8 bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-6 sm:p-8 space-y-6"
          >
            <div>
              <h2 className="font-display text-lg font-semibold text-[#2C1A12]">
                Personal Information
              </h2>
              <p className="mt-1 text-xs text-[#7C6354]">
                Keep your name, date of birth, and delivery address up to date for faster checkout.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="acc-name" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                  Full Name
                </label>
                <input
                  id="acc-name"
                  type="text"
                  required
                  minLength={2}
                  maxLength={80}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                />
              </div>

              <div>
                <label htmlFor="acc-dob" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                  Date of Birth (DOB)
                </label>
                <div className="relative">
                  <input
                    id="acc-dob"
                    type="date"
                    max={todayIso}
                    value={dob}
                    onChange={(e) => setDob(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="acc-email" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                  Email Address
                </label>
                <input
                  id="acc-email"
                  type="email"
                  readOnly
                  value={user.email}
                  className="w-full h-11 px-3.5 text-sm bg-[#F5EFE4] border border-[#E4D8C6] rounded-lg text-[#63493B] cursor-not-allowed"
                />
              </div>

              <div>
                <label htmlFor="acc-phone" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                  Phone Number
                </label>
                <input
                  id="acc-phone"
                  type="tel"
                  maxLength={20}
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                />
              </div>
            </div>

            <div className="pt-6 border-t border-[#EFE5D6] space-y-4">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-[#6B3F26]" />
                <h3 className="font-display text-base font-semibold text-[#2C1A12]">
                  Default Delivery Address
                </h3>
              </div>

              <div>
                <label htmlFor="acc-street" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                  Street Address
                </label>
                <input
                  id="acc-street"
                  type="text"
                  maxLength={160}
                  placeholder="12 MG Road, Indiranagar"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="acc-city" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                    City
                  </label>
                  <input
                    id="acc-city"
                    type="text"
                    maxLength={80}
                    placeholder="Bengaluru"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
                <div>
                  <label htmlFor="acc-pin" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                    PIN Code
                  </label>
                  <input
                    id="acc-pin"
                    type="text"
                    maxLength={20}
                    placeholder="560001"
                    value={postalCode}
                    onChange={(e) => setPostalCode(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
                <div>
                  <label htmlFor="acc-country" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                    Country
                  </label>
                  <input
                    id="acc-country"
                    type="text"
                    maxLength={80}
                    value={country}
                    onChange={(e) => setCountry(e.target.value)}
                    className="w-full h-11 px-3.5 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
              </div>
            </div>

            {profileError && (
              <div
                role="alert"
                className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{profileError}</span>
              </div>
            )}

            {profileSaved && (
              <div
                role="status"
                className="flex items-center gap-2 p-3.5 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] text-xs font-medium"
              >
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>Your account details have been saved.</span>
              </div>
            )}

            <div className="pt-2 flex items-center justify-end">
              <button
                type="submit"
                disabled={savingProfile}
                className="min-h-[44px] px-6 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] disabled:opacity-60 text-[#FFFDF9] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {savingProfile ? 'Saving...' : 'Save Account Details'}
              </button>
            </div>
          </form>

          {/* Right Summary Card */}
          <aside className="lg:col-span-4 space-y-6">
            <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-6 space-y-4">
              <h3 className="font-display text-base font-semibold text-[#2C1A12]">
                Account Snapshot
              </h3>
              <dl className="divide-y divide-[#EFE5D6] text-xs">
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#7C6354]">Name</dt>
                  <dd className="font-medium text-[#2C1A12] text-right">{user.name}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#7C6354]">Email</dt>
                  <dd className="font-medium text-[#2C1A12] text-right truncate">{user.email}</dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#7C6354] inline-flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" />
                    DOB
                  </dt>
                  <dd className="font-medium text-[#2C1A12] text-right">
                    {user.dob ? formatOrderDate(user.dob) : 'Not set'}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#7C6354]">Phone</dt>
                  <dd className="font-medium text-[#2C1A12] text-right">
                    {user.phone || 'Not set'}
                  </dd>
                </div>
                <div className="py-2.5 flex justify-between gap-4">
                  <dt className="text-[#7C6354]">Saved Address</dt>
                  <dd className="font-medium text-[#2C1A12] text-right">
                    {user.defaultAddress
                      ? `${user.defaultAddress.city}, ${user.defaultAddress.postalCode}`
                      : 'Not set'}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-6 space-y-3">
              <h3 className="font-display text-base font-semibold text-[#2C1A12]">
                Quick Shortcuts
              </h3>
              <button
                type="button"
                onClick={() => setActiveTab('orders')}
                className="w-full min-h-[40px] px-4 py-2 text-xs font-medium text-left text-[#2C1A12] bg-[#FBF6EE] hover:bg-[#E1F0FA] hover:border-[#A8D4F0] hover:text-[#1E4E6E] border border-[#E4D8C6] rounded-lg flex items-center justify-between transition-colors"
              >
                <span>Track Recent Orders</span>
                <span className="font-mono text-[#63493B] tabular-nums">{orders.length}</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('wishlist')}
                className="w-full min-h-[40px] px-4 py-2 text-xs font-medium text-left text-[#2C1A12] bg-[#FBF6EE] hover:bg-[#E1F0FA] hover:border-[#A8D4F0] hover:text-[#1E4E6E] border border-[#E4D8C6] rounded-lg flex items-center justify-between transition-colors"
              >
                <span>View Saved Wishlist</span>
                <span className="font-mono text-[#63493B] tabular-nums">
                  {wishlistProducts.length}
                </span>
              </button>
            </div>
          </aside>
        </div>
      )}

      {/* Tab 2: Previous Orders & Live Order Tracking */}
      {activeTab === 'orders' && (
        <div key="orders" className="space-y-6 animate-panel-enter">
          <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#2C1A12]">
                Previous Orders & Shipment Tracking
              </h2>
              <p className="text-xs text-[#7C6354] mt-0.5">
                View your purchase receipts, delivery progress, and tracking numbers.
              </p>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-[#7C6354] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="search"
                value={orderSearch}
                onChange={(e) => setOrderSearch(e.target.value)}
                placeholder="Search Order ID or Tracking..."
                aria-label="Search orders or tracking numbers"
                className="w-full h-10 pl-9 pr-3 text-xs bg-[#FBF6EE] border border-[#E4D8C6] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:bg-[#FFFDF9] focus:border-[#6B3F26]"
              />
            </div>
          </div>

          {ordersLoading ? (
            <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-12 text-center text-sm text-[#7C6354]">
              Loading your orders...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-12 text-center">
              <PackageCheck className="w-8 h-8 text-[#7C6354] mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold text-[#2C1A12]">
                {orders.length === 0 ? 'No previous orders yet' : 'No matching orders found'}
              </h3>
              <p className="text-xs text-[#7C6354] mt-1.5 max-w-md mx-auto">
                {orders.length === 0
                  ? 'Once you complete a checkout, your order receipt and live shipment tracker will appear here.'
                  : 'Try clearing your search filter to view all orders.'}
              </p>
              {orders.length === 0 && (
                <button
                  type="button"
                  onClick={onBackToShop}
                  className="mt-5 min-h-[40px] px-5 py-2 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
                >
                  Start Shopping
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredOrders.map((order) => {
                const currentStep = order.trackingStep ?? 1;
                const trackingId =
                  order.trackingNumber || `SHP-${order.id.replace('ORD-', '')}`;
                const etaLabel = order.estimatedDelivery
                  ? formatOrderDate(order.estimatedDelivery)
                  : getFallbackEta(order.createdAt);

                return (
                  <article
                    key={order.id}
                    className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl overflow-hidden"
                  >
                    <div className="px-6 py-4 bg-[#F5EFE4] border-b border-[#EFE5D6] flex flex-wrap items-center justify-between gap-4 text-xs">
                      <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                        <div>
                          <p className="text-[#7C6354]">Order ID</p>
                          <p className="font-mono font-semibold text-[#2C1A12] mt-0.5">{order.id}</p>
                        </div>
                        <div>
                          <p className="text-[#7C6354]">Placed On</p>
                          <p className="font-medium text-[#2C1A12] mt-0.5">
                            {formatOrderDate(order.createdAt)}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#7C6354]">Payment</p>
                          <p className="font-medium text-[#2C1A12] mt-0.5">
                            {order.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Instant Card'}
                          </p>
                        </div>
                        <div>
                          <p className="text-[#7C6354]">Total Paid</p>
                          <p className="font-mono font-semibold text-[#2C1A12] tabular-nums mt-0.5">
                            {formatINR(order.total)}
                          </p>
                        </div>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-[#7C6354]">Status</p>
                        <p className="font-medium text-[#15803D] mt-0.5">{order.status}</p>
                      </div>
                    </div>

                    {/* Order Tracking Timeline */}
                    <div className="px-6 py-5 border-b border-[#EFE5D6]">
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 text-xs">
                        <div className="flex items-center gap-2 text-[#2C1A12] font-medium">
                          <Truck className="w-4 h-4 text-[#2D6F99]" />
                          <span>Tracking ID:</span>
                          <span className="font-mono">{trackingId}</span>
                        </div>
                        <span className="text-[#63493B]">
                          Estimated Delivery: <strong className="text-[#2C1A12]">{etaLabel}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {TRACKING_STEPS.map((label, idx) => {
                          const completed = idx <= currentStep;
                          const isCurrent = idx === currentStep;
                          return (
                            <div
                              key={label}
                              className={`p-3 rounded-xl border text-xs ${
                                completed
                                  ? 'bg-[#E1F0FA] border-[#A8D4F0] text-[#1E4E6E]'
                                  : 'bg-[#FBF6EE] border-[#E4D8C6] text-[#7C6354]'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-mono text-[11px]">0{idx + 1}</span>
                                {completed ? (
                                  <CheckCircle2 className="w-3.5 h-3.5 text-[#2D6F99]" />
                                ) : (
                                  <Package className="w-3.5 h-3.5 text-[#9A8476]" />
                                )}
                              </div>
                              <p className="font-medium leading-snug">{label}</p>
                              <p className="text-[11px] mt-0.5 opacity-80">
                                {isCurrent ? 'Current Stage' : completed ? 'Completed' : 'Pending'}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Items & Delivery Address */}
                    <div className="p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-8 divide-y divide-[#EFE5D6]">
                        {order.items.map((item) => {
                          const catalogItem = products.find((p) => p.id === item.productId);
                          return (
                            <div
                              key={`${order.id}-${item.productId}-${item.variant}`}
                              className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4"
                            >
                              <div className="flex items-center gap-3.5 min-w-0">
                                <div className="w-14 h-14 rounded-lg overflow-hidden bg-[#F3EBDD] shrink-0">
                                  <ResilientImage
                                    src={item.image}
                                    alt={item.name}
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-[#2C1A12] truncate">
                                    {item.name}
                                  </p>
                                  <p className="text-xs text-[#7C6354] mt-0.5">
                                    {item.brand} · {item.variant} · Qty {item.quantity}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-3 shrink-0">
                                <span className="font-mono text-sm font-medium text-[#2C1A12] tabular-nums">
                                  {formatINR(item.unitPrice * item.quantity)}
                                </span>
                                {catalogItem && catalogItem.inStock && (
                                  <button
                                    type="button"
                                    onClick={() => onAddToCart(catalogItem, item.variant)}
                                    className="min-h-[36px] px-3 py-1.5 text-xs font-medium text-[#1E4E6E] bg-[#E1F0FA] hover:bg-[#CBE4F6] border border-[#A8D4F0] rounded-lg transition-colors whitespace-nowrap"
                                  >
                                    Buy Again
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      <div className="lg:col-span-4 bg-[#F5EFE4] border border-[#E4D8C6] rounded-xl p-4 text-xs space-y-2">
                        <p className="font-semibold text-[#2C1A12]">Delivery Destination</p>
                        <p className="text-[#63493B]">{order.shippingAddress.fullName}</p>
                        <p className="text-[#63493B]">{order.shippingAddress.street}</p>
                        <p className="text-[#63493B]">
                          {order.shippingAddress.city}, {order.shippingAddress.postalCode}
                        </p>
                        <p className="text-[#63493B]">{order.shippingAddress.country}</p>
                        <div className="pt-2 border-t border-[#E4D8C6] space-y-1 text-[#63493B]">
                          <div className="flex justify-between">
                            <span>Subtotal</span>
                            <span className="font-mono tabular-nums">{formatINR(order.subtotal)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Shipping</span>
                            <span className="font-mono tabular-nums">
                              {order.shippingCost === 0 ? 'Free' : formatINR(order.shippingCost)}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>GST</span>
                            <span className="font-mono tabular-nums">{formatINR(order.taxAmount)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Wishlist */}
      {activeTab === 'wishlist' && (
        <div key="wishlist" className="space-y-6 animate-panel-enter">
          <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl p-4 flex items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-semibold text-[#2C1A12]">
                Saved Wishlist
              </h2>
              <p className="text-xs text-[#7C6354] mt-0.5">
                Items you saved to revisit or move to your shopping bag.
              </p>
            </div>
            <span className="font-mono text-xs text-[#63493B] tabular-nums">
              {wishlistProducts.length} {wishlistProducts.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          {wishlistProducts.length === 0 ? (
            <div className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-2xl p-12 text-center">
              <Heart className="w-8 h-8 text-[#7C6354] mx-auto mb-3" strokeWidth={1.5} />
              <h3 className="font-display text-base font-semibold text-[#2C1A12]">
                Your wishlist is empty
              </h3>
              <p className="text-xs text-[#7C6354] mt-1.5 max-w-md mx-auto">
                Tap the heart button on any clothes, accessory, or tech goods item to save it here.
              </p>
              <button
                type="button"
                onClick={onBackToShop}
                className="mt-5 min-h-[40px] px-5 py-2 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-xs font-medium rounded-lg transition-colors"
              >
                Explore Products
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {wishlistProducts.map((product) => (
                <article
                  key={product.id}
                  className="bg-[#FFFDF9] border border-[#E4D8C6] rounded-xl overflow-hidden flex flex-col"
                >
                  <button
                    type="button"
                    onClick={() => onSelectProduct(product)}
                    className="aspect-[4/3] w-full bg-[#F3EBDD] overflow-hidden text-left"
                  >
                    <ResilientImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </button>

                  <div className="p-5 flex-1 flex flex-col justify-between gap-4">
                    <div>
                      <p className="text-xs text-[#7C6354]">
                        {product.categoryLabel} · {product.brand}
                      </p>
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        className="text-left mt-1"
                      >
                        <h3 className="font-display text-base font-semibold text-[#2C1A12] hover:text-[#6B3F26]">
                          {product.name}
                        </h3>
                      </button>
                      <div className="mt-2 flex items-center justify-between text-xs">
                        <span className="font-mono text-sm font-medium text-[#2C1A12] tabular-nums">
                          {formatINR(product.price)}
                        </span>
                        <span className={product.inStock ? 'text-[#15803D]' : 'text-[#B91C1C]'}>
                          {product.inStock ? 'In Stock' : 'Restocking Soon'}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-[#EFE5D6]">
                      <button
                        type="button"
                        disabled={!product.inStock}
                        onClick={() => onAddToCart(product)}
                        className="flex-1 min-h-[40px] px-4 py-2 bg-[#6B3F26] hover:bg-[#4E2C19] disabled:bg-[#F3EBDD] disabled:text-[#9A8476] text-[#FFFDF9] text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors whitespace-nowrap"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        {product.inStock ? 'Move to Bag' : 'Unavailable'}
                      </button>
                      <button
                        type="button"
                        onClick={() => onRemoveWishlist(product.id)}
                        aria-label={`Remove ${product.name} from wishlist`}
                        className="w-10 h-10 flex items-center justify-center rounded-lg border border-[#E4D8C6] text-[#63493B] hover:bg-[#FEF2F2] hover:text-[#991B1B] hover:border-[#FECACA] transition-colors shrink-0"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
