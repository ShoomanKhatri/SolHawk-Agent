import { Invoice } from "../types/invoice";

export type AgentStatus = "monitoring" | "needs_reminder" | "urgent" | "paid";

export interface AnalysisResult {
  status: AgentStatus;
  reason: string;
  nextAction: string;
  confidence: number;
}

/**
 * Analyzes an invoice to determine its current state and recommended actions.
 */
export function analyzeInvoice(invoice: Invoice): AnalysisResult {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const diffTime = now.getTime() - dueDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (invoice.status === "paid") {
    return {
      status: "paid",
      reason: "Invoice is fully paid.",
      nextAction: "none",
      confidence: 100,
    };
  }

  if (invoice.status === "partial") {
    return {
      status: "needs_reminder",
      reason: "Invoice is only partially paid.",
      nextAction: "send_reminder",
      confidence: 90,
    };
  }

  if (diffDays > 2) {
    return {
      status: "urgent",
      reason: `Invoice is overdue by ${diffDays} days.`,
      nextAction: "send_strong_reminder",
      confidence: 95,
    };
  }

  if (now > dueDate) {
    return {
      status: "needs_reminder",
      reason: "Invoice is overdue.",
      nextAction: "send_reminder",
      confidence: 85,
    };
  }

  return {
    status: "monitoring",
    reason: "Invoice is not yet due.",
    nextAction: "monitor",
    confidence: 100,
  };
}

/**
 * Verifies a payment against an invoice and a list of transactions.
 * Matches receiver wallet, approximate amount, and time window.
 */
export function verifyPayment(invoice: Invoice, transactions: any[]) {
  const windowStart = new Date();
  windowStart.setHours(windowStart.getHours() - 24); // Last 24 hours

  const matchedTx = transactions.find((tx) => {
    const isReceiverMatch = tx.destination === invoice.receiverWallet;
    const isAmountMatch = Math.abs(tx.amount - invoice.amount) < 0.001;
    const txDate = new Date(tx.timestamp);
    const isTimeMatch = txDate >= windowStart;

    return isReceiverMatch && isAmountMatch && isTimeMatch;
  });

  if (matchedTx) {
    return {
      matched: true,
      confidence: 0.98,
      reason: "Transaction found matching wallet, amount, and timeframe.",
    };
  }

  return {
    matched: false,
    confidence: 0,
    reason: "No matching transactions found in the last 24 hours.",
  };
}

export const AGENT_PROMPT = `
You are SolHawk Agent, an AI financial assistant helping freelancers recover payments.

Analyze the situation and write a short, polite reminder.

Be context-aware:
- If slightly late → friendly tone
- If very late → firm tone

Return plain text only.
`;
