// tests/reward-distributor.test.ts

import { describe, it, expect, beforeEach } from "vitest";
import { uintCV, principalCV } from "@stacks/transactions";

const ERR_NOT_AUTHORIZED = 100;
const ERR_INVALID_SHIPMENT = 101;
const ERR_ALREADY_CLAIMED = 102;
const ERR_INSUFFICIENT_POOL = 103;
const ERR_INVALID_RATE = 104;
const ERR_INVALID_CAP = 105;
const ERR_INVALID_MULTIPLIER = 106;
const ERR_INVALID_ECO_PROOF = 116;
const ERR_INVALID_WEIGHT = 118;
const ERR_INACTIVE = 114;
const ERR_INVALID_AMOUNT = 112;
const ERR_INVALID_DURATION = 113;
const ERR_BATCH_TOO_LARGE = 108;
const ERR_TRAIT_NOT_SET = 111;

interface Shipment {
  weight: number;
  bulk: boolean;
  timestamp: number;
}

interface EcoProof {
  isEco: boolean;
}

interface Result<T, E> {
  ok: boolean;
  value: T | E;
}

interface UserStats {
  totalClaimed: number;
  lastClaim: number;
}

interface DistributionHistory {
  amount: number;
  timestamp: number;
}

class MockTokenTrait {
  transfer(amount: number, from: string, to: string): Result<boolean, number> {
    return { ok: true, value: true };
  }
}

class MockRegistryTrait {
  shipments: Map<number, Shipment> = new Map();

  getShipment(id: number): Result<Shipment, number> {
    const shipment = this.shipments.get(id);
    return shipment ? { ok: true, value: shipment } : { ok: false, value: ERR_INVALID_SHIPMENT };
  }
}

class MockVerifierTrait {
  proofs: Map<number, EcoProof> = new Map();

  verifyEco(id: number): Result<EcoProof, number> {
    const proof = this.proofs.get(id);
    return proof ? { ok: true, value: proof } : { ok: false, value: ERR_INVALID_ECO_PROOF };
  }
}

class RewardDistributorMock {
  state: {
    admin: string;
    tokenAddress: string | null;
    registryAddress: string | null;
    verifierAddress: string | null;
    rewardPool: number;
    bulkBonusRate: number;
    ecoBonusRate: number;
    minWeight: number;
    maxRewardCap: number;
    timeMultiplier: number;
    active: boolean;
    totalDistributed: number;
    lastDistribution: number;
    minDuration: number;
    maxBatchSize: number;
    ecoThreshold: number;
    bulkFactor: number;
    bonusCap: number;
    decayRate: number;
    claimedShipments: Map<number, boolean>;
    pendingRewards: Map<string, number>;
    shipmentMultipliers: Map<number, number>;
    distributionHistory: Map<number, DistributionHistory>;
    userStats: Map<string, UserStats>;
    ecoLevels: Map<number, number>;
    bulkLevels: Map<number, number>;
  } = this.resetState();
  blockHeight: number = 0;
  caller: string = "ST1TEST";
  token: MockTokenTrait = new MockTokenTrait();
  registry: MockRegistryTrait = new MockRegistryTrait();
  verifier: MockVerifierTrait = new MockVerifierTrait();

  private resetState() {
    return {
      admin: "ST1TEST",
      tokenAddress: null,
      registryAddress: null,
      verifierAddress: null,
      rewardPool: 0,
      bulkBonusRate: 10,
      ecoBonusRate: 15,
      minWeight: 50,
      maxRewardCap: 1000000,
      timeMultiplier: 1,
      active: true,
      totalDistributed: 0,
      lastDistribution: 0,
      minDuration: 1,
      maxBatchSize: 50,
      ecoThreshold: 500,
      bulkFactor: 2,
      bonusCap: 50000,
      decayRate: 5,
      claimedShipments: new Map(),
      pendingRewards: new Map(),
      shipmentMultipliers: new Map(),
      distributionHistory: new Map(),
      userStats: new Map(),
      ecoLevels: new Map(),
      bulkLevels: new Map(),
    };
  }

  reset() {
    this.state = this.resetState();
    this.blockHeight = 0;
    this.caller = "ST1TEST";
    this.registry = new MockRegistryTrait();
    this.verifier = new MockVerifierTrait();
    this.token = new MockTokenTrait();
  }

  setAdmin(newAdmin: string): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (newAdmin === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.admin = newAdmin;
    return { ok: true, value: true };
  }

  setTokenAddress(address: string): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (address === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.tokenAddress = address;
    return { ok: true, value: true };
  }

  setRegistryAddress(address: string): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (address === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.registryAddress = address;
    return { ok: true, value: true };
  }

  setVerifierAddress(address: string): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (address === "SP000000000000000000002Q6VF78") return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.verifierAddress = address;
    return { ok: true, value: true };
  }

  fundPool(amount: number): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (!this.state.tokenAddress) return { ok: false, value: ERR_TRAIT_NOT_SET };
    if (amount <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    this.state.rewardPool += amount;
    return { ok: true, value: true };
  }

  setBulkBonusRate(rate: number): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (rate <= 0 || rate > 100) return { ok: false, value: ERR_INVALID_RATE };
    this.state.bulkBonusRate = rate;
    return { ok: true, value: true };
  }

  setEcoBonusRate(rate: number): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (rate <= 0 || rate > 100) return { ok: false, value: ERR_INVALID_RATE };
    this.state.ecoBonusRate = rate;
    return { ok: true, value: true };
  }

  setMinWeight(weight: number): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (weight < this.state.minWeight) return { ok: false, value: ERR_INVALID_WEIGHT };
    this.state.minWeight = weight;
    return { ok: true, value: true };
  }

  setMaxRewardCap(cap: number): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (cap <= 0) return { ok: false, value: ERR_INVALID_CAP };
    this.state.maxRewardCap = cap;
    return { ok: true, value: true };
  }

  setTimeMultiplier(multi: number): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    if (multi < 1) return { ok: false, value: ERR_INVALID_MULTIPLIER };
    this.state.timeMultiplier = multi;
    return { ok: true, value: true };
  }

  toggleActive(): Result<boolean, number> {
    if (this.caller !== this.state.admin) return { ok: false, value: ERR_NOT_AUTHORIZED };
    this.state.active = !this.state.active;
    return { ok: true, value: this.state.active };
  }

  private calculateReward(shipmentId: number): Result<number, number> {
    if (!this.state.registryAddress || !this.state.verifierAddress) return { ok: false, value: ERR_TRAIT_NOT_SET };
    const shipmentRes = this.registry.getShipment(shipmentId);
    if (!shipmentRes.ok) return { ok: false, value: shipmentRes.value as number };
    const shipment = shipmentRes.value;
    const proofRes = this.verifier.verifyEco(shipmentId);
    if (!proofRes.ok) return { ok: false, value: proofRes.value as number };
    const proof = proofRes.value;
    if (shipment.weight < this.state.minWeight) return { ok: false, value: ERR_INVALID_WEIGHT };
    const duration = this.blockHeight - shipment.timestamp;
    if (duration < this.state.minDuration) return { ok: false, value: ERR_INVALID_DURATION };
    let base = shipment.weight * this.state.timeMultiplier;
    let reward = base;
    if (shipment.bulk) reward += (reward * this.state.bulkBonusRate) / 100;
    if (proof.isEco) reward += (reward * this.state.ecoBonusRate) / 100;
    const decay = (reward * this.state.decayRate * (duration / 100)) / 100;
    reward = reward > decay ? reward - decay : 0;
    reward = reward > this.state.maxRewardCap ? this.state.maxRewardCap : reward;
    return { ok: true, value: reward };
  }

  claimRewards(shipmentId: number): Result<number, number> {
    if (!this.state.active) return { ok: false, value: ERR_INACTIVE };
    if (this.state.claimedShipments.get(shipmentId)) return { ok: false, value: ERR_ALREADY_CLAIMED };
    const rewardRes = this.calculateReward(shipmentId);
    if (!rewardRes.ok) return rewardRes;
    const reward = rewardRes.value;
    if (reward <= 0) return { ok: false, value: ERR_INVALID_AMOUNT };
    if (this.state.rewardPool < reward) return { ok: false, value: ERR_INSUFFICIENT_POOL };
    if (!this.state.tokenAddress) return { ok: false, value: ERR_TRAIT_NOT_SET };
    this.token.transfer(reward, "contract", this.caller);
    this.state.claimedShipments.set(shipmentId, true);
    this.state.rewardPool -= reward;
    this.state.totalDistributed += reward;
    this.state.lastDistribution = this.blockHeight;
    const pending = this.state.pendingRewards.get(this.caller) || 0;
    this.state.pendingRewards.set(this.caller, pending + reward);
    this.state.distributionHistory.set(this.state.totalDistributed, { amount: reward, timestamp: this.blockHeight });
    const stats = this.state.userStats.get(this.caller) || { totalClaimed: 0, lastClaim: 0 };
    this.state.userStats.set(this.caller, { totalClaimed: stats.totalClaimed + reward, lastClaim: this.blockHeight });
    return { ok: true, value: reward };
  }

  distributeBatch(shipmentIds: number[]): Result<number, number> {
    if (shipmentIds.length > this.state.maxBatchSize) return { ok: false, value: ERR_BATCH_TOO_LARGE };
    if (!this.state.active) return { ok: false, value: ERR_INACTIVE };
    let total = 0;
    for (const id of shipmentIds) {
      const res = this.calculateReward(id);
      if (!res.ok) return res;
      total += res.value;
    }
    if (this.state.rewardPool < total) return { ok: false, value: ERR_INSUFFICIENT_POOL };
    let sum = 0;
    for (const id of shipmentIds) {
      const res = this.claimRewards(id);
      if (!res.ok) return res;
      sum += res.value;
    }
    return { ok: true, value: sum };
  }
}

describe("RewardDistributor", () => {
  let contract: RewardDistributorMock;

  beforeEach(() => {
    contract = new RewardDistributorMock();
    contract.reset();
    contract.setTokenAddress("ST2TOKEN");
    contract.setRegistryAddress("ST3REGISTRY");
    contract.setVerifierAddress("ST4VERIFIER");
  });

  it("sets admin successfully", () => {
    const result = contract.setAdmin("ST2NEW");
    expect(result.ok).toBe(true);
    expect(contract.state.admin).toBe("ST2NEW");
  });

  it("rejects set admin by non-admin", () => {
    contract.caller = "ST3FAKE";
    const result = contract.setAdmin("ST4NEW");
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("funds pool successfully", () => {
    contract.fundPool(10000);
    const result = contract.fundPool(5000);
    expect(result.ok).toBe(true);
    expect(contract.state.rewardPool).toBe(15000);
  });

  it("rejects fund pool by non-admin", () => {
    contract.caller = "ST3FAKE";
    const result = contract.fundPool(5000);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_NOT_AUTHORIZED);
  });

  it("sets bulk bonus rate successfully", () => {
    const result = contract.setBulkBonusRate(20);
    expect(result.ok).toBe(true);
    expect(contract.state.bulkBonusRate).toBe(20);
  });

  it("rejects invalid bulk bonus rate", () => {
    const result = contract.setBulkBonusRate(101);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INVALID_RATE);
  });

  it("claims rewards successfully", () => {
    contract.fundPool(10000);
    contract.registry.shipments.set(1, { weight: 100, bulk: true, timestamp: 0 });
    contract.verifier.proofs.set(1, { isEco: true });
    contract.blockHeight = 10;
    const result = contract.claimRewards(1);
    expect(result.ok).toBe(true);
    expect(result.value).toBeGreaterThan(0);
    expect(contract.state.claimedShipments.get(1)).toBe(true);
    expect(contract.state.totalDistributed).toBe(result.value);
  });

  it("rejects claim for already claimed shipment", () => {
    contract.fundPool(10000);
    contract.registry.shipments.set(1, { weight: 100, bulk: true, timestamp: 0 });
    contract.verifier.proofs.set(1, { isEco: true });
    contract.blockHeight = 10;
    contract.claimRewards(1);
    const result = contract.claimRewards(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_ALREADY_CLAIMED);
  });

  it("distributes batch successfully", () => {
    contract.fundPool(20000);
    contract.registry.shipments.set(1, { weight: 100, bulk: true, timestamp: 0 });
    contract.verifier.proofs.set(1, { isEco: true });
    contract.registry.shipments.set(2, { weight: 200, bulk: false, timestamp: 0 });
    contract.verifier.proofs.set(2, { isEco: false });
    contract.blockHeight = 10;
    const result = contract.distributeBatch([1, 2]);
    expect(result.ok).toBe(true);
    expect(result.value).toBeGreaterThan(0);
    expect(contract.state.claimedShipments.get(1)).toBe(true);
    expect(contract.state.claimedShipments.get(2)).toBe(true);
  });

  it("rejects batch too large", () => {
    const ids = Array.from({ length: 51 }, (_, i) => i + 1);
    const result = contract.distributeBatch(ids);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_BATCH_TOO_LARGE);
  });

  it("toggles active successfully", () => {
    const result = contract.toggleActive();
    expect(result.ok).toBe(true);
    expect(result.value).toBe(false);
    expect(contract.state.active).toBe(false);
  });

  it("rejects claim when inactive", () => {
    contract.toggleActive();
    const result = contract.claimRewards(1);
    expect(result.ok).toBe(false);
    expect(result.value).toBe(ERR_INACTIVE);
  });
});