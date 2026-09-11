'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAccount, useConnect, useDisconnect, useSignMessage } from 'wagmi';
import { injected } from 'wagmi/connectors';
import { SiweMessage } from 'siwe';
import { BookOpen, ShieldCheck, Wallet, ArrowRight, AlertCircle, RefreshCw, KeyRound, Lock } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const { address, isConnected } = useAccount();
  const { connect, isPending: isConnecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { signMessageAsync } = useSignMessage();

  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper for SIWE Authentication workflow
  const handleSiweLogin = async () => {
    try {
      setLoading(true);
      setErrorMessage(null);
      setStatusMessage('Requesting secure nonce from backend...');

      if (!address) {
        throw new Error('Wallet not connected.');
      }

      // Step 3 & 4: Fetch server-generated nonce
      const nonceRes = await fetch('/api/auth/nonce', { cache: 'no-store' });
      if (!nonceRes.ok) {
        throw new Error('Failed to fetch authentication nonce from server.');
      }
      const { nonce } = await nonceRes.json();

      if (!nonce) {
        throw new Error('Server returned an empty nonce.');
      }

      setStatusMessage('Constructing SIWE message...');

      // Step 6: Construct EIP-4361 SIWE Message
      const domain = window.location.host;
      const origin = window.location.origin;
      const chainId = 1; // Default mainnet expected chain ID

      const siweMessage = new SiweMessage({
        domain,
        address,
        statement: 'Sign in with Ethereum to access your Kitaab Bazaar seller portal.',
        uri: origin,
        version: '1',
        chainId,
        nonce,
        issuedAt: new Date().toISOString(),
      });

      const messageToSign = siweMessage.prepareMessage();

      setStatusMessage('Please sign the SIWE message in your wallet...');

      // Step 7: Request wallet signature
      let signature: `0x${string}`;
      try {
        signature = await signMessageAsync({ message: messageToSign });
      } catch (err: any) {
        if (err?.code === 4001 || err?.message?.includes('rejected')) {
          throw new Error('Signature request rejected by user.');
        }
        throw err;
      }

      setStatusMessage('Verifying signature & validating session on backend...');

      // Step 8 & 9: Send signed message & signature to server
      const verifyRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: messageToSign,
          signature,
        }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Backend signature verification failed.');
      }

      setStatusMessage('Verification successful! Redirecting to seller dashboard...');
      
      // Step 12: Redirect to seller dashboard
      setTimeout(() => {
        router.push('/seller');
      }, 500);

    } catch (err: any) {
      setErrorMessage(err?.message || 'An unexpected error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex-1 flex flex-col items-center justify-center p-6 relative">
      {/* Background visual accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md glass-panel rounded-2xl p-8 shadow-2xl relative z-10">
        
        {/* Header Branding */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center shadow-lg mb-4">
            <BookOpen className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight gradient-text">
            Kitaab Bazaar
          </h1>
          <p className="text-sm text-slate-400 mt-2">
            Engineering Textbook Resale Portal
          </p>
          <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <ShieldCheck className="w-3.5 h-3.5" /> EIP-4361 / SIWE Verified
          </div>
        </div>

        {/* Error Alert Box */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold block mb-1">Authentication Error</span>
              <p className="text-xs text-red-200/90 leading-relaxed">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Status Loader */}
        {loading && statusMessage && (
          <div className="mb-6 p-4 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-sm flex items-center gap-3">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            <span className="text-xs font-medium">{statusMessage}</span>
          </div>
        )}

        {/* Wallet Connection & SIWE Actions */}
        <div className="space-y-4">
          {!isConnected ? (
            <button
              onClick={() => connect({ connector: injected() })}
              disabled={isConnecting}
              className="w-full btn-primary py-3.5 px-4 rounded-xl flex items-center justify-center gap-3 font-semibold shadow-lg text-sm"
            >
              <Wallet className="w-5 h-5" />
              {isConnecting ? 'Connecting Wallet...' : 'Connect Wallet'}
            </button>
          ) : (
            <div className="space-y-4">
              {/* Connected Wallet Pill */}
              <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-slate-400">Connected:</span>
                </div>
                <span className="font-mono text-slate-200">
                  {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : ''}
                </span>
                <button
                  onClick={() => disconnect()}
                  className="text-slate-400 hover:text-red-400 transition-colors text-[11px] underline ml-2"
                >
                  Disconnect
                </button>
              </div>

              {/* SIWE Verification Action */}
              <button
                onClick={handleSiweLogin}
                disabled={loading}
                className="w-full btn-primary py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm shadow-xl disabled:opacity-50"
              >
                <KeyRound className="w-4 h-4" />
                {loading ? 'Verifying Signature...' : 'Sign SIWE Message & Login'}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {/* Architecture Security Guarantee Note */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 text-center">
          <div className="flex items-center justify-center gap-1.5 text-xs text-slate-400 mb-2">
            <Lock className="w-3.5 h-3.5 text-amber-400" />
            <span>Zero-Trust Client Security</span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Nonces originate from backend session. Address identity is derived purely from verified EOA or ERC-1271 contract signatures. Client address headers are ignored.
          </p>
        </div>

      </div>
    </main>
  );
}
