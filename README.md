# Kitaab Bazaar — SIWE Backend Verification

> **Problem 2: "Log In With a Wallet, Trust Only the Signature"**  
> Road to Devcon IV Challenge Implementation  
> Repository Name: **`siwe-backend-verification`**

Kitaab Bazaar is a resale marketplace for second-hand engineering textbooks built with Next.js, TypeScript, Viem, Wagmi, Iron-Session, and EIP-4361 / SIWE. It implements zero-trust wallet authentication where the server is the sole authority for identity, verifying nonces, domains, chain IDs, timestamps, and signature validity (supporting both EOA and ERC-1271 smart accounts).

---

## 1. Problem Statement

Traditional username/password and OTP authentication systems introduce friction, credential leaks, and central password database vulnerabilities. For engineering students and book resellers, connecting an Ethereum wallet offers cryptographic identity. However, **naïve wallet authentication that trusts client-submitted wallet addresses (`req.body.address` or headers) is critically vulnerable to identity spoofing**.

Kitaab Bazaar demonstrates production-grade SIWE authentication where **client claims are completely ignored**, and the authenticated identity is derived strictly from verified cryptographic signatures.

---

## 2. Architecture Overview

```
                          ┌───────────────────────────┐
                          │   Frontend (Client App)   │
                          └─────────────┬─────────────┘
                                        │
             1. GET /api/auth/nonce     │
            ───────────────────────────►│  Backend (Iron-Session & NonceStore)
            ◄───────────────────────────│  Generates & stores secure random nonce
               { nonce: "a1b2c3..." }   │
                                        │
             2. User Signs EIP-4361     │
                SIWE Message            │
                                        │
             3. POST /api/auth/verify   │
            ───────────────────────────►│  Backend Verification Engine:
               { message, signature }   │  ├─ 1. Match & invalidate nonce (Replay Protection)
                                        │  ├─ 2. Validate Domain (SIWE_DOMAIN)
                                        │  ├─ 3. Validate Chain ID (SIWE_CHAIN_ID)
                                        │  ├─ 4. Validate Timestamps (issuedAt, expiration)
                                        │  ├─ 5. Verify Signature (EOA + ERC-1271 0x1626ba7e)
            ◄───────────────────────────│  └─ 6. Store verified address in Session Identity
             { success: true, address } │
                                        │
             4. GET /api/seller/me      │
            ───────────────────────────►│  Protected Seller API:
            ◄───────────────────────────│  Ignores request params. Uses session.address ONLY.
               { sellerProfile }        │
```

---

## 3. Core Features

* **Server-Generated Nonce**: Nonces originate strictly from the backend server (`/api/auth/nonce`).
* **Nonce Replay Protection**: Nonces are immediately invalidated upon use and rejected if reused.
* **Domain & Chain ID Validation**: Strictly enforced against server environment configuration.
* **Message Validity Window**: Enforces `issuedAt`, `expirationTime`, and `notBefore` timestamps.
* **EOA & ERC-1271 Smart Account Support**: Verifies EOA address recovery via Viem, with fallback to contract account signature verification via ERC-1271 `isValidSignature(bytes32,bytes)` returning `0x1626ba7e`.
* **Zero-Trust Session Identity**: Authenticated seller identity is derived *only* from verified signatures.
* **Protected Seller Dashboard**: `/seller` dashboard and `/api/seller/me` scoped strictly to session identity.
* **Logout Functionality**: Destroys server-side session cookie (`POST /api/auth/logout`).

---

## 4. Security Model & Defense Deep Dive

| Security Check | Implementation Location | Mitigation / Protection |
| :--- | :--- | :--- |
| **Server Nonce Origin** | [`/src/app/api/auth/nonce/route.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/app/api/auth/nonce/route.ts) | Prevents client-side nonce forgery using `generateNonce()`. |
| **Replay Protection** | [`/src/lib/nonceStore.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/lib/nonceStore.ts) & [`siweVerifier.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/lib/siweVerifier.ts) | Immediately deletes used nonces (`invalidateNonce`). Reused nonces fail. |
| **Domain Validation** | [`/src/lib/siweVerifier.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/lib/siweVerifier.ts#L87-L95) | Compares `message.domain` against server `SIWE_DOMAIN`. |
| **Chain ID Validation** | [`/src/lib/siweVerifier.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/lib/siweVerifier.ts#L97-L106) | Compares `message.chainId` against server `SIWE_CHAIN_ID`. |
| **Timestamp Validation** | [`/src/lib/siweVerifier.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/lib/siweVerifier.ts#L108-L131) | Rejects expired messages or future `issuedAt` dates. |
| **ERC-1271 Support** | [`/src/lib/siweVerifier.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/lib/siweVerifier.ts#L36-L58) | Checks smart accounts via `isValidSignature(bytes32,bytes)` -> `0x1626ba7e`. |
| **Session Identity** | [`/src/app/api/auth/verify/route.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/app/api/auth/verify/route.ts#L34-L37) | Stores derived signature address into `session.address`. |
| **Seller Authorization** | [`/src/app/api/seller/me/route.ts`](file:///c:/Users/nikita/OneDrive/Desktop/dev2/src/app/api/seller/me/route.ts#L18-L23) | Ignores `?address=` parameter; queries strictly using `session.address`. |

---

## 5. Environment Variables Setup

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### Variable Reference

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `SIWE_DOMAIN` | Expected server domain for SIWE message verification | `localhost:3000` |
| `SIWE_URI` | Expected server origin URI | `http://localhost:3000` |
| `SIWE_CHAIN_ID` | Expected Ethereum chain ID (1 = Mainnet) | `1` |
| `SESSION_SECRET` | 32+ character random string for Iron-Session encryption | `kitaab_bazaar_super_secret_session_key_32bytes_long` |
| `NEXT_PUBLIC_RPC_URL` | Ethereum RPC provider URL for ERC-1271 contract queries | `https://eth.llamarpc.com` |

> ⚠️ **Security Policy**: No secrets or private keys are committed to Git. `.env` is listed in `.gitignore`.

---

## 6. Installation & Running

### Install Dependencies
```bash
npm install
```

### Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 7. Security Test Suite

The project includes an automated security test suite covering all 9 evaluation requirements:

```bash
npm test
```

### Verified Security Scenarios

1. ✅ **Valid SIWE Authentication**: Nonce generation, signing, and verification.
2. ✅ **Reused Nonce Rejection**: Replaying a previously verified nonce fails.
3. ✅ **Identity Spoof Protection**: Client-supplied address claims do not affect session identity.
4. ✅ **Domain Mismatch Rejection**: Messages with mismatched domains are rejected.
5. ✅ **Validity Window Enforcement**: Expired timestamps are rejected.
6. ✅ **Chain ID Mismatch Rejection**: Wrong chain IDs are rejected.
7. ✅ **ERC-1271 Smart Account Signature Support**: Contract accounts checked via `0x1626ba7e`.
8. ✅ **Seller Identity Isolation**: Seller profiles are isolated strictly by verified wallet.
9. ✅ **Unauthenticated Access Denial**: Protected APIs return 401 Unauthorized without session.

---

## 8. Security Checklist Compliance

- [x] **Check 1**: Nonce is invalidated immediately after successful verification.
- [x] **Check 2**: Nonce is generated server-side via `/api/auth/nonce`.
- [x] **Check 3**: Session identity comes purely from verified signature (`session.address`).
- [x] **Check 4**: SIWE domain is compared against server-configured `SIWE_DOMAIN`.
- [x] **Check 5**: Message validity window (`issuedAt`, `expirationTime`, `notBefore`) is enforced.
- [x] **Check 6**: Chain ID is compared against server-configured `SIWE_CHAIN_ID`.
- [x] **Check 7**: ERC-1271 contract-account signature verification is supported in `siweVerifier.ts`.
- [x] **Check 8**: Seller routes (`/api/seller/me`) derive identity strictly from server session.
- [x] **Check 9**: No secrets, private keys, or credentials committed to repository.
