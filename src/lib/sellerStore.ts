import { getAddress } from 'viem';

export interface TextbookListing {
  id: string;
  title: string;
  author: string;
  priceEth: string;
  condition: 'Like New' | 'Good' | 'Fair' | 'Acceptable';
  courseCode: string;
}

export interface SellerProfile {
  walletAddress: `0x${string}`;
  sellerName: string;
  memberSince: string;
  pendingPayoutEth: string;
  listings: TextbookListing[];
}

// Sample marketplace textbook catalog for default/new sellers
const sampleListings: TextbookListing[] = [
  {
    id: 'kb-101',
    title: 'Introduction to Algorithms (4th Edition)',
    author: 'Cormen, Leiserson, Rivest, Stein',
    priceEth: '0.045',
    condition: 'Like New',
    courseCode: 'CS 301',
  },
  {
    id: 'kb-102',
    title: 'Computer Systems: A Programmer\'s Perspective (3rd Ed)',
    author: 'Randal E. Bryant, David R. O\'Hallaron',
    priceEth: '0.038',
    condition: 'Good',
    courseCode: 'CS 213',
  },
  {
    id: 'kb-103',
    title: 'Modern Operating Systems (5th Edition)',
    author: 'Andrew S. Tanenbaum',
    priceEth: '0.029',
    condition: 'Fair',
    courseCode: 'CS 410',
  },
];

// Pre-seeded database for demonstration addresses
const sellerDatabase = new Map<string, SellerProfile>();

// Seed a demo seller profile A
const demoAddressA = getAddress('0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA');
sellerDatabase.set(demoAddressA.toLowerCase(), {
  walletAddress: demoAddressA,
  sellerName: 'Prof. Turing\'s Used Books',
  memberSince: 'Oct 2024',
  pendingPayoutEth: '0.155',
  listings: [
    {
      id: 'kb-201',
      title: 'Digital Design and Computer Architecture',
      author: 'David Harris, Sarah Harris',
      priceEth: '0.052',
      condition: 'Like New',
      courseCode: 'ECE 202',
    },
    {
      id: 'kb-202',
      title: 'Artificial Intelligence: A Modern Approach (4th Ed)',
      author: 'Stuart Russell, Peter Norvig',
      priceEth: '0.068',
      condition: 'Good',
      courseCode: 'CS 470',
    },
  ],
});

/**
 * Retrieve seller information strictly bound to the authenticated session address.
 * Never allows address overrides from request body or URL params.
 */
export function getSellerByAddress(rawAddress: string): SellerProfile {
  const checksummed = getAddress(rawAddress);
  const key = checksummed.toLowerCase();

  if (sellerDatabase.has(key)) {
    return sellerDatabase.get(key)!;
  }

  // Generate dynamic seller profile for newly authenticated wallets
  const shortAddr = `${checksummed.slice(0, 6)}...${checksummed.slice(-4)}`;
  const dynamicProfile: SellerProfile = {
    walletAddress: checksummed,
    sellerName: `Seller ${shortAddr}`,
    memberSince: 'Sep 2026',
    pendingPayoutEth: '0.082',
    listings: sampleListings,
  };

  sellerDatabase.set(key, dynamicProfile);
  return dynamicProfile;
}
