"use client";

import {
  Contract,
  Networks,
  TransactionBuilder,
  Keypair,
  xdr,
  Address,
  nativeToScVal,
  scValToNative,
  rpc,
} from "@stellar/stellar-sdk";
import {
  isConnected,
  getAddress,
  signTransaction,
  setAllowed,
  isAllowed,
  requestAccess,
} from "@stellar/freighter-api";

// ============================================================
// CONSTANTS — Update these for your contract
// ============================================================

/** Your deployed Soroban contract ID */
export const CONTRACT_ADDRESS =
  "CDCAILYWRURJ6WEASE2HQKIMHO3O7JLDMSFO6XO6TPTNUIMZUQ2NRZXD";

/** Network passphrase (testnet by default) */
export const NETWORK_PASSPHRASE = Networks.TESTNET;

/** Soroban RPC URL */
export const RPC_URL = "https://soroban-testnet.stellar.org";

/** Horizon URL */
export const HORIZON_URL = "https://horizon-testnet.stellar.org";

/** Network name for Freighter */
export const NETWORK = "TESTNET";

// ============================================================
// RPC Server Instance
// ============================================================

const server = new rpc.Server(RPC_URL);

// ============================================================
// Wallet Helpers
// ============================================================

export async function checkConnection(): Promise<boolean> {
  const result = await isConnected();
  return result.isConnected;
}

export async function connectWallet(): Promise<string> {
  const connResult = await isConnected();
  if (!connResult.isConnected) {
    throw new Error("Freighter extension is not installed or not available.");
  }

  const allowedResult = await isAllowed();
  if (!allowedResult.isAllowed) {
    await setAllowed();
    await requestAccess();
  }

  const { address } = await getAddress();
  if (!address) {
    throw new Error("Could not retrieve wallet address from Freighter.");
  }
  return address;
}

export async function getWalletAddress(): Promise<string | null> {
  try {
    const connResult = await isConnected();
    if (!connResult.isConnected) return null;

    const allowedResult = await isAllowed();
    if (!allowedResult.isAllowed) return null;

    const { address } = await getAddress();
    return address || null;
  } catch {
    return null;
  }
}

// ============================================================
// Contract Interaction Helpers
// ============================================================

/**
 * Build, simulate, and optionally sign + submit a Soroban contract call.
 */
export async function callContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller: string,
  sign: boolean = true
) {
  const contract = new Contract(CONTRACT_ADDRESS);
  const account = await server.getAccount(caller);

  const tx = new TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(contract.call(method, ...params))
    .setTimeout(30)
    .build();

  const simulated = await server.simulateTransaction(tx);

  if (rpc.Api.isSimulationError(simulated)) {
    throw new Error(
      `Simulation failed: ${(simulated as rpc.Api.SimulateTransactionErrorResponse).error}`
    );
  }

  if (!sign) {
    return simulated;
  }

  const prepared = rpc.assembleTransaction(tx, simulated).build();

  const { signedTxXdr } = await signTransaction(prepared.toXDR(), {
    networkPassphrase: NETWORK_PASSPHRASE,
  });

  const txToSubmit = TransactionBuilder.fromXDR(
    signedTxXdr,
    NETWORK_PASSPHRASE
  );

  const result = await server.sendTransaction(txToSubmit);

  if (result.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${result.status}`);
  }

  let getResult = await server.getTransaction(result.hash);
  while (getResult.status === "NOT_FOUND") {
    await new Promise((resolve) => setTimeout(resolve, 1000));
    getResult = await server.getTransaction(result.hash);
  }

  if (getResult.status === "FAILED") {
    throw new Error("Transaction failed on chain.");
  }

  return getResult;
}

/**
 * Read-only contract call (does not require signing).
 */
export async function readContract(
  method: string,
  params: xdr.ScVal[] = [],
  caller?: string
) {
  const account =
    caller || Keypair.random().publicKey();
  const sim = await callContract(method, params, account, false);
  if (
    rpc.Api.isSimulationSuccess(sim as rpc.Api.SimulateTransactionResponse) &&
    (sim as rpc.Api.SimulateTransactionSuccessResponse).result
  ) {
    return scValToNative(
      (sim as rpc.Api.SimulateTransactionSuccessResponse).result!.retval
    );
  }
  return null;
}

// ============================================================
// ScVal Conversion Helpers
// ============================================================

export function toScValString(value: string): xdr.ScVal {
  return nativeToScVal(value, { type: "string" });
}

export function toScValU64(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "u64" });
}

export function toScValI128(value: bigint): xdr.ScVal {
  return nativeToScVal(value, { type: "i128" });
}

export function toScValAddress(address: string): xdr.ScVal {
  return new Address(address).toScVal();
}

// ============================================================
// Charity Donation Tracker — Contract Methods
// ============================================================

/**
 * Create a new charity campaign.
 * Calls: create(name: String, description: String, target: i128) -> u64
 */
export async function createCampaign(
  caller: string,
  name: string,
  description: string,
  target: bigint
) {
  return callContract(
    "create",
    [toScValString(name), toScValString(description), toScValI128(target)],
    caller,
    true
  );
}

/**
 * Donate to a campaign.
 * Calls: donate(id: u64, donor: Address, amount: i128)
 */
export async function donate(
  caller: string,
  campaignId: bigint,
  amount: bigint
) {
  return callContract(
    "donate",
    [toScValU64(campaignId), toScValAddress(caller), toScValI128(amount)],
    caller,
    true
  );
}

/**
 * Get campaign details (read-only).
 * Calls: get(id: u64) -> Option<Campaign>
 */
export async function getCampaign(
  campaignId: number,
  caller?: string
) {
  return readContract(
    "get",
    [toScValU64(BigInt(campaignId))],
    caller
  );
}

/**
 * Get total number of campaigns (read-only).
 * Calls: count() -> u64
 */
export async function getCampaignCount(caller?: string) {
  return readContract("count", [], caller);
}

/**
 * Get all campaigns (read-only).
 * Calls: get_all() -> Vec<Campaign>
 */
export async function getAllCampaigns(caller?: string) {
  return readContract("get_all", [], caller);
}

/**
 * Get donations for a campaign (read-only).
 * Calls: get_donations(id: u64) -> Vec<Donation>
 */
export async function getDonations(
  campaignId: number,
  caller?: string
) {
  return readContract(
    "get_donations",
    [toScValU64(BigInt(campaignId))],
    caller
  );
}

export { nativeToScVal, scValToNative, Address, xdr };
