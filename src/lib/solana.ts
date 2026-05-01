import { Connection, PublicKey, clusterApiUrl } from "@solana/web3.js";

/**
 * Generates a Solana Pay URL.
 * Format: solana:<receiverWallet>?amount=<amount>&label=<label>&message=<message>
 */
export function generateSolanaPayLink(receiverWallet: string, amount: number, note: string) {
  const label = "SolHawk Invoice";
  const message = encodeURIComponent(note);
  return `solana:${receiverWallet}?amount=${amount}&label=${encodeURIComponent(label)}&message=${message}`;
}

/**
 * Checks for recent confirmed transactions to a receiver wallet for a specific amount.
 * Note: In a production environment, you should use reference keys or memo fields for precise matching.
 * This implementation is a simple MVP version that checks recent signatures.
 */
export async function checkSolanaPayment(receiverWallet: string, expectedAmount: number) {
  try {
    const connection = new Connection(clusterApiUrl("devnet"), "confirmed");
    const pubkey = new PublicKey(receiverWallet);
    
    // Get recent signatures for the wallet
    const signatures = await connection.getSignaturesForAddress(pubkey, { limit: 10 });
    
    for (const sigInfo of signatures) {
      const tx = await connection.getParsedTransaction(sigInfo.signature, {
        maxSupportedTransactionVersion: 0,
      });

      if (!tx) continue;

      // Simple detection: check if any instruction involves a transfer of the expected amount to the receiver
      // This is simplified for MVP and might have false positives or miss complex transactions.
      const instructions = tx.transaction.message.instructions;
      
      for (const inst of instructions) {
        // Check for System Program transfers
        if ("parsed" in inst && inst.program === "system" && inst.parsed.type === "transfer") {
          const { destination, lamports } = inst.parsed.info;
          const solAmount = lamports / 1e9;
          
          if (destination === receiverWallet && Math.abs(solAmount - expectedAmount) < 0.000001) {
            return {
              found: true,
              signature: sigInfo.signature,
              slot: tx.slot,
            };
          }
        }
      }
    }
    
    return { found: false };
  } catch (error) {
    console.error("Error checking Solana payment:", error);
    throw error;
  }
}
