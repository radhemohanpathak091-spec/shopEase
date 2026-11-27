import { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Lock,
  Minus,
  Plus,
  ShoppingBag,
  Trash2,
  X,
} from 'lucide-react';
import {
  formatINR,
  FREE_SHIPPING_THRESHOLD,
  STANDARD_SHIPPING_COST,
  TAX_RATE,
} from '../data/catalog.ts';
import type {
  CartItem,
  Order,
  PaymentMethod,
  Product,
  ShippingAddress,
  UserProfile,
} from '../types/store.ts';
import { ResilientImage } from './ResilientImage.tsx';

interface CartDrawerProps {
  isOpen: boolean;
  items: CartItem[];
  products: Product[];
  user: UserProfile | null;
  onClose: () => void;
  onUpdateQuantity: (productId: string, variant: string, quantity: number) => void;
  onRemoveItem: (productId: string, variant: string) => void;
  onOpenAuth: () => void;
  onPlaceOrder: (shippingAddress: ShippingAddress, paymentMethod: PaymentMethod) => Promise<Order>;
}

export function CartDrawer({
  isOpen,
  items,
  products,
  user,
  onClose,
  onUpdateQuantity,
  onRemoveItem,
  onOpenAuth,
  onPlaceOrder,
}: CartDrawerProps) {
  const [step, setStep] = useState<'cart' | 'checkout' | 'receipt'>('cart');
  const [confirmedOrder, setConfirmedOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');
  const [shippingAddress, setShippingAddress] = useState<ShippingAddress>({
    fullName: '',
    street: '',
    city: '',
    postalCode: '',
    country: 'India',
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setShippingAddress((prev) => {
      if (user.defaultAddress && !prev.street && !prev.city && !prev.postalCode) {
        return {
          fullName: prev.fullName || user.defaultAddress.fullName || user.name,
          street: user.defaultAddress.street,
          city: user.defaultAddress.city,
          postalCode: user.defaultAddress.postalCode,
          country: user.defaultAddress.country || 'India',
        };
      }
      if (!prev.fullName && user.name) {
        return { ...prev, fullName: user.name };
      }
      return prev;
    });
  }, [user]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && step === 'receipt' && !confirmedOrder) {
      setStep('cart');
    }
  }, [isOpen, step, confirmedOrder]);

  if (!isOpen) return null;

  const detailedItems = items
    .map((item) => {
      const product = products.find((p) => p.id === item.productId);
      if (!product) return null;
      return { ...item, product };
    })
    .filter((entry): entry is CartItem & { product: Product } => entry !== null);

  const totalCount = detailedItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = detailedItems.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0,
  );
  const shippingCost =
    subtotal === 0 ? 0 : subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const taxAmount = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shippingCost + taxAmount;
  const remainingForFreeShipping = Math.max(0, FREE_SHIPPING_THRESHOLD - subtotal);
  const shippingProgress = Math.min(100, Math.round((subtotal / FREE_SHIPPING_THRESHOLD) * 100));

  const handleCheckoutSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const order = await onPlaceOrder(shippingAddress, paymentMethod);
      setConfirmedOrder(order);
      setStep('receipt');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unable to complete order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-[2px] animate-backdrop-enter"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="cart-drawer-title"
    >
      <aside
        className="w-full max-w-md h-full bg-[#FFFDF9] border-l border-[#E4D8C6] flex flex-col shadow-2xl animate-drawer-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-5 border-b border-[#EFE5D6] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                type="button"
                onClick={() => {
                  setStep('cart');
                  setError(null);
                }}
                aria-label="Back to shopping bag"
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#63493B] hover:bg-[#F3EBDD] hover:text-[#2C1A12]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <ShoppingBag className="w-4 h-4 text-[#6B3F26]" />
            <h2 id="cart-drawer-title" className="font-display text-lg font-semibold text-[#2C1A12]">
              {step === 'cart'
                ? `Shopping Bag (${totalCount})`
                : step === 'checkout'
                  ? 'Checkout'
                  : 'Order Confirmed'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => {
              if (step === 'receipt') setStep('cart');
              onClose();
            }}
            aria-label="Close shopping bag"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#63493B] hover:bg-[#F3EBDD] hover:text-[#2C1A12] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {step === 'receipt' && confirmedOrder ? (
          <div key="receipt" className="flex-1 overflow-y-auto p-6 space-y-6 animate-panel-enter">
            <div className="p-5 rounded-xl bg-[#F0FDF4] border border-[#BBF7D0] space-y-2">
              <div className="flex items-center gap-2 text-[#15803D]">
                <CheckCircle2 className="w-5 h-5 shrink-0" />
                <span className="font-display text-base font-semibold">
                  Order #{confirmedOrder.id} Confirmed
                </span>
              </div>
              <p className="text-xs text-[#166534] leading-relaxed">
                {confirmedOrder.status}. A copy of this receipt has been saved to your account order history.
              </p>
            </div>

            <div className="space-y-3">
              <h3 className="text-xs font-semibold text-[#2C1A12]">Items Purchased</h3>
              <div className="divide-y divide-[#EFE5D6] border border-[#E4D8C6] rounded-xl px-4 bg-[#FFFDF9]">
                {confirmedOrder.items.map((item) => (
                  <div
                    key={`${item.productId}-${item.variant}`}
                    className="py-3 flex items-center justify-between gap-3 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[#2C1A12] truncate">{item.name}</p>
                      <p className="text-[#7C6354]">
                        {item.variant} · Qty {item.quantity}
                      </p>
                    </div>
                    <span className="font-mono text-[#2C1A12] tabular-nums shrink-0">
                      {formatINR(item.unitPrice * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-3 border-t border-[#EFE5D6] text-xs">
              <div className="flex justify-between text-[#63493B]">
                <span>Subtotal</span>
                <span className="font-mono tabular-nums">{formatINR(confirmedOrder.subtotal)}</span>
              </div>
              <div className="flex justify-between text-[#63493B]">
                <span>Shipping</span>
                <span className="font-mono tabular-nums">
                  {confirmedOrder.shippingCost === 0
                    ? 'Free'
                    : formatINR(confirmedOrder.shippingCost)}
                </span>
              </div>
              <div className="flex justify-between text-[#63493B]">
                <span>Estimated GST (12%)</span>
                <span className="font-mono tabular-nums">{formatINR(confirmedOrder.taxAmount)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-[#2C1A12] pt-2 border-t border-[#EFE5D6]">
                <span>Total Paid</span>
                <span className="font-mono tabular-nums">{formatINR(confirmedOrder.total)}</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-[#F5EFE4] border border-[#E4D8C6] text-xs space-y-1">
              <p className="font-semibold text-[#2C1A12]">Shipping Destination</p>
              <p className="text-[#63493B]">{confirmedOrder.shippingAddress.fullName}</p>
              <p className="text-[#63493B]">{confirmedOrder.shippingAddress.street}</p>
              <p className="text-[#63493B]">
                {confirmedOrder.shippingAddress.city}, {confirmedOrder.shippingAddress.postalCode}
              </p>
              <p className="text-[#63493B]">{confirmedOrder.shippingAddress.country}</p>
            </div>

            <button
              type="button"
              onClick={() => {
                setStep('cart');
                setConfirmedOrder(null);
                onClose();
              }}
              className="w-full min-h-[44px] px-5 py-2.5 bg-[#6B3F26] text-[#FFFDF9] text-sm font-medium rounded-lg hover:bg-[#4E2C19] transition-colors"
            >
              Continue Shopping
            </button>
          </div>
        ) : detailedItems.length === 0 ? (
          <div key="empty" className="flex-1 flex flex-col items-center justify-center p-8 text-center animate-panel-enter">
            <div className="w-12 h-12 rounded-xl bg-[#E1F0FA] border border-[#A8D4F0] flex items-center justify-center mb-4">
              <ShoppingBag className="w-5 h-5 text-[#1E4E6E]" strokeWidth={1.5} />
            </div>
            <h3 className="font-display text-base font-semibold text-[#2C1A12]">
              Your shopping bag is empty
            </h3>
            <p className="text-xs text-[#7C6354] mt-1.5 max-w-[26ch]">
              Add clothes, accessories, or tech goods from the catalog to begin checkout.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-5 min-h-[40px] px-5 py-2 bg-[#6B3F26] text-[#FFFDF9] text-xs font-medium rounded-lg hover:bg-[#4E2C19] transition-colors whitespace-nowrap"
            >
              Browse Catalog
            </button>
          </div>
        ) : step === 'cart' ? (
          <div key="cart" className="flex-1 flex flex-col overflow-hidden animate-panel-enter">
            <div className="px-6 py-3.5 bg-[#F5EFE4] border-b border-[#EFE5D6]">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-[#63493B]">
                  {remainingForFreeShipping === 0
                    ? 'Free express shipping unlocked'
                    : `Add ${formatINR(remainingForFreeShipping)} more for free express shipping`}
                </span>
                <span className="font-mono text-[#2C1A12] tabular-nums">{shippingProgress}%</span>
              </div>
              <div className="h-2 w-full bg-[#E4D8C6] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#68B0DF] transition-all duration-300"
                  style={{ width: `${shippingProgress}%` }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 divide-y divide-[#EFE5D6]">
              {detailedItems.map(({ product, variant, quantity }) => (
                <div
                  key={`${product.id}::${variant}`}
                  className="py-5 flex gap-4"
                >
                  <div className="w-20 h-20 rounded-lg overflow-hidden bg-[#F3EBDD] shrink-0">
                    <ResilientImage
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="text-sm font-medium text-[#2C1A12] truncate">
                          {product.name}
                        </h3>
                        <p className="text-xs text-[#7C6354] mt-0.5">
                          {product.brand} · {variant}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => onRemoveItem(product.id, variant)}
                        aria-label={`Remove ${product.name}`}
                        className="w-8 h-8 flex items-center justify-center rounded text-[#7C6354] hover:text-[#B91C1C] hover:bg-[#FEF2F2] transition-colors shrink-0"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-3 mt-3">
                      <div className="inline-flex items-center border border-[#D7C6B1] rounded-md bg-[#FFFDF9]">
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, variant, quantity - 1)}
                          aria-label={`Decrease ${product.name} quantity`}
                          className="w-8 h-8 flex items-center justify-center text-[#2C1A12] hover:bg-[#F3EBDD]"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center font-mono text-xs tabular-nums text-[#2C1A12]">
                          {quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => onUpdateQuantity(product.id, variant, Math.min(20, quantity + 1))}
                          aria-label={`Increase ${product.name} quantity`}
                          className="w-8 h-8 flex items-center justify-center text-[#2C1A12] hover:bg-[#F3EBDD]"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="font-mono text-sm font-medium text-[#2C1A12] tabular-nums">
                        {formatINR(product.price * quantity)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-6 border-t border-[#EFE5D6] bg-[#F5EFE4] space-y-4">
              <div className="space-y-1.5 text-xs">
                <div className="flex justify-between text-[#63493B]">
                  <span>Subtotal</span>
                  <span className="font-mono tabular-nums text-[#2C1A12]">
                    {formatINR(subtotal)}
                  </span>
                </div>
                <div className="flex justify-between text-[#63493B]">
                  <span>Shipping</span>
                  <span className="font-mono tabular-nums text-[#2C1A12]">
                    {shippingCost === 0 ? 'Free' : formatINR(shippingCost)}
                  </span>
                </div>
                <div className="flex justify-between text-[#63493B]">
                  <span>Estimated GST (12%)</span>
                  <span className="font-mono tabular-nums text-[#2C1A12]">
                    {formatINR(taxAmount)}
                  </span>
                </div>
                <div className="flex justify-between text-sm font-semibold text-[#2C1A12] pt-2 border-t border-[#E4D8C6]">
                  <span>Total</span>
                  <span className="font-mono tabular-nums">{formatINR(total)}</span>
                </div>
              </div>

              {!user ? (
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="w-full min-h-[44px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-sm font-medium rounded-lg inline-flex items-center justify-center gap-2 transition-colors whitespace-nowrap"
                  >
                    <Lock className="w-4 h-4" />
                    Sign In to Checkout
                  </button>
                  <p className="text-[11px] text-[#7C6354] text-center">
                    Your bag items will automatically sync to your account.
                  </p>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setStep('checkout');
                  }}
                  className="w-full min-h-[44px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] text-[#FFFDF9] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  Proceed to Checkout
                </button>
              )}
            </div>
          </div>
        ) : (
          <form key="checkout" onSubmit={handleCheckoutSubmit} className="flex-1 flex flex-col overflow-hidden animate-panel-enter">
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 p-3.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-3.5">
                <h3 className="font-display text-sm font-semibold text-[#2C1A12]">
                  Shipping Verification
                </h3>
                <div>
                  <label htmlFor="ship-name" className="block text-xs font-medium text-[#2C1A12] mb-1">
                    Recipient Name
                  </label>
                  <input
                    id="ship-name"
                    type="text"
                    required
                    minLength={2}
                    maxLength={100}
                    value={shippingAddress.fullName}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, fullName: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
                <div>
                  <label htmlFor="ship-street" className="block text-xs font-medium text-[#2C1A12] mb-1">
                    Street Address
                  </label>
                  <input
                    id="ship-street"
                    type="text"
                    required
                    minLength={4}
                    maxLength={160}
                    placeholder="12 MG Road, Indiranagar"
                    value={shippingAddress.street}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, street: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="ship-city" className="block text-xs font-medium text-[#2C1A12] mb-1">
                      City
                    </label>
                    <input
                      id="ship-city"
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      placeholder="Bengaluru"
                      value={shippingAddress.city}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, city: e.target.value })
                      }
                      className="w-full h-10 px-3 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                    />
                  </div>
                  <div>
                    <label htmlFor="ship-postal" className="block text-xs font-medium text-[#2C1A12] mb-1">
                      PIN Code
                    </label>
                    <input
                      id="ship-postal"
                      type="text"
                      required
                      minLength={3}
                      maxLength={20}
                      placeholder="560001"
                      value={shippingAddress.postalCode}
                      onChange={(e) =>
                        setShippingAddress({ ...shippingAddress, postalCode: e.target.value })
                      }
                      className="w-full h-10 px-3 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="ship-country" className="block text-xs font-medium text-[#2C1A12] mb-1">
                    Country
                  </label>
                  <input
                    id="ship-country"
                    type="text"
                    required
                    minLength={2}
                    maxLength={80}
                    value={shippingAddress.country}
                    onChange={(e) =>
                      setShippingAddress({ ...shippingAddress, country: e.target.value })
                    }
                    className="w-full h-10 px-3 text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>
              </div>

              <div className="space-y-2.5 pt-2 border-t border-[#EFE5D6]">
                <h3 className="font-display text-sm font-semibold text-[#2C1A12]">
                  Payment Method
                </h3>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('card')}
                    className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                      paymentMethod === 'card'
                        ? 'border-[#5CA4D6] bg-[#E1F0FA] text-[#1E4E6E]'
                        : 'border-[#D7C6B1] bg-[#FFFDF9] text-[#2C1A12] hover:border-[#6B3F26]'
                    }`}
                  >
                    Instant Card
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('cod')}
                    className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border text-left transition-colors ${
                      paymentMethod === 'cod'
                        ? 'border-[#5CA4D6] bg-[#E1F0FA] text-[#1E4E6E]'
                        : 'border-[#D7C6B1] bg-[#FFFDF9] text-[#2C1A12] hover:border-[#6B3F26]'
                    }`}
                  >
                    Cash on Delivery
                  </button>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-[#EFE5D6] bg-[#F5EFE4] space-y-3">
              <div className="flex justify-between text-sm font-semibold text-[#2C1A12]">
                <span>Order Total</span>
                <span className="font-mono tabular-nums">{formatINR(total)}</span>
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full min-h-[44px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] disabled:opacity-60 text-[#FFFDF9] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
              >
                {submitting ? 'Processing Order...' : `Place Order — ${formatINR(total)}`}
              </button>
            </div>
          </form>
        )}
      </aside>
    </div>
  );
}
