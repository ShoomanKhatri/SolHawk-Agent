"use client";

import { useEffect, useState } from "react";
import { db } from "@/src/lib/firebase";
import { collection, query, onSnapshot, where } from "firebase/firestore";
import { Invoice } from "@/src/types/invoice";
import Link from "next/link";
import {
  Eye,
  RefreshCw,
  Send,
  Plus,
  Search,
  Filter,
  Wallet,
  Brain,
  Activity,
} from "lucide-react";
import { useWallet } from "@solana/wallet-adapter-react";
import { WalletConnectButton } from "@/src/components/WalletConnectButton";
import { evaluateAgentPolicy } from "@/src/lib/agentPolicy";

type ActivityEvent = {
  timestamp: string;
  action: string;
  reason: string;
  clientName: string;
  invoiceId?: string;
};

export default function Dashboard() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  const { publicKey, connected } = useWallet();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!connected || !publicKey) {
      setInvoices([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const q = query(
      collection(db, "invoices"),
      where("userWallet", "==", publicKey.toString()),
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })) as Invoice[];

        docs.sort((a, b) => {
          const dateA = a.createdAt?.seconds || 0;
          const dateB = b.createdAt?.seconds || 0;
          return dateB - dateA;
        });

        setInvoices(docs);
        setLoading(false);
      },
      (error) => {
        console.error("Snapshot error:", error);
        setLoading(false);
      },
    );

    return () => unsubscribe();
  }, [connected, publicKey]);

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
      case "paid":
        return "text-solana-green bg-solana-green/10 border border-solana-green/20";
      case "unpaid":
        return "text-solana-purple bg-solana-purple/10 border border-solana-purple/20";
      default:
        return "text-gray-400 bg-gray-400/10 border border-gray-400/20";
    }
  };

  const formatCount = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value))
      return "--";
    return value.toLocaleString("en-US");
  };

  const formatDays = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value))
      return "--";
    if (Number.isInteger(value)) return value.toLocaleString("en-US");
    return value.toFixed(1);
  };

  const formatPercent = (value?: number | null) => {
    if (value === null || value === undefined || Number.isNaN(value))
      return "--";
    const abs = Math.abs(value);
    if (abs > 0 && abs < 0.01) return "<0.01%";
    return `${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}%`;
  };

  const getLastReminderTone = (invoice: Invoice) => {
    const history = invoice.reminderHistory ?? [];
    if (history.length === 0) return "--";
    return history[history.length - 1]?.tone ?? "--";
  };

  const buildMetrics = (data: Invoice[]) => {
    const totalInvoices = data.length;
    const paidInvoices = data.filter((invoice) => invoice.status === "paid");
    const unpaidInvoices = data.filter(
      (invoice) => invoice.status === "unpaid",
    );
    const partialInvoices = data.filter(
      (invoice) => invoice.status === "partial",
    );

    const totalReminders = data.reduce(
      (sum, invoice) => sum + (invoice.reminderCount ?? 0),
      0,
    );

    const paidWithReminder = paidInvoices.filter(
      (invoice) => (invoice.reminderCount ?? 0) > 0,
    ).length;
    const invoicesWithReminder = data.filter(
      (invoice) => (invoice.reminderCount ?? 0) > 0,
    ).length;
    const reminderConversionRate =
      invoicesWithReminder > 0
        ? (paidWithReminder / invoicesWithReminder) * 100
        : null;

    const paidAfterFirst = paidInvoices.filter(
      (invoice) => (invoice.reminderCount ?? 0) === 1,
    ).length;
    const paidAfterSecond = paidInvoices.filter(
      (invoice) => (invoice.reminderCount ?? 0) >= 2,
    ).length;

    const daysToPayValues = paidInvoices
      .map((invoice) => invoice.daysToPay)
      .filter((value): value is number => typeof value === "number");
    const averageDaysToPay =
      daysToPayValues.length > 0
        ? daysToPayValues.reduce((sum, value) => sum + value, 0) /
          daysToPayValues.length
        : null;

    const agentStatusCounts = data.reduce<Record<string, number>>(
      (acc, invoice) => {
        const status =
          invoice.agentStatus ?? evaluateAgentPolicy(invoice).agentStatus;
        acc[status] = (acc[status] ?? 0) + 1;
        return acc;
      },
      {},
    );

    return {
      totalInvoices,
      paidInvoices: paidInvoices.length,
      unpaidInvoices: unpaidInvoices.length,
      partialInvoices: partialInvoices.length,
      totalReminders,
      averageDaysToPay,
      reminderConversionRate,
      paidAfterFirst,
      paidAfterSecond,
      agentStatusCounts,
    };
  };

  const buildActivityEvents = (data: Invoice[]) => {
    const decisionActions = new Set([
      "checked_payment",
      "marked_paid",
      "marked_partial",
    ]);

    const events: ActivityEvent[] = [];

    data.forEach((invoice) => {
      const decisions = invoice.decisionHistory ?? [];
      decisions.forEach((entry) => {
        if (!decisionActions.has(entry.action)) return;
        events.push({
          timestamp: entry.timestamp,
          action: entry.action,
          reason: entry.reason,
          clientName: invoice.clientName,
          invoiceId: invoice.id,
        });
      });

      const reminders = invoice.reminderHistory ?? [];
      reminders.forEach((entry) => {
        events.push({
          timestamp: entry.createdAt,
          action: `generated_${entry.tone}_reminder`,
          reason: entry.reason,
          clientName: invoice.clientName,
          invoiceId: invoice.id,
        });
      });
    });

    return events
      .filter((event) => Boolean(event.timestamp))
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      )
      .slice(0, 12);
  };

  const metrics = buildMetrics(invoices);
  const activityEvents = buildActivityEvents(invoices);

  if (!mounted) return null;

  return (
    <div className="relative min-h-screen">
      <div className="bg-glow" />

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-16">
          <div>
            <h1 className="text-5xl font-extrabold tracking-tight mb-2">
              <span className="solana-gradient-text">SolHawk</span>
              <span className="text-white ml-2">Agent</span>
            </h1>
            <p className="text-gray-400 text-lg max-w-xl">
              Professional AI-powered payment recovery and invoice management
              for the Solana ecosystem.
            </p>
          </div>

          <div className="flex flex-col md:items-end gap-4">
            <WalletConnectButton />
            {connected && (
              <Link href="/create-invoice" className="btn-secondary group">
                <Plus
                  size={20}
                  className="transition-transform group-hover:rotate-90"
                />
                <span>Create Invoice</span>
              </Link>
            )}
          </div>
        </header>

        {!connected ? (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="bg-solana-purple/10 w-24 h-24 rounded-full flex items-center justify-center mb-8 border border-solana-purple/20">
              <Wallet size={40} className="text-solana-purple" />
            </div>
            <h2 className="text-3xl font-bold text-white mb-4">
              Connect Your Wallet
            </h2>
            <p className="text-gray-400 mb-10 max-w-md">
              Please connect your Solana wallet to access your dashboard and
              manage your invoices.
            </p>
            <WalletConnectButton />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap gap-4 mb-10">
              <div className="flex-1 min-w-[300px] relative">
                <Search
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"
                  size={18}
                />
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

            <section className="solana-card p-8 mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    Agent Results
                  </h2>
                  <p className="text-sm text-gray-500 mt-1">
                    Recovery performance, conversion, and agent activity.
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  <Activity size={16} />
                  Live from Firestore
                </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Total Invoices
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatCount(metrics.totalInvoices)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Paid
                      </p>
                      <p className="text-xl font-mono tabular-nums text-solana-green mt-2">
                        {formatCount(metrics.paidInvoices)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Unpaid
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatCount(metrics.unpaidInvoices)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Partial
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatCount(metrics.partialInvoices)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Reminders Sent
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatCount(metrics.totalReminders)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Avg Days To Pay
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatDays(metrics.averageDaysToPay)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Reminder Conversion
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatPercent(metrics.reminderConversionRate)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Paid After 1st
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatCount(metrics.paidAfterFirst)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-xl p-4">
                      <p className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">
                        Paid After 2nd+
                      </p>
                      <p className="text-xl font-mono tabular-nums text-gray-200 mt-2">
                        {formatCount(metrics.paidAfterSecond)}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2 mt-6">
                    {Object.entries(metrics.agentStatusCounts).map(
                      ([status, count]) => (
                        <span
                          key={status}
                          className="text-[10px] uppercase tracking-wider border border-white/10 rounded-full px-3 py-1 text-gray-400"
                        >
                          {status}: {formatCount(count)}
                        </span>
                      ),
                    )}
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-bold text-white">
                      Agent Activity Log
                    </h3>
                    <span className="text-[10px] uppercase tracking-widest text-gray-500">
                      Recent
                    </span>
                  </div>
                  <div className="space-y-3 max-h-[360px] overflow-auto">
                    {activityEvents.length === 0 ? (
                      <p className="text-xs text-gray-500">
                        No recent agent activity.
                      </p>
                    ) : (
                      activityEvents.map((event) => (
                        <div
                          key={`${event.timestamp}-${event.action}-${event.clientName}`}
                          className="border border-white/10 rounded-lg p-3"
                        >
                          <p className="text-xs text-gray-500 font-mono tabular-nums">
                            {new Date(event.timestamp).toLocaleString()}
                          </p>
                          <p className="text-sm text-gray-200 font-medium mt-1">
                            {formatActivityLabel(event.action)}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            {event.clientName}
                          </p>
                          <p className="text-[11px] text-gray-400 mt-2">
                            {event.reason}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </section>
          </>
        )}

        {connected &&
          (loading ? (
            <div className="flex flex-col items-center justify-center py-32 space-y-4">
              <RefreshCw
                size={40}
                className="text-solana-purple animate-spin"
              />
              <p className="text-gray-500 font-medium">
                Fetching your invoices...
              </p>
            </div>
          ) : invoices.length === 0 ? (
            <div className="solana-card text-center py-32 border-dashed border-2 border-white/5 bg-transparent">
              <div className="bg-white/5 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Plus size={32} className="text-gray-600" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                No invoices yet
              </h2>
              <p className="text-gray-400 mb-8 max-w-sm mx-auto">
                Ready to get paid? Create your first professional invoice and
                let SolHawk handle the rest.
              </p>
              <Link href="/create-invoice" className="btn-primary">
                Create My First Invoice
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {invoices.map((invoice) => (
                <div
                  key={invoice.id}
                  className="solana-card flex flex-col group"
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-solana-green transition-colors">
                        {invoice.clientName}
                      </h3>
                      <p className="text-xs text-gray-500 font-mono mt-1 opacity-60">
                        {invoice.clientWallet.slice(0, 6)}...
                        {invoice.clientWallet.slice(-6)}
                      </p>
                    </div>
                    <span className={`badge ${getStatusBadge(invoice.status)}`}>
                      {invoice.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 mb-4">
                    {(() => {
                      const policy = evaluateAgentPolicy(invoice);
                      const agentStatus =
                        invoice.agentStatus ?? policy.agentStatus;
                      return (
                        <div
                          className={`flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md border ${
                            agentStatus === "urgent"
                              ? "text-red-500 border-red-500/20 bg-red-500/5"
                              : agentStatus === "needs_reminder" ||
                                  agentStatus === "partial"
                                ? "text-solana-purple border-solana-purple/20 bg-solana-purple/5"
                                : "text-solana-green border-solana-green/20 bg-solana-green/5"
                          }`}
                        >
                          <Brain size={12} />
                          Agent: {agentStatus}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="space-y-4 mb-8 bg-white/5 p-4 rounded-xl">
                    <div className="flex justify-between items-end">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Amount
                      </span>
                      <div className="text-right">
                        <span className="text-2xl font-black text-solana-green">
                          {invoice.amount}
                        </span>
                        <span className="text-sm font-bold text-solana-green/70 ml-1">
                          SOL
                        </span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center pt-2 border-t border-white/5">
                      <span className="text-xs text-gray-400 uppercase tracking-wider font-bold">
                        Due Date
                      </span>
                      <span className="text-sm text-gray-200">
                        {new Date(invoice.dueDate).toLocaleDateString(
                          undefined,
                          { month: "short", day: "numeric", year: "numeric" },
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-xs text-gray-400 mb-6">
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="uppercase tracking-wider text-[10px] font-bold">
                        Next Action
                      </p>
                      <p className="text-gray-200 font-medium mt-1">
                        {invoice.nextAction ??
                          evaluateAgentPolicy(invoice).nextAction}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="uppercase tracking-wider text-[10px] font-bold">
                        Reminders
                      </p>
                      <p className="text-gray-200 font-mono tabular-nums mt-1">
                        {formatCount(invoice.reminderCount)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="uppercase tracking-wider text-[10px] font-bold">
                        Last Tone
                      </p>
                      <p className="text-gray-200 font-medium mt-1">
                        {getLastReminderTone(invoice)}
                      </p>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <p className="uppercase tracking-wider text-[10px] font-bold">
                        Days To Pay
                      </p>
                      <p className="text-gray-200 font-mono tabular-nums mt-1">
                        {invoice.status === "paid"
                          ? formatCount(invoice.daysToPay)
                          : "--"}
                      </p>
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
                        <RefreshCw
                          size={14}
                          className={
                            processing === invoice.id ? "animate-spin" : ""
                          }
                        />
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
          ))}
      </div>
    </div>
  );
}

function formatActivityLabel(action: string) {
  if (action === "checked_payment") return "Checked payment";
  if (action === "marked_paid") return "Marked invoice paid";
  if (action === "marked_partial") return "Marked partial payment";
  if (action === "generated_friendly_reminder")
    return "Generated friendly reminder";
  if (action === "generated_firm_reminder") return "Generated firm reminder";
  if (action === "generated_urgent_reminder")
    return "Generated urgent reminder";
  if (action === "generated_partial_reminder")
    return "Requested remaining balance";
  return action.replace(/_/g, " ");
}
