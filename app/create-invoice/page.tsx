"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { generateSolanaPayLink } from "@/src/lib/solana";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function CreateInvoice() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    clientName: "",
    clientWallet: "",
    receiverWallet: "",
    amount: "",
    dueDate: "",
    note: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const amountNum = parseFloat(formData.amount);
      const solanaPayLink = generateSolanaPayLink(
        formData.receiverWallet,
        amountNum,
        formData.note
      );

      await addDoc(collection(db, "invoices"), {
        ...formData,
        amount: amountNum,
        currency: "SOL",
        status: "unpaid",
        solanaPayLink,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      router.push("/dashboard");
    } catch (error) {
      console.error("Error creating invoice:", error);
      alert("Error creating invoice. Check console for details.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
        <ArrowLeft size={20} />
        Back to Dashboard
      </Link>

      <div className="solana-card">
        <h1 className="text-3xl font-bold mb-6 solana-gradient-text">Create Invoice</h1>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Client Name</label>
            <input
              type="text"
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-solana-purple outline-none"
              placeholder="Enter client name"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Client Wallet Address</label>
            <input
              type="text"
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-solana-purple outline-none"
              placeholder="Client's Solana wallet address"
              value={formData.clientWallet}
              onChange={(e) => setFormData({ ...formData, clientWallet: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Receiver Wallet Address (Yours)</label>
            <input
              type="text"
              required
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-solana-purple outline-none"
              placeholder="Your Solana wallet address"
              value={formData.receiverWallet}
              onChange={(e) => setFormData({ ...formData, receiverWallet: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Amount (SOL)</label>
              <input
                type="number"
                step="0.000000001"
                required
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-solana-purple outline-none"
                placeholder="0.0"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Due Date</label>
              <input
                type="date"
                required
                className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-solana-purple outline-none"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Note</label>
            <textarea
              className="w-full bg-black/50 border border-white/10 rounded-lg p-3 text-white focus:border-solana-purple outline-none h-24"
              placeholder="Invoice details or memo"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full btn-secondary mt-4 py-4 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Invoice"}
          </button>
        </form>
      </div>
    </div>
  );
}
