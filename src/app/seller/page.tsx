'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, LogOut, ShieldCheck, DollarSign, BookMarked, Wallet, CheckCircle2, AlertCircle, ArrowLeft } from 'lucide-react';
import { SellerProfile } from '@/lib/sellerStore';

export default function SellerDashboardPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSellerProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Call protected seller endpoint. 
      // Identity is derived STRICTLY from server-side session.
      const res = await fetch('/api/seller/me', { cache: 'no-store' });
      const data = await res.json();

      if (!res.ok || !data.success) {
        if (res.status === 401) {
          router.push('/');
          return;
        }
        throw new Error(data.error || 'Failed to authorize seller.');
      }

      setSeller(data.seller);
    } catch (err: any) {
      setError(err?.message || 'Unauthorized or session expired.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSellerProfile();
  }, []);

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/');
    } catch (err) {
      router.push('/');
    }
  };

  if (loading) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-amber-500/30 border-t-amber-500 rounded-full animate-spin" />
          <p className="text-xs text-slate-400 font-medium">Validating seller authorization...</p>
        </div>
      </main>
    );
  }

  if (error || !seller) {
    return (
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="max-w-md w-full glass-panel rounded-2xl p-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-100">Access Restricted</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'No active seller session found. Please sign in with your verified Ethereum wallet.'}
          </p>
          <button
            onClick={() => router.push('/')}
            className="w-full btn-primary py-2.5 rounded-xl font-semibold text-xs flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Return to Login
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="flex-1 max-w-6xl w-full mx-auto p-6 space-y-8">
      {/* Top Navbar */}
      <header className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass-panel p-6 rounded-2xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 shadow-md">
            <BookOpen className="w-6 h-6 stroke-[2.5]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-slate-100">{seller.sellerName}</h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <CheckCircle2 className="w-3 h-3" /> SIWE Session Verified
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Member since {seller.memberSince} • Kitaab Bazaar Reseller Portal
            </p>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="btn-secondary py-2.5 px-4 rounded-xl text-xs font-semibold flex items-center gap-2 hover:border-red-500/50 hover:text-red-400 transition-all"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </header>

      {/* Seller Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Wallet Address */}
        <div className="glass-panel p-6 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center mb-3">
            <Wallet className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium text-slate-400">Authenticated Wallet Address</span>
          <p className="text-sm font-mono font-bold text-slate-100 break-all bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
            {seller.walletAddress}
          </p>
          <p className="text-[11px] text-cyan-400/90 pt-1 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" /> Signature verified server-side
          </p>
        </div>

        {/* Metric 2: Pending Payout */}
        <div className="glass-panel p-6 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
            <DollarSign className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium text-slate-400">Pending Seller Payout</span>
          <p className="text-2xl font-extrabold text-amber-400">
            {seller.pendingPayoutEth} ETH
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            Available for instant withdrawal to verified wallet
          </p>
        </div>

        {/* Metric 3: Listed Books */}
        <div className="glass-panel p-6 rounded-2xl space-y-2 relative overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3">
            <BookMarked className="w-5 h-5" />
          </div>
          <span className="text-xs font-medium text-slate-400">Active Book Listings</span>
          <p className="text-2xl font-extrabold text-slate-100">
            {seller.listings.length} Engineering Textbooks
          </p>
          <p className="text-[11px] text-slate-400 pt-1">
            Currently visible on Kitaab Bazaar marketplace
          </p>
        </div>
      </div>

      {/* Textbook Listings Section */}
      <section className="glass-panel p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-amber-400" /> My Listed Engineering Textbooks
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Textbooks listed under wallet address {seller.walletAddress.slice(0, 6)}...{seller.walletAddress.slice(-4)}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {seller.listings.map((book) => (
            <div
              key={book.id}
              className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex flex-col justify-between space-y-3 hover:border-amber-500/30 transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">{book.courseCode}</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">{book.condition}</span>
                </div>
                <h3 className="font-semibold text-sm text-slate-100 leading-snug">{book.title}</h3>
                <p className="text-xs text-slate-400 mt-1">{book.author}</p>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-slate-800/80">
                <span className="text-xs text-slate-400">Asking Price</span>
                <span className="font-bold text-amber-400 text-sm">{book.priceEth} ETH</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Security Guarantee Banner */}
      <footer className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-center text-xs text-slate-500">
        🔒 Security Note: This seller dashboard is protected by server-side SIWE session authentication. Any attempt to modify request parameters or spoof seller addresses is automatically rejected by the backend.
      </footer>
    </main>
  );
}
