# EcoShip Rewards: Decentralized Incentives for Sustainable Logistics

## Overview

**EcoShip Rewards** is a Web3 platform built on the Stacks blockchain using Clarity smart contracts. It incentivizes sustainable shipping practices in the global logistics industry by rewarding participants with fungible tokens (ECOSHIP) for opting into bulk shipments or eco-friendly methods (e.g., electric vehicles, carbon-neutral routes, or consolidated loads). 

The platform addresses real-world problems like:
- **High carbon emissions**: Individual parcel shipments contribute to ~14% of global CO2 from transportation (source: IPCC reports). Bulk and green options reduce trips and fuel use.
- **Supply chain inefficiencies**: Fragmented logistics lead to empty return trips and over-packaging, wasting resources and increasing costs.
- **Lack of transparency and incentives**: Shippers and carriers often prioritize speed/cost over sustainability without verifiable rewards.

By leveraging blockchain for immutable tracking, tokenomics for rewards, and oracles for real-world data (e.g., GPS/carbon APIs), EcoShip creates a transparent, decentralized marketplace. Users (shippers, carriers, verifiers) earn, stake, and govern ECOSHIP tokens, fostering a self-sustaining ecosystem that scales adoption of green logistics.

## Key Features

- **Token Rewards System**: Earn ECOSHIP tokens based on shipment efficiency (e.g., 10% bonus for bulk loads >50kg, 15% for EV-verified routes).
- **Smart Shipment Matching**: Decentralized marketplace to pair bulk opportunities, reducing empty hauls.
- **Eco-Verification**: Integrates Chainlink oracles for off-chain proof (e.g., carbon footprint data from APIs like Google Maps or climate sensors).
- **Staking & Governance**: Stake tokens to vote on reward parameters or access premium matching.
- **Real-World Integration**: Frontend dashboard for logistics firms; API hooks for ERP systems like SAP or Shopify.

## Architecture & Smart Contracts

The core is 6 Clarity smart contracts, deployed on Stacks mainnet/testnet. They form a modular, secure system with cross-contract calls for composability. All contracts follow Stacks Improvement Proposals (SIPs) for tokens and security best practices (e.g., no reentrancy vulnerabilities via Clarity's atomic execution).

### 1. **ECOSHIP Token (fungible-token.clar)**
   - **Purpose**: SIP-010 compliant fungible token for rewards.
   - **Key Functions**:
     - `mint` (admin-only, for reward emissions).
     - `transfer`, `balance-of`, `get-total-supply`.
     - Initial supply: 1B tokens (20% for liquidity, 30% rewards pool, 20% team/vesting, 30% ecosystem).
   - **Solves**: Provides economic incentives without centralized control.

### 2. **Shipment Registry (shipment-registry.clar)**
   - **Purpose**: Immutable ledger for registering shipments with metadata (origin, destination, weight, eco-flags).
   - **Key Functions**:
     - `register-shipment` (tx-sender as shipper, emits event for oracles).
     - `update-status` (carrier-only, with proof like tx-hash from IoT).
     - `get-shipment` (by ID).
   - **Solves**: Prevents double-claiming rewards; enables verifiable tracking.

### 3. **Reward Distributor (reward-distributor.clar)**
   - **Purpose**: Calculates and distributes ECOSHIP based on shipment data.
   - **Key Functions**:
     - `claim-rewards` (verifies eco/bulk criteria via oracle callbacks).
     - `distribute-batch` (for completed shipments, e.g., bulk bonus = weight * factor).
     - Integrates with Token contract for mint/transfer.
   - **Solves**: Automates fair rewards, reducing admin overhead in logistics.

### 4. **Eco-Verifier (eco-verifier.clar)**
   - **Purpose**: Handles oracle-fed verification for sustainability claims.
   - **Key Functions**:
     - `submit-proof` (carrier submits off-chain data hash).
     - `verify-eco` (oracle job checks carbon savings > threshold, e.g., <0.5kg CO2/km).
     - `resolve-dispute` (governance-voted, with slashable stakes).
   - **Solves**: Bridges Web2 data to Web3 trustlessly, combating greenwashing.

### 5. **Marketplace Matcher (marketplace-matcher.clar)**
   - **Purpose**: Decentralized P2P matching for bulk/eco shipments.
   - **Key Functions**:
     - `post-opportunity` (e.g., "bulk load from NYC to LA, EV preferred").
     - `match-bid` (algorithmic scoring: eco-alignment + stake weight).
     - `settle-match` (escrow ECOSHIP for commitments).
   - **Solves**: Optimizes routes dynamically, cutting emissions by 20-30% via consolidation.

### 6. **Governance Staking (governance-staking.clar)**
   - **Purpose**: DAO-like staking for community control.
   - **Key Functions**:
     - `stake`/`unstake` (locks ECOSHIP for voting power).
     - `propose`/`vote` (e.g., adjust reward rates; quorum 5% supply).
     - Integrates with all contracts for permissioned calls (e.g., admin mint).
   - **Solves**: Ensures long-term alignment; prevents whale dominance via quadratic voting.

**Interconnections**: Registry feeds into Distributor/Verifier; Marketplace uses Staking for bids; all use Token for payments. Total gas efficiency: ~150k cycles per tx (optimized via maps/traits).

## Tech Stack

- **Blockchain**: Stacks (L2 on Bitcoin for settlement).
- **Smart Contracts**: Clarity (secure, decidable language).
- **Frontend**: React/Next.js with @stacks/connect for wallet integration (e.g., Leather/Hiro).
- **Backend/Oracles**: Node.js for API relays; Chainlink on Stacks for data feeds.
- **Testing**: Clarinet (local devnet); Mocha/Chai for unit tests.
- **Deployment**: Hiro CLI for contract uploads; Gaia for storage.

## Installation & Setup

1. **Prerequisites**:
   - Node.js 18+, Rust (for Clarinet).
   - Stacks wallet (e.g., Hiro Wallet).

2. **Clone & Install**:
   ```
   git clone `git clone <repo-url>`
   cd ecoship-rewards
   npm install
   ```

3. **Local Development**:
   ```
   clarinet integrate  # Runs tests
   clarinet console    # Interact with contracts
   ```

4. **Deploy to Testnet**:
   ```
   npm run deploy:testnet
   ```
   - Update `Clarity.toml` with your deployer key.
   - Fund via faucet: https://explorer.hiro.so/faucet.

5. **Run Frontend**:
   ```
   npm run dev
   ```
   - Connect wallet at http://localhost:3000.

## Usage Example

1. **Register Shipment**: Shippers call `register-shipment` with details (e.g., bulk: true, weight: 100kg).
2. **Match & Ship**: Carriers bid via Marketplace; settle on match.
3. **Verify & Claim**: Submit eco-proof; Distributor auto-mints rewards post-verification.
4. **Govern**: Stake to vote on "Increase EV bonus by 5%".

## Roadmap

- **Q4 2025**: Testnet launch, integrate first oracle (carbon API).
- **Q1 2026**: Mainnet, partnerships with logistics firms (e.g., UPS pilots).
- **Q2 2026**: Mobile app, NFT badges for top eco-shippers.
- **Future**: Cross-chain bridges (e.g., to Ethereum for broader liquidity).

## Contributing

Fork the repo, create a feature branch, and submit a PR. Focus on security audits (e.g., via Sec3) and gas optimizations. See [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License. See [LICENSE](LICENSE) for more.