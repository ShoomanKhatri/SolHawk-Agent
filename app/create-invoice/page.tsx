"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/src/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { generateSolanaPayLink } from "@/src/lib/solana";
import { ArrowLeft, Sparkles, Wallet, Calendar, FileText, RefreshCw } from "lucide-react";
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
    <div className="relative min-h-screen">
      <div className="bg-glow" />
      
      <div className="relative z-10 max-w-3xl mx-auto px-6 py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>

        <div className="solana-card p-10">
          <div className="flex items-center gap-3 mb-10">
            <div className="bg-solana-purple/20 p-3 rounded-2xl">
              <Sparkles className="text-solana-purple" size={28} />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white">Create New Invoice</h1>
              <p className="text-gray-400 mt-1">Fill in the details to generate a Solana Pay link.</p>
            </div>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Client Name</label>
                <div className="relative">
                  <FileText className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                  <input
                    type="text"
                    required
                    className="solana-input !pl-12"
                    placeholder="e.g. John Doe"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Amount (SOL)</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-solana-green font-bold">◎</span>
                  <input
                    type="number"
                    step="0.000000001"
                    required
                    className="solana-input !pl-10"
                    placeholder="0.00"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Client Wallet Address</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input
                  type="text"
                  required
                  className="solana-input !pl-12 font-mono text-sm"
                  placeholder="Solana wallet address"
                  value={formData.clientWallet}
                  onChange={(e) => setFormData({ ...formData, clientWallet: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Receiver Wallet (Your Address)</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-solana-purple/50" size={18} />
                <input
                  type="text"
                  required
                  className="solana-input !pl-12 font-mono text-sm border-solana-purple/20"
                  placeholder="Your Solana wallet address"
                  value={formData.receiverWallet}
                  onChange={(e) => setFormData({ ...formData, receiverWallet: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Due Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-600" size={18} />
                <input
                  type="date"
                  required
                  className="solana-input !pl-12 [color-scheme:dark]"
                  value={formData.dueDate}
                  onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-400 uppercase tracking-wider">Note / Memo</label>
              <textarea
                className="solana-input h-32 resize-none"
                placeholder="What is this invoice for?"
                value={formData.note}
                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-secondary py-5 text-base font-bold uppercase tracking-widest disabled:opacity-50"
            >
              {loading ? (
                <RefreshCw size={20} className="animate-spin" />
              ) : (
                "Generate & Save Invoice"
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
