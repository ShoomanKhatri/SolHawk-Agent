import { NextRequest, NextResponse } from "next/server";
import { generatePaymentReminder } from "@/src/lib/gemini";
import { evaluateAgentPolicy } from "@/src/lib/agentPolicy";
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

type FirestoreMapInput =
  | DecisionEntry
  | ReminderEntry
  | Record<string, unknown>;

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    console.log("Fetching invoice via REST API:", invoiceId);
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invoices/${invoiceId}`;

    const getRes = await fetch(`${baseUrl}?key=${apiKey}`);
    if (!getRes.ok) {
      if (getRes.status === 404)
        return NextResponse.json(
          { error: "Invoice not found" },
          { status: 404 },
        );
      throw new Error(`Failed to fetch invoice: ${getRes.statusText}`);
    }

    const docData = (await getRes.json()) as FirestoreDocument;

    const invoiceData = firestoreFieldsToJs(
      docData.fields || {},
    ) as unknown as Invoice;

    console.log("Invoice data fetched successfully");

    // Generate AI reminder
    console.log("Calling Gemini for reminder...");
    const policy = evaluateAgentPolicy(invoiceData);
    const reminderAction = isReminderAction(policy.nextAction)
      ? policy.nextAction
      : toneToAction(policy.reminderTone);
    const decisionEntry: DecisionEntry = {
      timestamp: new Date().toISOString(),
      status: policy.agentStatus,
      reason: policy.reason,
      action: reminderAction,
    };

    const reminder = await generatePaymentReminder(invoiceData as Invoice, {
      reminderTone: policy.reminderTone,
      decisionSummary: summarizeDecisionHistory(invoiceData.decisionHistory),
      previousTone: getLastReminderTone(invoiceData.reminderHistory),
    });

    const reminderEntry: ReminderEntry = {
      tone: policy.reminderTone,
      message: reminder,
      createdAt: decisionEntry.timestamp,
      action: reminderAction,
      reason: policy.reason,
    };

    const reminderCount = (invoiceData.reminderCount ?? 0) + 1;
    const firstReminderAt =
      invoiceData.firstReminderAt ?? decisionEntry.timestamp;
    const lastReminderAt = decisionEntry.timestamp;
    const decisionHistory = Array.isArray(invoiceData.decisionHistory)
      ? [...invoiceData.decisionHistory, decisionEntry]
      : [decisionEntry];
    const reminderHistory = Array.isArray(invoiceData.reminderHistory)
      ? [...invoiceData.reminderHistory, reminderEntry]
      : [reminderEntry];

    // Save reminder to Firestore via PATCH
    console.log("Updating invoice with reminder via REST API...");
    const patchRes = await fetch(
      `${baseUrl}?updateMask.fieldPaths=aiReminder&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=decisionHistory&updateMask.fieldPaths=reminderHistory&updateMask.fieldPaths=reminderCount&updateMask.fieldPaths=firstReminderAt&updateMask.fieldPaths=lastReminderAt&updateMask.fieldPaths=agentStatus&updateMask.fieldPaths=nextAction&updateMask.fieldPaths=lastCheckedAt&key=${apiKey}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            aiReminder: { stringValue: reminder },
            agentStatus: { stringValue: policy.agentStatus },
            nextAction: { stringValue: policy.nextAction },
            lastCheckedAt: { stringValue: decisionEntry.timestamp },
            decisionHistory: {
              arrayValue: { values: toFirestoreArray(decisionHistory) },
            },
            reminderHistory: {
              arrayValue: { values: toFirestoreArray(reminderHistory) },
            },
            reminderCount: { integerValue: String(reminderCount) },
            firstReminderAt: { stringValue: firstReminderAt },
            lastReminderAt: { stringValue: lastReminderAt },
            updatedAt: { timestampValue: new Date().toISOString() },
          },
        }),
      },
    );

    if (!patchRes.ok) {
      throw new Error(`Failed to update invoice: ${patchRes.statusText}`);
    }

    console.log("Invoice updated successfully");

    return NextResponse.json({ reminder });
  } catch (error: unknown) {
    console.error("DETAILED ERROR in generate-reminder:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      {
        error: message,
      },
      { status: 500 },
    );
  }
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

function isReminderAction(action: string) {
  return (
    action === "send_friendly_reminder" ||
    action === "send_firm_reminder" ||
    action === "send_urgent_reminder" ||
    action === "request_remaining_balance"
  );
}

function toneToAction(tone: ReminderEntry["tone"]) {
  if (tone === "firm") return "send_firm_reminder";
  if (tone === "urgent") return "send_urgent_reminder";
  if (tone === "partial") return "request_remaining_balance";
  return "send_friendly_reminder";
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

function toFirestoreArray(values: FirestoreMapInput[]) {
  return values.map((entry) => ({
    mapValue: {
      fields: toFirestoreFields(entry as Record<string, unknown>),
    },
  }));
}

function toFirestoreFields(value: Record<string, unknown>) {
  const fields: Record<string, FirestoreValue> = {};
  for (const [key, fieldValue] of Object.entries(value)) {
    fields[key] = toFirestoreValue(fieldValue);
  }
  return fields;
}

function toFirestoreValue(value: unknown): FirestoreValue {
  if (value === null || value === undefined) return { nullValue: null };
  if (Array.isArray(value)) {
    return {
      arrayValue: { values: value.map((entry) => toFirestoreValue(entry)) },
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
  if (typeof value === "boolean") return { booleanValue: value };
  return { stringValue: String(value) };
}
