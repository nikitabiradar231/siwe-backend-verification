import { http, createConfig } from 'wagmi';
import { mainnet, sepolia, hardhat } from 'wagmi/chains';
import { injected } from 'wagmi/connectors';

export const config = createConfig({
  chains: [mainnet, sepolia, hardhat],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || 'https://eth.llamarpc.com'),
    [sepolia.id]: http('https://rpc.sepolia.org'),
    [hardhat.id]: http('http://127.0.0.1:8545'),
  },
});
