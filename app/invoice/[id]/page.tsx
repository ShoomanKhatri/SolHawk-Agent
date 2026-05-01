"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Invoice } from "@/src/types/invoice";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle, RefreshCw, Send, ExternalLink, Copy, Wallet, Calendar, AlertCircle, Sparkles } from "lucide-react";
import Link from "next/link";

export default function InvoiceDetail() {
  const { id } = useParams();
  const router = useRouter();
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    const fetchInvoice = async () => {
      const docRef = doc(db, "invoices", id as string);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setInvoice({ id: docSnap.id, ...docSnap.data() } as Invoice);
      }
      setLoading(false);
    };
    fetchInvoice();
  }, [id]);

  const checkPayment = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/check-payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (data.status === "paid") {
        alert("Payment confirmed!");
        router.refresh();
      } else {
        alert(data.message || "No payment detected yet.");
      }
    } catch (error) {
      console.error(error);
    }
    setProcessing(false);
  };

  const generateReminder = async () => {
    setProcessing(true);
    try {
      const res = await fetch("/api/generate-reminder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invoiceId: id }),
      });
      const data = await res.json();
      if (data.reminder) {
        alert("Reminder generated!");
        setInvoice(prev => prev ? { ...prev, aiReminder: data.reminder } : null);
      }
    } catch (error) {
      console.error(error);
    }
    setProcessing(false);
  };

  const markPaidManually = async () => {
    if (!confirm("Are you sure you want to mark this invoice as paid manually?")) return;
    setProcessing(true);
    try {
      const docRef = doc(db, "invoices", id as string);
      await updateDoc(docRef, {
        status: "paid",
        updatedAt: new Date().toISOString()
      });
      alert("Invoice marked as paid.");
      router.refresh();
    } catch (error) {
      console.error(error);
    }
    setProcessing(false);
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-4 bg-black">
      <RefreshCw size={40} className="text-solana-purple animate-spin" />
      <p className="text-gray-500">Loading invoice...</p>
    </div>
  );
  
  if (!invoice) return (
    <div className="flex flex-col items-center justify-center min-h-screen space-y-6 bg-black p-6 text-center">
      <AlertCircle size={60} className="text-red-500/50" />
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Invoice Not Found</h2>
        <p className="text-gray-400">This invoice may have been deleted or the link is invalid.</p>
      </div>
      <Link href="/dashboard" className="btn-primary">Return to Dashboard</Link>
    </div>
  );

  return (
    <div className="relative min-h-screen">
      <div className="bg-glow" />
      
      <div className="relative z-10 max-w-6xl mx-auto px-6 py-12">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-gray-500 hover:text-white transition-colors mb-12 group">
          <ArrowLeft size={20} className="transition-transform group-hover:-translate-x-1" />
          <span className="font-medium">Back to Dashboard</span>
        </Link>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            <div className="solana-card p-10">
              <div className="flex flex-col md:flex-row justify-between items-start gap-6 mb-12">
                <div>
                  <h1 className="text-4xl font-black text-white mb-2">{invoice.clientName}</h1>
                  <div className="flex items-center gap-2 text-gray-500 bg-white/5 px-3 py-1.5 rounded-lg w-fit">
                    <Wallet size={14} />
                    <span className="font-mono text-xs">{invoice.clientWallet}</span>
                  </div>
                </div>
                <span className={`badge px-4 py-2 text-sm ${
                  invoice.status === 'paid' 
                  ? 'text-solana-green bg-solana-green/10 border border-solana-green/20' 
                  : 'text-solana-purple bg-solana-purple/10 border border-solana-purple/20'
                }`}>
                  {invoice.status}
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10 mb-12">
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Amount Due</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-black text-solana-green">{invoice.amount}</span>
                    <span className="text-xl font-bold text-solana-green/70">SOL</span>
                  </div>
                </div>
                <div className="bg-white/5 p-6 rounded-2xl border border-white/5">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Due Date</p>
                  <div className="flex items-center gap-3">
                    <Calendar className="text-solana-purple" size={24} />
                    <span className="text-2xl font-bold text-gray-200">
                      {new Date(invoice.dueDate).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                </div>
              </div>

              {invoice.note && (
                <div className="mb-12">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">Invoice Memo</p>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 text-gray-300 leading-relaxed">
                    {invoice.note}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-4 pt-8 border-t border-white/5">
                <button onClick={checkPayment} disabled={processing} className="btn-primary px-8">
                  <RefreshCw size={18} className={processing ? "animate-spin" : ""} />
                  Check Transaction
                </button>
                <button onClick={generateReminder} disabled={processing} className="btn-secondary px-8">
                  <Send size={18} />
                  AI Reminder
                </button>
                {invoice.status !== 'paid' && (
                  <button onClick={markPaidManually} disabled={processing} className="btn-ghost">
                    Mark Paid Manually
                  </button>
                )}
              </div>
            </div>

            {/* AI Reminder Display */}
            {invoice.aiReminder && (
              <div className="solana-card border-solana-purple/20 bg-solana-purple/5 p-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-8 opacity-5 transition-opacity group-hover:opacity-10 pointer-events-none">
                  <Send size={120} className="text-solana-purple" />
                </div>
                
                <h3 className="text-xl font-bold text-solana-purple mb-6 flex items-center gap-3">
                  <div className="bg-solana-purple/20 p-2 rounded-lg">
                    <Sparkles size={20} />
                  </div>
                  Generated AI Reminder
                </h3>
                
                <div className="bg-black/40 p-6 rounded-xl border border-white/5 text-gray-300 italic leading-relaxed whitespace-pre-wrap mb-6">
                  {invoice.aiReminder}
                </div>
                
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(invoice.aiReminder!);
                    alert("Copied to clipboard!");
                  }}
                  className="flex items-center gap-2 text-sm font-bold text-solana-purple hover:text-solana-green transition-colors"
                >
                  <Copy size={16} />
                  Copy to Clipboard
                </button>
              </div>
            )}
          </div>

          {/* Sidebar / QR Code */}
          <div className="space-y-8">
            <div className="solana-card p-8 flex flex-col items-center">
              <div className="bg-solana-green/10 text-solana-green px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest mb-8 border border-solana-green/20">
                Solana Pay
              </div>
              
              <div className="bg-white p-5 rounded-3xl mb-8 shadow-[0_0_50px_rgba(20,241,149,0.1)]">
                <QRCodeSVG value={invoice.solanaPayLink} size={220} level="H" />
              </div>
              
              <p className="text-sm text-center text-gray-500 mb-8 px-4 leading-relaxed">
                Scan with Phantom or Solflare to pay this invoice instantly on the Solana network.
              </p>
              
              <a 
                href={invoice.solanaPayLink} 
                className="w-full btn-ghost border-solana-green/30 text-solana-green hover:bg-solana-green/5 flex items-center justify-center gap-2 py-4"
              >
                <ExternalLink size={18} />
                Open Wallet App
              </a>
            </div>

            <div className="solana-card p-6">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Payout Wallet</p>
              <div className="bg-black/40 p-4 rounded-xl border border-white/5">
                <p className="font-mono text-[10px] break-all text-gray-400 mb-2">RECEIVER ADDRESS</p>
                <p className="font-mono text-xs text-solana-green break-all leading-relaxed">
                  {invoice.receiverWallet}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
