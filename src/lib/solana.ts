import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

/**
 * Generates a Solana Pay URL.
 * Format: solana:<receiverWallet>?amount=<amount>&label=<label>&message=<message>
 */
export function generateSolanaPayLink(
  receiverWallet: string,
  amount: number,
  note: string,
  reference?: string,
) {
  const label = "SolHawk Invoice";
  const message = encodeURIComponent(note);
  const referenceParam = reference
    ? `&reference=${encodeURIComponent(reference)}`
    : "";
  return `solana:${receiverWallet}?amount=${amount}&label=${encodeURIComponent(label)}&message=${message}${referenceParam}`;
}

/**
 * Checks for recent confirmed transactions to a receiver wallet for a specific amount.
 * Note: In a production environment, you should use reference keys or memo fields for precise matching.
 * This implementation is a simple MVP version that checks recent signatures.
 */
export async function checkSolanaPayment(
  receiverWallet: string,
  expectedAmount: number,
  reference?: string,
) {
  try {
    if (reference) {
      return checkSolanaPaymentByReference(
        receiverWallet,
        expectedAmount,
        reference,
      );
    }

    return checkSolanaPaymentByDestination(receiverWallet, expectedAmount);
  } catch (error) {
    console.error("Error checking Solana payment:", error);
    throw error;
  }
}

async function checkSolanaPaymentByReference(
  receiverWallet: string,
  expectedAmount: number,
  reference: string,
) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const referenceKey = new PublicKey(reference);
  const signatures = await connection.getSignaturesForAddress(referenceKey, {
    limit: 20,
  });

  let matchedAmount: number | null = null;
  let matchedSignature: string | null = null;
  let matchedSlot: number | null = null;

  for (const sigInfo of signatures) {
    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) continue;

    const accountKeys = tx.transaction.message.accountKeys;
    const referenceFound = accountKeys.some((key: any) => {
      if (typeof key === "string") return key === reference;
      if ("pubkey" in key) return key.pubkey.toBase58() === reference;
      return key.toBase58() === reference;
    });

    if (!referenceFound) continue;

    const instructions = tx.transaction.message.instructions;
    for (const inst of instructions) {
      if (
        "parsed" in inst &&
        inst.program === "system" &&
        inst.parsed.type === "transfer"
      ) {
        const { destination, lamports } = inst.parsed.info;
        const solAmount = lamports / 1e9;

        if (destination === receiverWallet) {
          if (matchedAmount === null || solAmount > matchedAmount) {
            matchedAmount = solAmount;
            matchedSignature = sigInfo.signature;
            matchedSlot = tx.slot;
          }
        }
      }
    }
  }

  if (matchedAmount !== null && matchedSignature && matchedSlot !== null) {
    const matchType = getMatchType(matchedAmount, expectedAmount);
    return {
      found: true,
      signature: matchedSignature,
      slot: matchedSlot,
      amount: matchedAmount,
      matchType,
      confidence: matchType === "exact" ? 0.99 : 0.9,
      reason:
        matchType === "exact"
          ? "Transaction found with matching reference, destination, and amount."
          : "Transaction found with matching reference and destination.",
    };
  }

  return {
    found: false,
    confidence: 0,
    reason: "No transactions found with the matching reference.",
  };
}

async function checkSolanaPaymentByDestination(
  receiverWallet: string,
  expectedAmount: number,
) {
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
  const pubkey = new PublicKey(receiverWallet);
  const signatures = await connection.getSignaturesForAddress(pubkey, {
    limit: 10,
  });

  const now = Math.floor(Date.now() / 1000);
  const twentyFourHoursAgo = now - 24 * 60 * 60;

  for (const sigInfo of signatures) {
    if (sigInfo.blockTime && sigInfo.blockTime < twentyFourHoursAgo) {
      continue;
    }

    const tx = await connection.getParsedTransaction(sigInfo.signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx) continue;

    const instructions = tx.transaction.message.instructions;
    for (const inst of instructions) {
      if (
        "parsed" in inst &&
        inst.program === "system" &&
        inst.parsed.type === "transfer"
      ) {
        const { destination, lamports } = inst.parsed.info;
        const solAmount = lamports / 1e9;

        if (
          destination === receiverWallet &&
          Math.abs(solAmount - expectedAmount) < 0.001
        ) {
          return {
            found: true,
            signature: sigInfo.signature,
            slot: tx.slot,
            amount: solAmount,
            matchType: "exact",
            confidence: 0.98,
            reason: "Transaction found matching wallet, amount, and timeframe.",
          };
        }
      }
    }
  }

  return {
    found: false,
    confidence: 0,
    reason: "No matching transactions found in the last 24 hours.",
  };
}

function getMatchType(amount: number, expectedAmount: number) {
  if (Math.abs(amount - expectedAmount) < 0.001) return "exact";
  if (amount > expectedAmount) return "overpaid";
  return "partial";
}
