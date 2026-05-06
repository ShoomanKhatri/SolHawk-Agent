import { NextResponse } from "next/server";
import { evaluateAgentPolicy } from "@/src/lib/agentPolicy";
import { checkSolanaPayment } from "@/src/lib/solana";
import { generatePaymentReminder } from "@/src/lib/gemini";
import { DecisionEntry, Invoice, ReminderEntry } from "@/src/types/invoice";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

type FirestoreDocument = {
  name: string;
  fields?: Record<string, FirestoreValue>;
};

type FirestoreRunQueryRow = {
  document?: FirestoreDocument;
};

export async function POST() {
  // Scheduled agent runner: configure a cron (e.g. Vercel) to call this endpoint daily.
  try {
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

    if (!projectId || !apiKey) {
      return NextResponse.json(
        { error: "Firestore env vars are missing" },
        { status: 500 },
      );
    }

    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)`;

    const unpaid = await fetchInvoicesByStatus(baseUrl, apiKey, "unpaid");
    const partial = await fetchInvoicesByStatus(baseUrl, apiKey, "partial");

    const invoices = dedupeInvoices([...unpaid, ...partial]);
    const nowIso = new Date().toISOString();

    let updated = 0;
    let reminders = 0;
    let paid = 0;

    for (const invoice of invoices) {
      if (!invoice.id) {
        continue;
      }

      const paymentResult = await checkSolanaPayment(
        invoice.receiverWallet,
        Number(invoice.amount),
        invoice.reference,
      );

      let status = invoice.status;
      let amountPaid = invoice.amountPaid ?? 0;
      let remainingAmount =
        typeof invoice.remainingAmount === "number"
          ? invoice.remainingAmount
          : invoice.amount;

      if (paymentResult.found) {
        const paidAmount =
          typeof paymentResult.amount === "number"
            ? paymentResult.amount
            : invoice.amount;
        amountPaid = paidAmount;
        remainingAmount = Math.max(invoice.amount - paidAmount, 0);
        status = remainingAmount > 0.001 ? "partial" : "paid";
      }

      const policy = evaluateAgentPolicy({
        ...invoice,
        status,
        amountPaid,
        remainingAmount,
      });

      const decisionEntries: DecisionEntry[] = [
        {
          timestamp: nowIso,
          status: policy.agentStatus,
          reason: paymentResult.reason ?? "Payment check executed.",
          action: "checked_payment",
        },
      ];

      if (paymentResult.found) {
        decisionEntries.push({
          timestamp: nowIso,
          status: policy.agentStatus,
          reason:
            status === "partial"
              ? "Partial payment detected."
              : "Payment confirmed.",
          action: status === "partial" ? "marked_partial" : "marked_paid",
        });
      }

      decisionEntries.push({
        timestamp: nowIso,
        status: policy.agentStatus,
        reason: policy.reason,
        action: policy.nextAction,
      });

      const agentStatus = policy.agentStatus;
      const nextAction = policy.nextAction;
      let aiReminder = invoice.aiReminder;
      let reminderEntry: ReminderEntry | null = null;
      let paidAt = invoice.paidAt;
      let daysToPay = invoice.daysToPay;

      if (status === "paid") {
        paidAt = paidAt ?? nowIso;
        const computedDays = calculateDaysToPay(invoice.createdAt, paidAt);
        if (daysToPay === undefined && computedDays !== null) {
          daysToPay = computedDays;
        }
        paid += 1;
      } else if (isReminderAction(nextAction)) {
        aiReminder = await generatePaymentReminder(
          { ...invoice, status, amountPaid, remainingAmount },
          {
            reminderTone: policy.reminderTone,
            decisionSummary: summarizeDecisionHistory(invoice.decisionHistory),
            previousTone: getLastReminderTone(invoice.reminderHistory),
          },
        );
        reminderEntry = {
          tone: policy.reminderTone,
          message: aiReminder,
          createdAt: nowIso,
          action: policy.nextAction,
          reason: policy.reason,
        };
        reminders += 1;
      }

      const decisionHistory = Array.isArray(invoice.decisionHistory)
        ? [...invoice.decisionHistory, ...decisionEntries]
        : decisionEntries;

      const reminderHistory = reminderEntry
        ? [...(invoice.reminderHistory ?? []), reminderEntry]
        : (invoice.reminderHistory ?? []);

      const reminderCount = reminderEntry
        ? (invoice.reminderCount ?? 0) + 1
        : (invoice.reminderCount ?? 0);
      const firstReminderAt = reminderEntry
        ? (invoice.firstReminderAt ?? nowIso)
        : invoice.firstReminderAt;
      const lastReminderAt = reminderEntry ? nowIso : invoice.lastReminderAt;

      const updatePayload: Record<string, unknown> = {
        agentStatus,
        nextAction,
        lastCheckedAt: nowIso,
        decisionHistory,
        reminderHistory,
        reminderCount,
        amountPaid,
        remainingAmount,
        updatedAt: nowIso,
      };

      if (firstReminderAt !== undefined) {
        updatePayload.firstReminderAt = firstReminderAt;
      }
      if (lastReminderAt !== undefined) {
        updatePayload.lastReminderAt = lastReminderAt;
      }

      if (status === "paid") {
        updatePayload.paidAt = paidAt;
        updatePayload.daysToPay = daysToPay;
      }

      if (status !== invoice.status) {
        updatePayload.status = status;
      }

      if (aiReminder && aiReminder !== invoice.aiReminder) {
        updatePayload.aiReminder = aiReminder;
      }

      await patchInvoice(baseUrl, apiKey, invoice.id, updatePayload);
      updated += 1;
    }

    return NextResponse.json({
      processed: invoices.length,
      updated,
      reminders,
      paid,
    });
  } catch (error: unknown) {
    console.error("Agent runner error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

function isReminderAction(action: string) {
  return (
    action === "send_friendly_reminder" ||
    action === "send_firm_reminder" ||
    action === "send_urgent_reminder" ||
    action === "request_remaining_balance"
  );
}

function summarizeDecisionHistory(history?: DecisionEntry[]) {
  if (!history || history.length === 0) return "None";
  return history
    .slice(-3)
    .map(
      (entry) =>
        `${entry.timestamp}: ${entry.status} -> ${entry.action} (${entry.reason})`,
    )
    .join("\n");
}

function getLastReminderTone(history?: ReminderEntry[]) {
  if (!history || history.length === 0) return null;
  return history[history.length - 1]?.tone ?? null;
}

function calculateDaysToPay(createdAt: unknown, paidAt: string) {
  const createdDate = parseInvoiceDate(createdAt);
  if (!createdDate) return null;
  const paidDate = new Date(paidAt);
  const diffMs = paidDate.getTime() - createdDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function parseInvoiceDate(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (
    typeof value === "object" &&
    value !== null &&
    "seconds" in value &&
    typeof (value as { seconds?: unknown }).seconds === "number"
  ) {
    const seconds = (value as { seconds: number }).seconds;
    const date = new Date(seconds * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}

async function fetchInvoicesByStatus(
  baseUrl: string,
  apiKey: string,
  status: string,
) {
  const url = `${baseUrl}/documents:runQuery?key=${apiKey}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: "invoices" }],
        where: {
          fieldFilter: {
            field: { fieldPath: "status" },
            op: "EQUAL",
            value: { stringValue: status },
          },
        },
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Failed to query invoices (${status}): ${res.statusText}`);
  }

  const data = await res.json();
  const rows = Array.isArray(data) ? (data as FirestoreRunQueryRow[]) : [];
  const docs = rows
    .map((row) => row.document)
    .filter((doc): doc is FirestoreDocument => Boolean(doc))
    .map((doc) => firestoreDocToInvoice(doc));

  return docs;
}

function firestoreDocToInvoice(doc: FirestoreDocument): Invoice {
  const fields = firestoreFieldsToJs(doc.fields || {});
  const id = doc.name.split("/").pop();
  return { id, ...fields } as Invoice;
}

function firestoreFieldsToJs(fields: Record<string, FirestoreValue>) {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = firestoreValueToJs(value);
  }
  return result;
}

function firestoreValueToJs(value: FirestoreValue): unknown {
  if ("stringValue" in value) return value.stringValue;
  if ("integerValue" in value) return Number(value.integerValue);
  if ("doubleValue" in value) return value.doubleValue;
  if ("booleanValue" in value) return value.booleanValue;
  if ("timestampValue" in value) return value.timestampValue;
  if ("nullValue" in value) return null;
  if ("mapValue" in value)
    return firestoreFieldsToJs(value.mapValue.fields || {});
  if ("arrayValue" in value) {
    const values = value.arrayValue.values || [];
    return values.map((entry) => firestoreValueToJs(entry));
  }
  return null;
}

function dedupeInvoices(invoices: Invoice[]) {
  const map = new Map<string, Invoice>();
  for (const invoice of invoices) {
    if (invoice.id) map.set(invoice.id, invoice);
  }
  return Array.from(map.values());
}

async function patchInvoice(
  baseUrl: string,
  apiKey: string,
  invoiceId: string,
  update: Record<string, unknown>,
) {
  const updateMask = Object.keys(update)
    .map((field) => `updateMask.fieldPaths=${encodeURIComponent(field)}`)
    .join("&");
  const url = `${baseUrl}/documents/invoices/${invoiceId}?${updateMask}&key=${apiKey}`;

  const fields = toFirestoreFields(update);

  const res = await fetch(url, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields }),
  });

  if (!res.ok) {
    throw new Error(`Failed to update invoice ${invoiceId}: ${res.statusText}`);
  }
}

function toFirestoreFields(update: Record<string, unknown>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, value] of Object.entries(update)) {
    fields[key] = toFirestoreValue(value);
  }
  return fields;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return {
      arrayValue: {
        values: value.map((entry) => toFirestoreValue(entry)),
      },
    };
  }
  if (typeof value === "object") {
    return {
      mapValue: {
        fields: toFirestoreFields(value as Record<string, unknown>),
      },
    };
  }
  if (typeof value === "number") {
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  }
  if (typeof value === "boolean") {
    return { booleanValue: value };
  }
  return { stringValue: String(value) };
}
