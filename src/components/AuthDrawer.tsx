import { useEffect, useState } from 'react';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import { AlertCircle, Eye, EyeOff, LogOut, PackageCheck, User, X } from 'lucide-react';
import { formatINR } from '../lib/catalogData.ts';
import { supabase } from '../supabaseClient.js';
import type { Order, UserProfile } from '../types/store.ts';
import { ResilientImage } from './ResilientImage.tsx';

export interface AuthSuccessMeta {
  isNewAccount?: boolean;
  email?: string;
  needsConfirmation?: boolean;
  name?: string;
  supabaseSynced?: boolean;
}

interface AuthDrawerProps {
  isOpen: boolean;
  user: UserProfile | null;
  orders: Order[];
  ordersLoading: boolean;
  initialMode?: 'login' | 'register';
  onClose: () => void;
  onAuthSuccess: (
    session: Session | null,
    supabaseUser: SupabaseUser | null,
    meta?: AuthSuccessMeta,
  ) => Promise<void>;
  onBackendAuthSuccess: (
    token: string,
    user: UserProfile,
    meta?: AuthSuccessMeta,
  ) => Promise<void>;
  onLogout: () => Promise<void>;
}

export function AuthDrawer({
  isOpen,
  user,
  orders,
  ordersLoading,
  initialMode = 'login',
  onClose,
  onAuthSuccess,
  onBackendAuthSuccess,
  onLogout,
}: AuthDrawerProps) {
  const [mode, setMode] = useState<'login' | 'register'>(initialMode);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMode(initialMode);
    setError(null);
  }, [initialMode, isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const normalizedEmail = email.trim();
      const trimmedName = name.trim();
      if (mode === 'login') {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        });
        if (signInError) {
          const fallbackRes = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: normalizedEmail, password }),
          });
          const fallbackData = (await fallbackRes.json()) as {
            token?: string;
            user?: UserProfile;
            error?: string;
          };
          if (fallbackRes.ok && fallbackData.token && fallbackData.user) {
            let linkedSupabaseSession: { session: Session; user: SupabaseUser } | null = null;
            if (!fallbackData.user.supabaseSynced && !/email not confirmed/i.test(signInError.message)) {
              try {
                const { data: syncData } = await supabase.auth.signUp({
                  email: normalizedEmail,
                  password,
                  options: {
                    data: {
                      name: fallbackData.user.name,
                      full_name: fallbackData.user.name,
                      display_name: fallbackData.user.name,
                      dob: fallbackData.user.dob ?? null,
                      phone: fallbackData.user.phone ?? null,
                    },
                  },
                });
                if (syncData.session?.access_token && syncData.user) {
                  await fetch('/api/auth/link-supabase', {
                    method: 'POST',
                    headers: {
                      'Content-Type': 'application/json',
                      Authorization: `Bearer ${fallbackData.token}`,
                    },
                    body: JSON.stringify({ supabaseAccessToken: syncData.session.access_token }),
                  });
                  linkedSupabaseSession = { session: syncData.session, user: syncData.user };
                }
              } catch {
                // Keep login working even if Supabase rate limit is still active
              }
            }
            if (linkedSupabaseSession) {
              await onAuthSuccess(linkedSupabaseSession.session, linkedSupabaseSession.user);
            } else {
              await onBackendAuthSuccess(fallbackData.token, fallbackData.user);
            }
          } else {
            setError(
              /email not confirmed/i.test(signInError.message)
                ? signInError.message
                : fallbackData.error || signInError.message,
            );
            return;
          }
        } else {
          await onAuthSuccess(data.session, data.user);
        }
      } else {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: normalizedEmail,
          password,
          options: {
            data: {
              name: trimmedName,
              full_name: trimmedName,
              display_name: trimmedName,
            },
          },
        });
        if (signUpError) {
          const isRateLimited =
            signUpError.status === 429 || /rate limit/i.test(signUpError.message);
          if (!isRateLimited) {
            setError(signUpError.message);
            return;
          }

          const fallbackRes = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              name: trimmedName,
              email: normalizedEmail,
              password,
            }),
          });
          const fallbackData = (await fallbackRes.json()) as {
            token?: string;
            user?: UserProfile;
            supabaseSynced?: boolean;
            error?: string;
          };
          if (!fallbackRes.ok || !fallbackData.token || !fallbackData.user) {
            setError(fallbackData.error || 'Unable to create account. Please try again.');
            return;
          }
          await onBackendAuthSuccess(fallbackData.token, fallbackData.user, {
            isNewAccount: true,
            email: fallbackData.user.email,
            needsConfirmation: false,
            name: fallbackData.user.name,
            supabaseSynced: Boolean(fallbackData.supabaseSynced),
          });
          setName('');
        } else {
          if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
            setError('An account with this email already exists. Please sign in.');
            return;
          }
          await onAuthSuccess(data.session, data.user, {
            isNewAccount: true,
            email: data.user?.email || normalizedEmail,
            needsConfirmation: !data.session,
            name: trimmedName || undefined,
            supabaseSynced: true,
          });
          setName('');
        }
      }

      setPassword('');
      if (window.location.pathname !== '/') {
        window.history.pushState(null, '', '/');
      }
      onClose();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
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
      aria-labelledby="auth-drawer-title"
    >
      <aside
        className="w-full max-w-md h-dvh bg-[#FFFDF9] border-l border-[#E4D8C6] flex flex-col shadow-2xl animate-drawer-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-4 sm:px-6 py-4 sm:py-5 border-b border-[#EFE5D6] flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 min-w-0">
            <User className="w-4 h-4 text-[#6B3F26] shrink-0" />
            <h2 id="auth-drawer-title" className="font-display text-lg font-semibold text-[#2C1A12] truncate">
              {user ? 'Your Account' : mode === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close account drawer"
            className="w-10 h-10 flex items-center justify-center rounded-lg text-[#63493B] hover:bg-[#F3EBDD] hover:text-[#2C1A12] transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          {!user ? (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-1 p-1 bg-[#F3EBDD] rounded-lg">
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setError(null);
                  }}
                  className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'login'
                      ? 'bg-[#FFFDF9] text-[#2C1A12] shadow-xs'
                      : 'text-[#63493B] hover:text-[#2C1A12]'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className={`min-h-[40px] py-2 px-3 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    mode === 'register'
                      ? 'bg-[#FFFDF9] text-[#2C1A12] shadow-xs'
                      : 'text-[#63493B] hover:text-[#2C1A12]'
                  }`}
                >
                  Create Account
                </button>
              </div>

              <p className="text-sm text-[#63493B] leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to access your saved shopping bag, express checkout, and order history.'
                  : 'Create an account to save your bag, track deliveries, and speed through checkout.'}
              </p>

              <form key={mode} onSubmit={handleSubmit} className="space-y-4 animate-panel-enter">
                {mode === 'register' && (
                  <div>
                    <label htmlFor="auth-name" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                      Full Name
                    </label>
                    <input
                      id="auth-name"
                      type="text"
                      required
                      minLength={2}
                      maxLength={80}
                      autoComplete="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jordan Mercer"
                      className="w-full h-11 px-3.5 text-base sm:text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                    />
                  </div>
                )}

                <div>
                  <label htmlFor="auth-email" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                    Email Address
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full h-11 px-3.5 text-base sm:text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                  />
                </div>

                <div>
                  <label htmlFor="auth-password" className="block text-xs font-medium text-[#2C1A12] mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={8}
                      maxLength={128}
                      autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className="w-full h-11 pl-3.5 pr-12 text-base sm:text-sm bg-[#FFFDF9] border border-[#D7C6B1] rounded-lg text-[#2C1A12] placeholder:text-[#9A8476] focus:outline-none focus:border-[#6B3F26]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-1 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center text-[#63493B] hover:text-[#2C1A12] rounded"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full min-h-[44px] px-5 py-2.5 bg-[#6B3F26] hover:bg-[#4E2C19] disabled:opacity-60 text-[#FFFDF9] text-sm font-medium rounded-lg transition-colors whitespace-nowrap"
                >
                  {submitting
                    ? 'Verifying...'
                    : mode === 'login'
                      ? 'Sign In'
                      : 'Create Account'}
                </button>
              </form>

              {error && (
                <div
                  role="alert"
                  className="flex items-start gap-2 p-3 rounded-lg bg-[#FEF2F2] border border-[#FECACA] text-[#991B1B] text-xs"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-4 rounded-xl bg-[#F5EFE4] border border-[#E4D8C6] flex flex-wrap items-center justify-between gap-3 sm:gap-4">
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base font-semibold text-[#2C1A12] truncate">
                    {user.name}
                  </p>
                  <p className="text-xs text-[#63493B] truncate mt-0.5">{user.email}</p>
                </div>
                <button
                  type="button"
                  onClick={onLogout}
                  className="inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-2 text-xs font-medium text-[#1E4E6E] bg-[#E1F0FA] border border-[#A8D4F0] rounded-lg hover:bg-[#CBE4F6] transition-colors whitespace-nowrap shrink-0"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-display text-sm font-semibold text-[#2C1A12]">
                    Order History
                  </h3>
                  <span className="font-mono text-xs text-[#7C6354] tabular-nums">
                    {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                  </span>
                </div>

                {ordersLoading ? (
                  <div className="py-10 text-center text-xs text-[#7C6354]">
                    Loading your orders...
                  </div>
                ) : orders.length === 0 ? (
                  <div className="py-10 px-4 text-center border border-dashed border-[#D7C6B1] rounded-xl">
                    <PackageCheck className="w-6 h-6 text-[#7C6354] mx-auto mb-2" strokeWidth={1.5} />
                    <p className="text-sm font-medium text-[#2C1A12]">No orders placed yet</p>
                    <p className="text-xs text-[#7C6354] mt-1">
                      Completed checkouts will appear here with full shipping receipts.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((order) => (
                      <div
                        key={order.id}
                        className="border border-[#E4D8C6] rounded-xl p-4 space-y-3 bg-[#FFFDF9]"
                      >
                        <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#EFE5D6]">
                          <div>
                            <p className="font-mono text-xs font-medium text-[#2C1A12]">
                              {order.id}
                            </p>
                            <p className="text-[11px] text-[#7C6354]">
                              {new Date(order.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-sm font-medium text-[#2C1A12] tabular-nums">
                              {formatINR(order.total)}
                            </p>
                            <p className="text-[11px] text-[#15803D] font-medium">
                              {order.status}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {order.items.map((item) => (
                            <div
                              key={`${order.id}-${item.productId}-${item.variant}`}
                              className="flex items-center gap-3 text-xs"
                            >
                              <div className="w-10 h-10 rounded-md overflow-hidden bg-[#F3EBDD] shrink-0">
                                <ResilientImage
                                  src={item.image}
                                  alt={item.name}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                              <div className="flex-1 min-w-0">
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
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
