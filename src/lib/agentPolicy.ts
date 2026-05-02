import { DecisionEntry, Invoice, ReminderEntry } from "../types/invoice";

export type AgentStatus =
  | "monitoring"
  | "needs_reminder"
  | "urgent"
  | "paid"
  | "partial";

export type AgentAction =
  | "wait"
  | "send_friendly_reminder"
  | "send_firm_reminder"
  | "send_urgent_reminder"
  | "request_remaining_balance"
  | "stop";

export type ReminderTone = "friendly" | "firm" | "urgent" | "partial";

export interface PolicyResult {
  agentStatus: AgentStatus;
  nextAction: AgentAction;
  reminderTone: ReminderTone;
  reason: string;
}

export function evaluateAgentPolicy(invoice: Invoice): PolicyResult {
  const now = new Date();
  const dueDate = new Date(invoice.dueDate);
  const overdueDays = Math.floor(
    (now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (invoice.status === "paid") {
    return {
      agentStatus: "paid",
      nextAction: "stop",
      reminderTone: "friendly",
      reason: "Invoice is paid.",
    };
  }

  if (invoice.status === "partial") {
    const remainingAmount =
      typeof invoice.remainingAmount === "number"
        ? invoice.remainingAmount
        : invoice.amount;
    return avoidRepeatActions(invoice, {
      agentStatus: "partial",
      nextAction: "request_remaining_balance",
      reminderTone: "partial",
      reason: `Partial payment received. Remaining balance: ${remainingAmount} ${invoice.currency}.`,
    });
  }

  if (now <= dueDate) {
    return avoidRepeatActions(invoice, {
      agentStatus: "monitoring",
      nextAction: "wait",
      reminderTone: "friendly",
      reason: "Invoice is not due yet.",
    });
  }

  if (overdueDays >= 7) {
    return avoidRepeatActions(invoice, {
      agentStatus: "urgent",
      nextAction: "send_urgent_reminder",
      reminderTone: "urgent",
      reason: `Invoice is ${overdueDays} days overdue.`,
    });
  }

  if (overdueDays >= 3) {
    return avoidRepeatActions(invoice, {
      agentStatus: "urgent",
      nextAction: "send_firm_reminder",
      reminderTone: "firm",
      reason: `Invoice is ${overdueDays} days overdue.`,
    });
  }

  return avoidRepeatActions(invoice, {
    agentStatus: "needs_reminder",
    nextAction: "send_friendly_reminder",
    reminderTone: "friendly",
    reason: "Invoice is overdue by 1-2 days.",
  });
}

function avoidRepeatActions(
  invoice: Invoice,
  result: PolicyResult,
): PolicyResult {
  const lastAction = getLastDecisionAction(invoice.decisionHistory);
  const lastTone = getLastReminderTone(
    invoice.reminderHistory,
    invoice.decisionHistory,
  );

  if (result.nextAction !== "wait" && result.nextAction !== "stop") {
    if (lastAction && lastAction === result.nextAction) {
      return {
        ...result,
        nextAction: "wait",
        reason: `${result.reason} Skipping repeated action.`,
      };
    }

    if (lastTone && lastTone === result.reminderTone) {
      const escalated = escalateTone(result.reminderTone);
      if (escalated) {
        return {
          ...result,
          reminderTone: escalated.tone,
          nextAction: escalated.action,
          reason: `${result.reason} Escalated tone to avoid repetition.`,
        };
      }

      return {
        ...result,
        nextAction: "wait",
        reason: `${result.reason} Avoiding repeated reminder tone.`,
      };
    }
  }

  return result;
}

function getLastDecisionAction(history?: DecisionEntry[]) {
  if (!history || history.length === 0) return null;
  return history[history.length - 1]?.action ?? null;
}

function getLastReminderTone(
  reminderHistory?: ReminderEntry[],
  decisionHistory?: DecisionEntry[],
): ReminderTone | null {
  if (reminderHistory && reminderHistory.length > 0) {
    return reminderHistory[reminderHistory.length - 1]?.tone ?? null;
  }

  if (!decisionHistory || decisionHistory.length === 0) return null;
  const lastReminder = [...decisionHistory]
    .reverse()
    .find(
      (entry) =>
        entry.action.startsWith("send_") ||
        entry.action === "request_remaining_balance",
    );

  if (!lastReminder) return null;

  if (lastReminder.action === "request_remaining_balance") return "partial";
  if (lastReminder.action === "send_urgent_reminder") return "urgent";
  if (lastReminder.action === "send_firm_reminder") return "firm";
  if (lastReminder.action === "send_friendly_reminder") return "friendly";

  return null;
}

function escalateTone(tone: ReminderTone) {
  if (tone === "friendly") {
    return {
      tone: "firm" as ReminderTone,
      action: "send_firm_reminder" as AgentAction,
    };
  }
  if (tone === "firm") {
    return {
      tone: "urgent" as ReminderTone,
      action: "send_urgent_reminder" as AgentAction,
    };
  }
  return null;
}
