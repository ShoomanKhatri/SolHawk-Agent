"use client";

import { useEffect, useState } from "react";
import { db } from "@/src/lib/firebase";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { Invoice } from "@/src/types/invoice";
import Link from "next/link";
import { Eye, RefreshCw, Send, Plus, Search, Filter } from "lucide-react";

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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid": return "text-solana-green bg-solana-green/10 border border-solana-green/20";
      case "unpaid": return "text-solana-purple bg-solana-purple/10 border border-solana-purple/20";
      default: return "text-gray-400 bg-gray-400/10 border border-gray-400/20";
    }
  };

  return (
    <div className="relative min-h-screen">
      <div className="bg-glow" />
      
      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Header Section */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight mb-2">
              <span className="solana-gradient-text">SolHawk</span>
              <span className="text-white ml-2">Agent</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl">
              Professional AI-powered payment recovery and invoice management for the Solana ecosystem.
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <Link href="/create-invoice" className="btn-secondary group">
              <Plus size={20} className="transition-transform group-hover:rotate-90" />
              <span>Create Invoice</span>
            </Link>
          </div>
        </header>

        {/* Stats / Filter Bar (Visual only for MVP) */}
        <div className="flex flex-wrap gap-4 mb-10">
          <div className="flex-1 min-w-[300px] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
            <input 
              type="text" 
              placeholder="Search invoices by client or wallet..." 
              className="solana-input !pl-12 bg-white/5"
            />
          </div>
          <button className="btn-ghost">
            <Filter size={18} />
            Filters
          </button>
        </div>

        {/* Main Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 space-y-4">
            <RefreshCw size={40} className="text-solana-purple animate-spin" />
            <p className="text-gray-500 font-medium">Fetching your invoices...</p>
          </div>
        ) : invoices.length === 0 ? (
          <div className="solana-card text-center py-32 border-dashed border-2 border-white/5 bg-transparent">
            <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
              <Plus size={32} className="text-gray-600" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">No invoices yet</h2>
            <p className="text-gray-400 mb-8 max-w-sm mx-auto">
              Ready to get paid? Create your first professional invoice and let SolHawk handle the rest.
            </p>
            <Link href="/create-invoice" className="btn-primary">
              Create My First Invoice
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {invoices.map((invoice) => (
              <div key={invoice.id} className="solana-card flex flex-col group">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <h3 className="text-xl font-bold text-white group-hover:text-solana-green transition-colors">
                      {invoice.clientName}
                    </h3>
                    <p className="text-xs text-gray-500 font-mono mt-1 opacity-60">
                      {invoice.clientWallet.slice(0, 6)}...{invoice.clientWallet.slice(-6)}
                    </p>
                  </div>
                  <span className={`badge ${getStatusBadge(invoice.status)}`}>
                    {invoice.status}
                  </span>
                </div>

                <div className="space-y-4 mb-8 bg-white/5 p-4 rounded-xl">
                  <div className="flex justify-between items-end">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Amount</span>
                    <div className="text-right">
                      <span className="text-2xl font-black text-solana-green">{invoice.amount}</span>
                      <span className="text-sm font-bold text-solana-green/70 ml-1">SOL</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">Due Date</span>
                    <span className="text-sm text-gray-200">{new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-3 mt-auto">
                  <div className="flex gap-3">
                    <Link 
                      href={`/invoice/${invoice.id}`}
                      className="flex-1 btn-ghost !py-2.5 text-xs"
                    >
                      <Eye size={14} />
                      View Details
                    </Link>
                    <button 
                      onClick={() => checkPayment(invoice.id!)}
                      disabled={processing === invoice.id}
                      className="flex-1 btn-primary !py-2.5 text-xs disabled:opacity-50"
                    >
                      <RefreshCw size={14} className={processing === invoice.id ? "animate-spin" : ""} />
                      Check
                    </button>
                  </div>
                  <button 
                    onClick={() => generateReminder(invoice.id!)}
                    disabled={processing === invoice.id}
                    className="btn-secondary !py-2.5 text-xs w-full disabled:opacity-50"
                  >
                    <Send size={14} />
                    AI Reminder
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
