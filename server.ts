import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import {
  FREE_SHIPPING_THRESHOLD,
  PRODUCTS,
  STANDARD_SHIPPING_COST,
  TAX_RATE,
} from './src/data/catalog.ts';
import type {
  CartItem,
  Order,
  OrderItemSnapshot,
  PaymentMethod,
  ProductCategory,
  ShippingAddress,
  UserProfile,
} from './src/types/store.ts';

interface StoredUser {
  id: string;
  name: string;
  email: string;
  dob?: string;
  phone?: string;
  defaultAddress?: ShippingAddress;
  salt: string;
  passwordHash: string;
  createdAt: string;
}

interface StoreDatabase {
  users: StoredUser[];
  carts: Record<string, CartItem[]>;
  wishlists: Record<string, string[]>;
  orders: Order[];
  revokedTokens: string[];
}

interface AuthenticatedRequest extends Request {
  authUser?: StoredUser;
  tokenJti?: string;
}

const PORT = 3000;
const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORE_PATH = path.resolve(DATA_DIR, 'store.json');
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function ensureStoreExists(): StoreDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(STORE_PATH)) {
    const initial: StoreDatabase = {
      users: [],
      carts: {},
      wishlists: {},
      orders: [],
      revokedTokens: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(initial, null, 2), 'utf-8');
    return initial;
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreDatabase>;
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      carts: parsed.carts && typeof parsed.carts === 'object' ? parsed.carts : {},
      wishlists: parsed.wishlists && typeof parsed.wishlists === 'object' ? parsed.wishlists : {},
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
      revokedTokens: Array.isArray(parsed.revokedTokens) ? parsed.revokedTokens : [],
    };
  } catch {
    const fallback: StoreDatabase = {
      users: [],
      carts: {},
      wishlists: {},
      orders: [],
      revokedTokens: [],
    };
    fs.writeFileSync(STORE_PATH, JSON.stringify(fallback, null, 2), 'utf-8');
    return fallback;
  }
}

let db: StoreDatabase = ensureStoreExists();

function saveStore(): void {
  const tmpPath = `${STORE_PATH}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(db, null, 2), 'utf-8');
  fs.renameSync(tmpPath, STORE_PATH);
}

function hashPassword(password: string, salt: string): string {
  return crypto.scryptSync(password, salt, 64).toString('hex');
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) {
    return false;
  }
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function signSessionToken(userId: string): string {
  const payload = {
    sub: userId,
    jti: crypto.randomUUID(),
    exp: Date.now() + TOKEN_TTL_MS,
  };
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf-8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  return `${payloadB64}.${signature}`;
}

function verifySessionToken(token: string): { sub: string; jti: string; exp: number } | null {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return null;
  }
  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) {
    return null;
  }
  const expectedSig = crypto
    .createHmac('sha256', SESSION_SECRET)
    .update(payloadB64)
    .digest('base64url');
  const sigBuf = Buffer.from(sigB64);
  const expectedBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }
  try {
    const parsed = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf-8')) as {
      sub?: unknown;
      jti?: unknown;
      exp?: unknown;
    };
    if (
      typeof parsed.sub !== 'string' ||
      typeof parsed.jti !== 'string' ||
      typeof parsed.exp !== 'number'
    ) {
      return null;
    }
    if (Date.now() > parsed.exp || db.revokedTokens.includes(parsed.jti)) {
      return null;
    }
    return { sub: parsed.sub, jti: parsed.jti, exp: parsed.exp };
  } catch {
    return null;
  }
}

const SESSION_COOKIE_NAME = 'shopease_session';

function parseCookie(cookieHeader: string | undefined, name: string): string | null {
  if (!cookieHeader) return null;
  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const idx = pair.indexOf('=');
    if (idx === -1) continue;
    const key = pair.slice(0, idx).trim();
    if (key === name) {
      try {
        return decodeURIComponent(pair.slice(idx + 1).trim());
      } catch {
        return null;
      }
    }
  }
  return null;
}

function setSessionCookie(req: Request, res: Response, token: string): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.cookie(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    maxAge: TOKEN_TTL_MS,
    path: '/',
  });
}

function clearSessionCookie(req: Request, res: Response): void {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  res.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly: true,
    sameSite: isHttps ? 'none' : 'lax',
    secure: isHttps,
    path: '/',
  });
}

function toPublicUser(user: StoredUser): UserProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    dob: user.dob,
    phone: user.phone,
    defaultAddress: user.defaultAddress,
    createdAt: user.createdAt,
  };
}

function sanitizeWishlist(rawIds: unknown): string[] {
  if (!Array.isArray(rawIds)) {
    return [];
  }
  const seen = new Set<string>();
  for (const id of rawIds.slice(0, 50)) {
    if (typeof id !== 'string') continue;
    if (PRODUCTS.some((p) => p.id === id)) {
      seen.add(id);
    }
  }
  return Array.from(seen);
}

function sanitizeCartItems(rawItems: unknown): CartItem[] {
  if (!Array.isArray(rawItems)) {
    return [];
  }
  const merged = new Map<string, CartItem>();
  for (const item of rawItems.slice(0, 40)) {
    if (!item || typeof item !== 'object') continue;
    const candidate = item as Record<string, unknown>;
    if (typeof candidate.productId !== 'string' || typeof candidate.variant !== 'string') continue;
    const product = PRODUCTS.find((p) => p.id === candidate.productId);
    if (!product || !product.inStock) continue;
    if (!product.variants.includes(candidate.variant)) continue;
    const qty = typeof candidate.quantity === 'number' ? Math.floor(candidate.quantity) : 0;
    if (qty < 1) continue;
    const clampedQty = Math.min(qty, 20);
    const key = `${product.id}::${candidate.variant}`;
    const existing = merged.get(key);
    if (existing) {
      existing.quantity = Math.min(existing.quantity + clampedQty, 20);
    } else {
      merged.set(key, {
        productId: product.id,
        variant: candidate.variant,
        quantity: clampedQty,
      });
    }
  }
  return Array.from(merged.values());
}

const RAW_SUPABASE_URL = process.env.VITE_SUPABASE_URL?.trim() || '';
const SUPABASE_AUTH_BASE = /^https?:\/\//i.test(RAW_SUPABASE_URL)
  ? RAW_SUPABASE_URL.replace(/\/rest\/v1\/?$/i, '').replace(/\/+$/, '')
  : 'https://bxvwuahntworknjqcmam.supabase.co';
const RAW_SUPABASE_KEY = process.env.VITE_SUPABASE_PUBLIC_KEY?.trim() || '';
const SUPABASE_ANON_KEY = /^(sb_publishable_|eyJ)/i.test(RAW_SUPABASE_KEY)
  ? RAW_SUPABASE_KEY.replace(/^:/, '')
  : 'sb_publishable_8CHxOlXXoQbNSJeWOOEJjg_F4x5_ZUE';

async function verifySupabaseBearer(token: string): Promise<StoredUser | null> {
  try {
    const response = await fetch(`${SUPABASE_AUTH_BASE}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!response.ok) return null;
    const sbUser = (await response.json()) as {
      id?: unknown;
      email?: unknown;
      created_at?: unknown;
      user_metadata?: { name?: unknown };
    };
    if (typeof sbUser.id !== 'string' || typeof sbUser.email !== 'string') {
      return null;
    }
    let user = db.users.find((u) => u.id === sbUser.id);
    if (!user) {
      const displayName =
        typeof sbUser.user_metadata?.name === 'string' && sbUser.user_metadata.name.trim()
          ? sbUser.user_metadata.name.trim()
          : sbUser.email.split('@')[0] || 'Shopper';
      user = {
        id: sbUser.id,
        name: displayName,
        email: sbUser.email,
        salt: '',
        passwordHash: '',
        createdAt: typeof sbUser.created_at === 'string' ? sbUser.created_at : new Date().toISOString(),
      };
      db.users.push(user);
      if (!db.carts[user.id]) {
        db.carts[user.id] = [];
      }
      saveStore();
    }
    return user;
  } catch {
    return null;
  }
}

async function requireAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const authHeader = req.headers.authorization;
  const bearerToken =
    authHeader && authHeader.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length).trim()
      : null;
  const cookieToken = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
  const token = bearerToken || cookieToken;

  if (!token) {
    res.status(401).json({ error: 'Authentication required.' });
    return;
  }

  const decoded = verifySessionToken(token);
  if (decoded) {
    const user = db.users.find((u) => u.id === decoded.sub);
    if (!user) {
      res.status(401).json({ error: 'User account not found.' });
      return;
    }
    req.authUser = user;
    req.tokenJti = decoded.jti;
    next();
    return;
  }

  const supabaseUser = await verifySupabaseBearer(token);
  if (supabaseUser) {
    req.authUser = supabaseUser;
    next();
    return;
  }

  res.status(401).json({ error: 'Session expired or invalid. Please sign in again.' });
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ status: 'ok' });
  });

  app.get('/api/products', (req: Request, res: Response) => {
    const q = typeof req.query.q === 'string' ? req.query.q.trim().toLowerCase() : '';
    const category = typeof req.query.category === 'string' ? req.query.category.trim().toLowerCase() : 'all';
    const inStockOnly = req.query.inStock === 'true';
    const sort = typeof req.query.sort === 'string' ? req.query.sort : 'featured';
    const minPrice = typeof req.query.minPrice === 'string' ? Number(req.query.minPrice) : 0;
    const maxPrice = typeof req.query.maxPrice === 'string' ? Number(req.query.maxPrice) : Number.POSITIVE_INFINITY;

    let filtered = PRODUCTS.filter((product) => {
      if (category !== 'all' && (['apparel', 'accessories', 'electronics'] as ProductCategory[]).includes(category as ProductCategory)) {
        if (product.category !== category) return false;
      }
      if (inStockOnly && !product.inStock) return false;
      if (Number.isFinite(minPrice) && product.price < minPrice) return false;
      if (Number.isFinite(maxPrice) && product.price > maxPrice) return false;
      if (q) {
        const haystack = `${product.name} ${product.brand} ${product.material} ${product.categoryLabel} ${product.description}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });

    if (sort === 'price-asc') {
      filtered = [...filtered].sort((a, b) => a.price - b.price);
    } else if (sort === 'price-desc') {
      filtered = [...filtered].sort((a, b) => b.price - a.price);
    } else if (sort === 'rating') {
      filtered = [...filtered].sort((a, b) => b.rating - a.rating);
    }

    res.json({ products: filtered, total: PRODUCTS.length });
  });

  app.post('/api/auth/register', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Please provide your full name (2–80 characters).' });
      return;
    }
    if (!EMAIL_REGEX.test(email) || email.length > 160) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }
    if (password.length < 8 || password.length > 128) {
      res.status(400).json({ error: 'Password must be at least 8 characters long.' });
      return;
    }
    if (db.users.some((u) => u.email === email)) {
      res.status(409).json({ error: 'An account with this email already exists.' });
      return;
    }

    const salt = crypto.randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);
    const newUser: StoredUser = {
      id: `usr_${crypto.randomUUID()}`,
      name,
      email,
      salt,
      passwordHash,
      createdAt: new Date().toISOString(),
    };
    db.users.push(newUser);
    db.carts[newUser.id] = [];
    saveStore();

    const token = signSessionToken(newUser.id);
    setSessionCookie(req, res, token);
    res.status(201).json({
      token,
      user: toPublicUser(newUser),
      cart: [],
    });
  });

  app.post('/api/auth/login', (req: Request, res: Response) => {
    const body = req.body as Record<string, unknown>;
    const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
    const password = typeof body?.password === 'string' ? body.password : '';

    if (!EMAIL_REGEX.test(email) || !password) {
      res.status(400).json({ error: 'Valid email and password are required.' });
      return;
    }

    const user = db.users.find((u) => u.email.toLowerCase() === email);
    if (!user || !user.salt || !user.passwordHash || !verifyPassword(password, user.salt, user.passwordHash)) {
      res.status(401).json({ error: 'Incorrect email or password.' });
      return;
    }

    const token = signSessionToken(user.id);
    const userCart = sanitizeCartItems(db.carts[user.id] || []);
    setSessionCookie(req, res, token);
    res.json({
      token,
      user: toPublicUser(user),
      cart: userCart,
    });
  });

  app.post('/api/auth/logout', (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;
    const cookieToken = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
    const token = bearerToken || cookieToken;
    const decoded = token ? verifySessionToken(token) : null;
    if (decoded && !db.revokedTokens.includes(decoded.jti)) {
      db.revokedTokens.push(decoded.jti);
      if (db.revokedTokens.length > 1000) {
        db.revokedTokens = db.revokedTokens.slice(-500);
      }
      saveStore();
    }
    clearSessionCookie(req, res);
    res.json({ ok: true });
  });

  app.get('/api/auth/me', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const userCart = sanitizeCartItems(db.carts[user.id] || []);
    const authHeader = req.headers.authorization;
    const bearerToken =
      authHeader && authHeader.startsWith('Bearer ')
        ? authHeader.slice('Bearer '.length).trim()
        : null;
    const cookieToken = parseCookie(req.headers.cookie, SESSION_COOKIE_NAME);
    res.json({
      token: bearerToken || cookieToken || undefined,
      user: toPublicUser(user),
      cart: userCart,
    });
  });

  app.get('/api/cart', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const items = sanitizeCartItems(db.carts[user.id] || []);
    res.json({ items });
  });

  app.put('/api/cart', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body as Record<string, unknown>;
    const sanitized = sanitizeCartItems(body?.items);
    db.carts[user.id] = sanitized;
    saveStore();
    res.json({ items: sanitized });
  });

  app.get('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    res.json({ user: toPublicUser(user) });
  });

  app.put('/api/profile', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body as Record<string, unknown>;

    const name = typeof body?.name === 'string' ? body.name.trim() : user.name;
    if (name.length < 2 || name.length > 80) {
      res.status(400).json({ error: 'Name must be between 2 and 80 characters.' });
      return;
    }

    let dob = user.dob;
    if (body?.dob !== undefined) {
      if (typeof body.dob !== 'string') {
        res.status(400).json({ error: 'Invalid date of birth format.' });
        return;
      }
      const trimmedDob = body.dob.trim();
      if (trimmedDob === '') {
        dob = undefined;
      } else if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmedDob) || Number.isNaN(Date.parse(trimmedDob))) {
        res.status(400).json({ error: 'Date of birth must be a valid YYYY-MM-DD date.' });
        return;
      } else if (new Date(trimmedDob).getTime() > Date.now()) {
        res.status(400).json({ error: 'Date of birth cannot be in the future.' });
        return;
      } else {
        dob = trimmedDob;
      }
    }

    let phone = user.phone;
    if (body?.phone !== undefined) {
      if (typeof body.phone !== 'string') {
        res.status(400).json({ error: 'Invalid phone number.' });
        return;
      }
      const trimmedPhone = body.phone.trim();
      if (trimmedPhone === '') {
        phone = undefined;
      } else if (trimmedPhone.length < 7 || trimmedPhone.length > 20) {
        res.status(400).json({ error: 'Phone number must be between 7 and 20 characters.' });
        return;
      } else {
        phone = trimmedPhone;
      }
    }

    let defaultAddress = user.defaultAddress;
    if (body?.defaultAddress !== undefined) {
      if (body.defaultAddress === null) {
        defaultAddress = undefined;
      } else if (typeof body.defaultAddress === 'object') {
        const rawAddr = body.defaultAddress as Record<string, unknown>;
        const addr: ShippingAddress = {
          fullName: typeof rawAddr.fullName === 'string' ? rawAddr.fullName.trim() : '',
          street: typeof rawAddr.street === 'string' ? rawAddr.street.trim() : '',
          city: typeof rawAddr.city === 'string' ? rawAddr.city.trim() : '',
          postalCode: typeof rawAddr.postalCode === 'string' ? rawAddr.postalCode.trim() : '',
          country: typeof rawAddr.country === 'string' ? rawAddr.country.trim() : '',
        };
        const hasAny =
          addr.street !== '' || addr.city !== '' || addr.postalCode !== '';
        if (!hasAny) {
          defaultAddress = undefined;
        } else if (
          addr.fullName.length < 2 ||
          addr.street.length < 4 ||
          addr.city.length < 2 ||
          addr.postalCode.length < 3 ||
          addr.country.length < 2
        ) {
          res.status(400).json({ error: 'Please complete all default delivery address fields.' });
          return;
        } else {
          defaultAddress = addr;
        }
      }
    }

    user.name = name;
    user.dob = dob;
    user.phone = phone;
    user.defaultAddress = defaultAddress;
    saveStore();

    res.json({ user: toPublicUser(user) });
  });

  app.get('/api/wishlist', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const productIds = sanitizeWishlist(db.wishlists[user.id] || []);
    res.json({ productIds });
  });

  app.put('/api/wishlist', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body as Record<string, unknown>;
    const sanitized = sanitizeWishlist(body?.productIds);
    db.wishlists[user.id] = sanitized;
    saveStore();
    res.json({ productIds: sanitized });
  });

  app.get('/api/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const userOrders = db.orders
      .filter((order) => order.userId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json({ orders: userOrders });
  });

  app.post('/api/orders', requireAuth, (req: AuthenticatedRequest, res: Response) => {
    const user = req.authUser!;
    const body = req.body as Record<string, unknown>;
    const rawShipping = body?.shippingAddress as Record<string, unknown> | undefined;
    const paymentMethod: PaymentMethod = body?.paymentMethod === 'cod' ? 'cod' : 'card';

    if (!rawShipping || typeof rawShipping !== 'object') {
      res.status(400).json({ error: 'Shipping address is required.' });
      return;
    }

    const shippingAddress: ShippingAddress = {
      fullName: typeof rawShipping.fullName === 'string' ? rawShipping.fullName.trim() : '',
      street: typeof rawShipping.street === 'string' ? rawShipping.street.trim() : '',
      city: typeof rawShipping.city === 'string' ? rawShipping.city.trim() : '',
      postalCode: typeof rawShipping.postalCode === 'string' ? rawShipping.postalCode.trim() : '',
      country: typeof rawShipping.country === 'string' ? rawShipping.country.trim() : '',
    };

    if (
      shippingAddress.fullName.length < 2 ||
      shippingAddress.fullName.length > 100 ||
      shippingAddress.street.length < 4 ||
      shippingAddress.street.length > 160 ||
      shippingAddress.city.length < 2 ||
      shippingAddress.city.length > 80 ||
      shippingAddress.postalCode.length < 3 ||
      shippingAddress.postalCode.length > 20 ||
      shippingAddress.country.length < 2 ||
      shippingAddress.country.length > 80
    ) {
      res.status(400).json({ error: 'Please complete all shipping address fields.' });
      return;
    }

    const requestedItems = sanitizeCartItems(body?.items);
    if (requestedItems.length === 0) {
      res.status(400).json({ error: 'Your shopping bag is empty or contains unavailable items.' });
      return;
    }

    const snapshots: OrderItemSnapshot[] = [];
    let subtotal = 0;
    for (const item of requestedItems) {
      const product = PRODUCTS.find((p) => p.id === item.productId);
      if (!product || !product.inStock) {
        res.status(400).json({ error: `Item "${item.productId}" is currently unavailable.` });
        return;
      }
      subtotal += product.price * item.quantity;
      snapshots.push({
        productId: product.id,
        name: product.name,
        brand: product.brand,
        variant: item.variant,
        quantity: item.quantity,
        unitPrice: product.price,
        image: product.image,
      });
    }

    const shippingCost = subtotal >= FREE_SHIPPING_THRESHOLD ? 0 : STANDARD_SHIPPING_COST;
    const taxAmount = Math.round(subtotal * TAX_RATE);
    const total = subtotal + shippingCost + taxAmount;

    const now = new Date();
    const eta = new Date(now.getTime() + 4 * 24 * 60 * 60 * 1000);

    const order: Order = {
      id: `ORD-${crypto.randomInt(100000, 999999)}`,
      userId: user.id,
      items: snapshots,
      subtotal,
      shippingCost,
      taxAmount,
      total,
      shippingAddress,
      paymentMethod,
      status: 'Confirmed — Preparing Shipment',
      trackingNumber: `SHP-${crypto.randomInt(10000000, 99999999)}`,
      estimatedDelivery: eta.toISOString(),
      trackingStep: 1,
      createdAt: now.toISOString(),
    };

    db.orders.push(order);
    db.carts[user.id] = [];
    saveStore();

    res.status(201).json({ order });
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`shopEase server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
