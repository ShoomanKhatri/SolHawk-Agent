export type FirestoreTimestamp = {
  seconds: number;
  nanoseconds?: number;
};

export interface Invoice {
  id?: string;
  clientName: string;
  clientWallet: string;
  receiverWallet: string;
  amount: number;
  amountPaid?: number;
  remainingAmount?: number;
  currency: "SOL";
  status: "unpaid" | "paid" | "partial";
  dueDate: string;
  note: string;
  reference?: string;
  solanaPayLink: string;
  aiReminder?: string;
  agentStatus?: "monitoring" | "needs_reminder" | "urgent" | "paid" | "partial";
  lastCheckedAt?: string;
  nextAction?: string;
  decisionHistory?: DecisionEntry[];
  reminderCount?: number;
  firstReminderAt?: string;
  lastReminderAt?: string;
  paidAt?: string;
  daysToPay?: number;
  reminderHistory?: ReminderEntry[];
  userWallet: string;
  createdAt: FirestoreTimestamp | string | number | null;
  updatedAt: FirestoreTimestamp | string | number | null;
}

export interface DecisionEntry {
  timestamp: string;
  status: "monitoring" | "needs_reminder" | "urgent" | "paid" | "partial";
  reason: string;
  action: string;
}

export interface ReminderEntry {
  tone: "friendly" | "firm" | "urgent" | "partial";
  message: string;
  createdAt: string;
  action: string;
  reason: string;
}
