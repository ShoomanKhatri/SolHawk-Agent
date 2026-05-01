"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { db } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { Invoice } from "@/src/types/invoice";
import { QRCodeSVG } from "qrcode.react";
import { ArrowLeft, CheckCircle, RefreshCw, Send, ExternalLink, Copy } from "lucide-react";
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

  if (loading) return <div className="text-center p-20">Loading...</div>;
  if (!invoice) return <div className="text-center p-20">Invoice not found.</div>;

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <Link href="/dashboard" className="flex items-center gap-2 text-gray-400 hover:text-white mb-8">
        <ArrowLeft size={20} />
        Back to Dashboard
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Invoice Info */}
        <div className="md:col-span-2 space-y-6">
          <div className="solana-card">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">{invoice.clientName}</h1>
                <p className="text-gray-400 font-mono text-xs">{invoice.clientWallet}</p>
              </div>
              <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                invoice.status === 'paid' ? 'text-solana-green bg-solana-green/10' : 'text-solana-purple bg-solana-purple/10'
              }`}>
                {invoice.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-8 mb-8">
              <div>
                <p className="text-sm text-gray-400 mb-1">Amount Due</p>
                <p className="text-2xl font-bold text-solana-green">{invoice.amount} SOL</p>
              </div>
              <div>
                <p className="text-sm text-gray-400 mb-1">Due Date</p>
                <p className="text-xl">{new Date(invoice.dueDate).toLocaleDateString()}</p>
              </div>
            </div>

            {invoice.note && (
              <div className="mb-8">
                <p className="text-sm text-gray-400 mb-1">Note</p>
                <p className="text-gray-200 bg-white/5 p-4 rounded-lg">{invoice.note}</p>
              </div>
            )}

            <div className="flex flex-wrap gap-4">
              <button onClick={checkPayment} disabled={processing} className="btn-primary flex items-center gap-2">
                <RefreshCw size={18} className={processing ? "animate-spin" : ""} />
                Check Payment
              </button>
              <button onClick={generateReminder} disabled={processing} className="btn-secondary flex items-center gap-2">
                <Send size={18} />
                Generate Reminder
              </button>
              {invoice.status !== 'paid' && (
                <button onClick={markPaidManually} disabled={processing} className="px-4 py-2 text-gray-400 hover:text-white transition-colors text-sm">
                  Mark Paid Manually
                </button>
              )}
            </div>
          </div>

          {/* AI Reminder Section */}
          {invoice.aiReminder && (
            <div className="solana-card border-solana-purple/30 bg-solana-purple/5">
              <h3 className="text-lg font-semibold text-solana-purple mb-3 flex items-center gap-2">
                <Send size={18} />
                AI Payment Reminder
              </h3>
              <p className="text-gray-300 italic whitespace-pre-wrap">{invoice.aiReminder}</p>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(invoice.aiReminder!);
                  alert("Copied to clipboard!");
                }}
                className="mt-4 flex items-center gap-2 text-sm text-solana-purple hover:underline"
              >
                <Copy size={14} />
                Copy to Clipboard
              </button>
            </div>
          )}
        </div>

        {/* Payment QR Code */}
        <div className="space-y-6">
          <div className="solana-card flex flex-col items-center">
            <h3 className="text-lg font-semibold mb-4">Solana Pay</h3>
            <div className="bg-white p-4 rounded-xl mb-4">
              <QRCodeSVG value={invoice.solanaPayLink} size={200} />
            </div>
            <p className="text-xs text-center text-gray-500 mb-6 px-4">
              Scan this QR code with a Solana wallet (Phantom, Solflare) to pay instantly.
            </p>
            <a 
              href={invoice.solanaPayLink} 
              className="w-full btn-primary !bg-white/10 !text-white hover:!bg-white/20 flex items-center justify-center gap-2 py-3"
            >
              <ExternalLink size={18} />
              Open in Wallet
            </a>
          </div>

          <div className="solana-card text-xs text-gray-500 space-y-2">
            <p className="font-semibold text-gray-400 uppercase tracking-wider">Receiver Address</p>
            <p className="font-mono break-all bg-black/30 p-2 rounded">{invoice.receiverWallet}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
