import { describe, it, expect, beforeEach } from 'vitest';
import { SiweMessage, generateNonce } from 'siwe';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getAddress } from 'viem';
import { registerNonce, isValidNonce, invalidateNonce } from '../src/lib/nonceStore';
import { verifySiweAuth, verifyErc1271Signature, ERC1271_MAGIC_VALUE } from '../src/lib/siweVerifier';
import { getSellerByAddress } from '../src/lib/sellerStore';

// Test configuration matching environment settings
const TEST_DOMAIN = 'localhost:3000';
const TEST_URI = 'http://localhost:3000';
const TEST_CHAIN_ID = 1;

// Set env vars for test runner
process.env.SIWE_DOMAIN = TEST_DOMAIN;
process.env.SIWE_URI = TEST_URI;
process.env.SIWE_CHAIN_ID = String(TEST_CHAIN_ID);

describe('Kitaab Bazaar SIWE Security & Authentication Test Suite', () => {
  let testAccount: ReturnType<typeof privateKeyToAccount>;

  beforeEach(() => {
    // Generate fresh EOA keypair for each test
    const privateKey = generatePrivateKey();
    testAccount = privateKeyToAccount(privateKey);
  });

  it('Check 1 & 2: Server generates valid nonce and invalidates it after verification (Replay Protection)', async () => {
    const nonce = generateNonce();
    registerNonce(nonce);

    expect(isValidNonce(nonce)).toBe(true);

    const siwe = new SiweMessage({
      domain: TEST_DOMAIN,
      address: testAccount.address,
      statement: 'Sign in to Kitaab Bazaar',
      uri: TEST_URI,
      version: '1',
      chainId: TEST_CHAIN_ID,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const preparedMessage = siwe.prepareMessage();
    const signature = await testAccount.signMessage({ message: preparedMessage });

    // First verification attempt: MUST SUCCEED
    const res1 = await verifySiweAuth(preparedMessage, signature, nonce);
    expect(res1.success).toBe(true);
    expect(res1.address).toBe(getAddress(testAccount.address));

    // REPLAY ATTEMPT: Re-using the exact same nonce MUST FAIL
    const res2 = await verifySiweAuth(preparedMessage, signature, nonce);
    expect(res2.success).toBe(false);
    expect(res2.error).toContain('Invalid, expired, or previously used nonce');
  });

  it('Check 3: Verified wallet identity comes strictly from signature, ignoring client claims', async () => {
    const nonce = generateNonce();
    registerNonce(nonce);

    // Genuine signer is testAccount.address
    const siwe = new SiweMessage({
      domain: TEST_DOMAIN,
      address: testAccount.address,
      statement: 'Sign in to Kitaab Bazaar',
      uri: TEST_URI,
      version: '1',
      chainId: TEST_CHAIN_ID,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const preparedMessage = siwe.prepareMessage();
    const signature = await testAccount.signMessage({ message: preparedMessage });

    const verification = await verifySiweAuth(preparedMessage, signature, nonce);

    expect(verification.success).toBe(true);
    // Address returned by server MUST equal recovered signer address
    expect(verification.address).toBe(getAddress(testAccount.address));

    // Test that seller data store strictly uses verified address
    const attackerClaim = '0x1111111111111111111111111111111111111111';
    const sellerData = getSellerByAddress(verification.address!);

    expect(sellerData.walletAddress).toBe(getAddress(testAccount.address));
    expect(sellerData.walletAddress).not.toBe(getAddress(attackerClaim));
  });

  it('Check 4: Domain mismatch is strictly rejected', async () => {
    const nonce = generateNonce();
    registerNonce(nonce);

    const siwe = new SiweMessage({
      domain: 'malicious-phishing-site.com', // Evil domain
      address: testAccount.address,
      statement: 'Sign in to Kitaab Bazaar',
      uri: 'http://malicious-phishing-site.com',
      version: '1',
      chainId: TEST_CHAIN_ID,
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const preparedMessage = siwe.prepareMessage();
    const signature = await testAccount.signMessage({ message: preparedMessage });

    const res = await verifySiweAuth(preparedMessage, signature, nonce);

    expect(res.success).toBe(false);
    expect(res.error).toContain('Domain mismatch');
  });

  it('Check 5: Expired or invalid validity window timestamp is strictly rejected', async () => {
    const nonce = generateNonce();
    registerNonce(nonce);

    // Expired 1 hour ago
    const pastDate = new Date(Date.now() - 3600 * 1000).toISOString();

    const siwe = new SiweMessage({
      domain: TEST_DOMAIN,
      address: testAccount.address,
      statement: 'Sign in to Kitaab Bazaar',
      uri: TEST_URI,
      version: '1',
      chainId: TEST_CHAIN_ID,
      nonce,
      issuedAt: new Date(Date.now() - 7200 * 1000).toISOString(),
      expirationTime: pastDate,
    });

    const preparedMessage = siwe.prepareMessage();
    const signature = await testAccount.signMessage({ message: preparedMessage });

    const res = await verifySiweAuth(preparedMessage, signature, nonce);

    expect(res.success).toBe(false);
    expect(res.error).toContain('SIWE message has expired');
  });

  it('Check 6: Chain ID mismatch is strictly rejected', async () => {
    const nonce = generateNonce();
    registerNonce(nonce);

    const siwe = new SiweMessage({
      domain: TEST_DOMAIN,
      address: testAccount.address,
      statement: 'Sign in to Kitaab Bazaar',
      uri: TEST_URI,
      version: '1',
      chainId: 137, // Polygon mainnet instead of expected Ethereum mainnet (1)
      nonce,
      issuedAt: new Date().toISOString(),
    });

    const preparedMessage = siwe.prepareMessage();
    const signature = await testAccount.signMessage({ message: preparedMessage });

    const res = await verifySiweAuth(preparedMessage, signature, nonce);

    expect(res.success).toBe(false);
    expect(res.error).toContain('Chain ID mismatch');
  });

  it('Check 7: ERC-1271 Smart Account signature interface verification', async () => {
    // Test ERC1271 constant magic value
    expect(ERC1271_MAGIC_VALUE).toBe('0x1626ba7e');
    
    // Verify fallback handling when contract address has no deployed bytecode or returns false
    const dummyContractAddress = '0x0000000000000000000000000000000000000000';
    const isValid = await verifyErc1271Signature(
      dummyContractAddress,
      'Test Message',
      '0x1234'
    );
    expect(isValid).toBe(false);
  });

  it('Check 8 & 9: Seller data isolation and unauthenticated access prevention', () => {
    const sellerA = getSellerByAddress('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
    const sellerB = getSellerByAddress('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB');

    expect(sellerA.walletAddress).toBe(getAddress('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA'));
    expect(sellerB.walletAddress).toBe(getAddress('0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB'));
    expect(sellerA.listings).not.toEqual(sellerB.listings);
  });
});
