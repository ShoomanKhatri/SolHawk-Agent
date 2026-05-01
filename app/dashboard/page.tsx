"use client";

import { useEffect, useState } from "react";
import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Invoice } from "@/src/types/invoice";
import Link from "next/link";
import { Eye, RefreshCw, Send, Plus } from "lucide-react";

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    const q = query(collection(db, "invoices"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as Invoice[];
      setInvoices(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const checkPayment = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (data.status === "paid") {
        alert("Payment confirmed!");
      } else {
        alert(data.message || "No payment detected yet.");
      }
    } catch (error) {
      console.error(error);
      alert("Error checking payment.");
    }
    setProcessing(null);
  };

  const generateReminder = async (id: string) => {
    setProcessing(id);
    try {
      const res = await fetch("/api/generate-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (data.reminder) {
        alert("Reminder generated!");
      }
    } catch (error) {
      console.error(error);
      alert("Error generating reminder.");
    }
    setProcessing(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid": return "text-solana-green bg-solana-green/10";
      case "unpaid": return "text-solana-purple bg-solana-purple/10";
      default: return "text-gray-400 bg-gray-400/10";
    }
  };

  return (
    <div className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-12">
        <div>
          <h1 className="text-4xl font-bold solana-gradient-text">SolHawk Agent</h1>
          <p className="text-gray-400 mt-2">Manage your Solana invoices and AI reminders</p>
        </div>
        <Link href="/create-invoice" className="btn-secondary flex items-center gap-2">
          <Plus size={20} />
          Create Invoice
        </Link>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-20">Loading invoices...</div>
      ) : invoices.length === 0 ? (
        <div className="text-center solana-card py-20">
          <p className="text-gray-400">No invoices found. Create your first one!</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {invoices.map((invoice) => (
            <div key={invoice.id} className="solana-card flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-xl font-semibold text-white">{invoice.clientName}</h3>
                  <span className={`px-2 py-1 rounded text-xs font-medium uppercase ${getStatusColor(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>
                <div className="space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Amount:</span>
                    <span className="text-solana-green font-mono">{invoice.amount} SOL</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Due Date:</span>
                    <span>{new Date(invoice.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/10">
                <Link 
                  href={`/invoice/${invoice.id}`}
                  className="flex-1 btn-primary !bg-white/5 !text-white hover:!bg-white/10 flex items-center justify-center gap-2 text-sm"
                >
                  <Eye size={16} />
                  View
                </Link>
                <button 
                  onClick={() => checkPayment(invoice.id!)}
                  disabled={processing === invoice.id}
                  className="flex-1 btn-primary flex items-center justify-center gap-2 text-sm disabled:opacity-50"
                >
                  <RefreshCw size={16} className={processing === invoice.id ? "animate-spin" : ""} />
                  Check
                </button>
                <button 
                  onClick={() => generateReminder(invoice.id!)}
                  disabled={processing === invoice.id}
                  className="w-full btn-secondary flex items-center justify-center gap-2 text-sm disabled:opacity-50 mt-2"
                >
                  <Send size={16} />
                  Reminder
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
