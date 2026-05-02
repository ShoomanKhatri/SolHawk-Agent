export interface Invoice {
  id?: string;
  clientName: string;
  clientWallet: string;
  receiverWallet: string;
  amount: number;
  currency: "SOL";
  status: "unpaid" | "paid" | "partial";
  dueDate: string;
  note: string;
  solanaPayLink: string;
  aiReminder?: string;
  userWallet: string;
  createdAt: any;
  updatedAt: any;
}
