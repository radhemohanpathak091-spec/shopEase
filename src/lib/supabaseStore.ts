import type { User as SupabaseUser } from '@supabase/supabase-js';
import {
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  STANDARD_SHIPPING_COST,
  TAX_RATE,
} from '../data/catalog.ts';
import { supabase } from '../supabaseClient.js';
import type {
  CartItem,
  Order,
  OrderItemSnapshot,
  PaymentMethod,
  ShippingAddress,
  UserProfile,
} from '../types/store.ts';

interface ProfileRow {
  id: string;
  name: string;
  email: string;
  dob: string | null;
  phone: string | null;
  default_address: ShippingAddress | null;
  created_at: string;
}

interface CartItemRow {
  product_id: string;
  variant: string;
  quantity: number;
}

interface WishlistItemRow {
  product_id: string;
}

interface OrderItemRow {
  product_id: string;
  name: string;
  brand: string;
  variant: string;
  quantity: number;
  unit_price: number;
  image: string;
}

interface OrderRow {
  id: string;
  user_id: string;
  subtotal: number;
  shipping_cost: number;
  tax_amount: number;
  total: number;
  shipping_address: ShippingAddress;
  payment_method: PaymentMethod;
  status: 'Confirmed — Preparing Shipment';
  tracking_number: string;
  estimated_delivery: string;
  tracking_step: 0 | 1 | 2 | 3;
  created_at: string;
  order_items?: OrderItemRow[];
}

function mapProfileRow(row: ProfileRow): UserProfile {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    dob: row.dob ?? undefined,
    phone: row.phone ?? undefined,
    defaultAddress: row.default_address ?? undefined,
    supabaseSynced: true,
    createdAt: row.created_at,
  };
}

function mapOrderRow(row: OrderRow): Order {
  return {
    id: row.id,
    userId: row.user_id,
    items: (row.order_items ?? []).map((item) => ({
      productId: item.product_id,
      name: item.name,
      brand: item.brand,
      variant: item.variant,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      image: item.image,
    })),
    subtotal: row.subtotal,
    shippingCost: row.shipping_cost,
    taxAmount: row.tax_amount,
    total: row.total,
    shippingAddress: row.shipping_address,
    paymentMethod: row.payment_method,
    status: row.status,
    trackingNumber: row.tracking_number,
    estimatedDelivery: row.estimated_delivery,
    trackingStep: row.tracking_step,
    createdAt: row.created_at,
  };
}

function getFallbackName(sbUser: SupabaseUser): string {
  const metaName =
    typeof sbUser.user_metadata?.name === 'string'
      ? sbUser.user_metadata.name.trim()
      : '';
  return metaName || sbUser.email?.split('@')[0] || 'Shopper';
}

function generateNumericCode(digits: number): number {
  const min = 10 ** (digits - 1);
  const max = 10 ** digits - 1;
  return Math.floor(min + Math.random() * (max - min + 1));
}

function toSupabaseError(err: unknown, fallback: string): Error {
  if (err instanceof Error) return err;
  if (err && typeof err === 'object') {
    const record = err as { message?: unknown; hint?: unknown; details?: unknown };
    const parts = [
      typeof record.message === 'string' ? record.message : '',
      typeof record.hint === 'string' ? record.hint : '',
    ].filter(Boolean);
    if (parts.length > 0) {
      return new Error(parts.join(' — '));
    }
  }
  return new Error(fallback);
}

// ============================================================================
// 1. LOAD USER DATA
// ============================================================================

export async function loadUserProfile(sbUser: SupabaseUser): Promise<UserProfile> {
  const { data: existing, error } = await supabase
    .from('profiles')
    .select('id, name, email, dob, phone, default_address, created_at')
    .eq('id', sbUser.id)
    .maybeSingle();

  if (error) throw toSupabaseError(error, 'Could not load profile from Supabase.');
  if (existing) {
    return mapProfileRow(existing as ProfileRow);
  }

  const metaAddr = sbUser.user_metadata?.defaultAddress as ShippingAddress | undefined;
  const { data: created, error: insertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: sbUser.id,
        name: getFallbackName(sbUser),
        email: sbUser.email ?? '',
        dob: typeof sbUser.user_metadata?.dob === 'string' ? sbUser.user_metadata.dob : null,
        phone: typeof sbUser.user_metadata?.phone === 'string' ? sbUser.user_metadata.phone : null,
        default_address: metaAddr ?? null,
      },
      { onConflict: 'id' },
    )
    .select('id, name, email, dob, phone, default_address, created_at')
    .single();

  if (insertError) throw toSupabaseError(insertError, 'Could not create profile in Supabase.');
  return mapProfileRow(created as ProfileRow);
}

export async function loadCartItems(userId: string): Promise<CartItem[]> {
  const { data, error } = await supabase
    .from('cart_items')
    .select('product_id, variant, quantity')
    .eq('user_id', userId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return ((data ?? []) as CartItemRow[]).map((row) => ({
    productId: row.product_id,
    variant: row.variant,
    quantity: row.quantity,
  }));
}

export async function loadWishlist(userId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('wishlist_items')
    .select('product_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as WishlistItemRow[]).map((row) => row.product_id);
}

export async function loadOrders(userId: string): Promise<Order[]> {
  const { data, error } = await supabase
    .from('orders')
    .select(
      `
      id,
      user_id,
      subtotal,
      shipping_cost,
      tax_amount,
      total,
      shipping_address,
      payment_method,
      status,
      tracking_number,
      estimated_delivery,
      tracking_step,
      created_at,
      order_items (
        product_id,
        name,
        brand,
        variant,
        quantity,
        unit_price,
        image
      )
    `,
    )
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return ((data ?? []) as OrderRow[]).map(mapOrderRow);
}

export async function loadUserStoreData(sbUser: SupabaseUser): Promise<{
  profile: UserProfile;
  cartItems: CartItem[];
  wishlistIds: string[];
  orders: Order[];
}> {
  const [profile, cartItems, wishlistIds, orders] = await Promise.all([
    loadUserProfile(sbUser),
    loadCartItems(sbUser.id),
    loadWishlist(sbUser.id),
    loadOrders(sbUser.id),
  ]);
  return { profile, cartItems, wishlistIds, orders };
}

// ============================================================================
// 2. CREATE ITEMS
// ============================================================================

export async function upsertCartItem(
  userId: string,
  item: CartItem,
): Promise<void> {
  const safeQty = Math.max(1, Math.min(20, Math.round(item.quantity)));
  const { error } = await supabase.from('cart_items').upsert(
    {
      user_id: userId,
      product_id: item.productId,
      variant: item.variant,
      quantity: safeQty,
    },
    { onConflict: 'user_id,product_id,variant' },
  );

  if (error) {
    if (error.code === '42P10') {
      const { data: existing, error: selectError } = await supabase
        .from('cart_items')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', item.productId)
        .eq('variant', item.variant)
        .maybeSingle();
      if (selectError) throw selectError;

      if (existing) {
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: safeQty })
          .eq('id', existing.id);
        if (updateError) throw updateError;
      } else {
        const { error: insertError } = await supabase.from('cart_items').insert({
          user_id: userId,
          product_id: item.productId,
          variant: item.variant,
          quantity: safeQty,
        });
        if (insertError) throw insertError;
      }
      return;
    }
    throw error;
  }
}

export async function syncCartItems(
  userId: string,
  items: CartItem[],
): Promise<void> {
  if (items.length === 0) return;
  const rows = items.map((item) => ({
    user_id: userId,
    product_id: item.productId,
    variant: item.variant,
    quantity: Math.max(1, Math.min(20, Math.round(item.quantity))),
  }));
  const { error } = await supabase
    .from('cart_items')
    .upsert(rows, { onConflict: 'user_id,product_id,variant' });
  if (error) {
    if (error.code === '42P10') {
      for (const item of items) {
        await upsertCartItem(userId, item);
      }
      return;
    }
    throw error;
  }
}

export async function addWishlistItem(
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('wishlist_items')
    .upsert(
      { user_id: userId, product_id: productId },
      { onConflict: 'user_id,product_id', ignoreDuplicates: true },
    );

  if (error) {
    if (error.code === '42P10') {
      const { data: existing } = await supabase
        .from('wishlist_items')
        .select('id')
        .eq('user_id', userId)
        .eq('product_id', productId)
        .maybeSingle();
      if (!existing) {
        const { error: insertError } = await supabase
          .from('wishlist_items')
          .insert({ user_id: userId, product_id: productId });
        if (insertError) throw insertError;
      }
      return;
    }
    throw error;
  }
}

export async function syncWishlistItems(
  userId: string,
  productIds: string[],
): Promise<void> {
  const uniqueIds = Array.from(new Set(productIds));
  if (uniqueIds.length === 0) return;
  const rows = uniqueIds.map((productId) => ({
    user_id: userId,
    product_id: productId,
  }));
  const { error } = await supabase
    .from('wishlist_items')
    .upsert(rows, { onConflict: 'user_id,product_id', ignoreDuplicates: true });
  if (error) {
    if (error.code === '42P10') {
      for (const productId of uniqueIds) {
        await addWishlistItem(userId, productId);
      }
      return;
    }
    throw error;
  }
}

export async function createOrder(
  userId: string,
  items: CartItem[],
  shippingAddress: ShippingAddress,
  paymentMethod: PaymentMethod,
): Promise<Order> {
  const cleanAddress: ShippingAddress = {
    fullName: shippingAddress.fullName.trim(),
    street: shippingAddress.street.trim(),
    city: shippingAddress.city.trim(),
    postalCode: shippingAddress.postalCode.trim(),
    country: shippingAddress.country.trim(),
  };

  if (
    cleanAddress.fullName.length < 2 ||
    cleanAddress.street.length < 4 ||
    cleanAddress.city.length < 2 ||
    cleanAddress.postalCode.length < 3 ||
    cleanAddress.country.length < 2
  ) {
    throw new Error('Please complete all shipping address fields.');
  }

  if (items.length === 0) {
    throw new Error('Your shopping bag is empty.');
  }

  const snapshots: OrderItemSnapshot[] = [];
  let subtotal = 0;

  for (const item of items) {
    const product = PRODUCTS.find((p) => p.id === item.productId);
    if (!product || !product.inStock) {
      throw new Error(`Item "${item.productId}" is currently unavailable.`);
    }
    const quantity = Math.max(1, Math.min(20, Math.round(item.quantity)));
    subtotal += product.price * quantity;
    snapshots.push({
      productId: product.id,
      name: product.name,
      brand: product.brand,
      variant: item.variant,
      quantity,
      unitPrice: product.price,
      image: product.image,
    });
  }

  const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
  const taxAmount = Math.round(subtotal * TAX_RATE);
  const total = subtotal + shippingCost + taxAmount;

  const now = new Date();
  const eta = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);
  const orderId = `ORD-${generateNumericCode(6)}`;
  const trackingNumber = `SHP-${generateNumericCode(8)}`;

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .insert({
      id: orderId,
      user_id: userId,
      subtotal,
      shipping_cost: shippingCost,
      tax_amount: taxAmount,
      total,
      shipping_address: cleanAddress,
      payment_method: paymentMethod,
      status: 'Confirmed — Preparing Shipment',
      tracking_number: trackingNumber,
      estimated_delivery: eta.toISOString(),
      tracking_step: 1,
    })
    .select(
      'id, user_id, subtotal, shipping_cost, tax_amount, total, shipping_address, payment_method, status, tracking_number, estimated_delivery, tracking_step, created_at',
    )
    .single();

  if (orderError) throw orderError;

  const itemRows = snapshots.map((snap) => ({
    order_id: orderId,
    user_id: userId,
    product_id: snap.productId,
    name: snap.name,
    brand: snap.brand,
    variant: snap.variant,
    quantity: snap.quantity,
    unit_price: snap.unitPrice,
    image: snap.image,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(itemRows);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', orderId).eq('user_id', userId);
    throw itemsError;
  }

  const { error: clearError } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId);
  if (clearError) throw clearError;

  const inserted = orderRow as OrderRow;
  return {
    id: inserted.id,
    userId: inserted.user_id,
    items: snapshots,
    subtotal: inserted.subtotal,
    shippingCost: inserted.shipping_cost,
    taxAmount: inserted.tax_amount,
    total: inserted.total,
    shippingAddress: inserted.shipping_address,
    paymentMethod: inserted.payment_method,
    status: inserted.status,
    trackingNumber: inserted.tracking_number,
    estimatedDelivery: inserted.estimated_delivery,
    trackingStep: inserted.tracking_step,
    createdAt: inserted.created_at,
  };
}

// ============================================================================
// 3. UPDATE ITEMS
// ============================================================================

export async function updateUserProfile(
  userId: string,
  updates: {
    name: string;
    dob: string;
    phone: string;
    defaultAddress: ShippingAddress | null;
  },
): Promise<UserProfile> {
  const cleanName = updates.name.trim();
  if (cleanName.length < 2 || cleanName.length > 80) {
    throw new Error('Name must be between 2 and 80 characters.');
  }

  const trimmedDob = updates.dob.trim();
  if (trimmedDob) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob) || Number.isNaN(Date.parse(trimmedDob))) {
      throw new Error('Date of birth must be a valid YYYY-MM-DD date.');
    }
    if (new Date(trimmedDob).getTime() > Date.now()) {
      throw new Error('Date of birth cannot be in the future.');
    }
  }

  const trimmedPhone = updates.phone.trim();
  if (trimmedPhone && (trimmedPhone.length < 7 || trimmedPhone.length > 20)) {
    throw new Error('Phone number must be between 7 and 20 characters.');
  }

  let cleanAddress: ShippingAddress | null = null;
  if (updates.defaultAddress) {
    const addr: ShippingAddress = {
      fullName: updates.defaultAddress.fullName.trim(),
      street: updates.defaultAddress.street.trim(),
      city: updates.defaultAddress.city.trim(),
      postalCode: updates.defaultAddress.postalCode.trim(),
      country: updates.defaultAddress.country.trim(),
    };
    const hasAny = addr.street !== '' || addr.city !== '' || addr.postalCode !== '';
    if (hasAny) {
      if (
        addr.fullName.length < 2 ||
        addr.street.length < 4 ||
        addr.city.length < 2 ||
        addr.postalCode.length < 3 ||
        addr.country.length < 2
      ) {
        throw new Error('Please complete all default delivery address fields.');
      }
      cleanAddress = addr;
    }
  }

  const { data: updated, error: updateError } = await supabase
    .from('profiles')
    .update({
      name: cleanName,
      dob: trimmedDob || null,
      phone: trimmedPhone || null,
      default_address: cleanAddress,
    })
    .eq('id', userId)
    .select('id, name, email, dob, phone, default_address, created_at')
    .maybeSingle();

  if (updateError) {
    throw toSupabaseError(updateError, 'Could not update profile in Supabase.');
  }
  if (updated) {
    return mapProfileRow(updated as ProfileRow);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const fallbackEmail = sessionData.session?.user?.email ?? '';

  const { data: inserted, error: upsertError } = await supabase
    .from('profiles')
    .upsert(
      {
        id: userId,
        name: cleanName,
        email: fallbackEmail,
        dob: trimmedDob || null,
        phone: trimmedPhone || null,
        default_address: cleanAddress,
      },
      { onConflict: 'id' },
    )
    .select('id, name, email, dob, phone, default_address, created_at')
    .single();

  if (upsertError) {
    throw toSupabaseError(upsertError, 'Could not save profile in Supabase.');
  }
  return mapProfileRow(inserted as ProfileRow);
}

export async function updateCartItemQuantity(
  userId: string,
  productId: string,
  variant: string,
  quantity: number,
): Promise<void> {
  if (quantity <= 0) {
    await removeCartItem(userId, productId, variant);
    return;
  }

  await upsertCartItem(userId, { productId, variant, quantity });
}

// ============================================================================
// 4. DELETE ITEMS
// ============================================================================

export async function removeCartItem(
  userId: string,
  productId: string,
  variant: string,
): Promise<void> {
  const { error } = await supabase
    .from('cart_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId)
    .eq('variant', variant);

  if (error) throw error;
}

export async function removeWishlistItem(
  userId: string,
  productId: string,
): Promise<void> {
  const { error } = await supabase
    .from('wishlist_items')
    .delete()
    .eq('user_id', userId)
    .eq('product_id', productId);

  if (error) throw error;
}
