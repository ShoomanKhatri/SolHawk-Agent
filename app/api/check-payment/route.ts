import { NextRequest, NextResponse } from "next/server";
import { checkSolanaPayment } from "@/src/lib/solana";
import { Invoice } from "@/src/types/invoice";

type FirestoreValue =
  | { stringValue: string }
  | { integerValue: string }
  | { doubleValue: number }
  | { booleanValue: boolean }
  | { timestampValue: string }
  | { nullValue: null }
  | { mapValue: { fields: Record<string, FirestoreValue> } }
  | { arrayValue: { values?: FirestoreValue[] } };

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json(
        { error: "Invoice ID is required" },
        { status: 400 },
      );
    }

    console.log("Fetching invoice via REST API for payment check:", invoiceId);
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

    const docData = await getRes.json();

    const invoiceData = firestoreFieldsToJs(docData.fields || {}) as Invoice;

    console.log("Invoice data fetched successfully");

    // Check payment on Solana Devnet
    const paymentResult = await checkSolanaPayment(
      invoiceData.receiverWallet,
      Number(invoiceData.amount),
      invoiceData.reference,
    );

    if (paymentResult.found) {
      const paidAt = new Date().toISOString();
      const paidAmount =
        typeof paymentResult.amount === "number"
          ? paymentResult.amount
          : invoiceData.amount;
      const remainingAmount = Math.max(invoiceData.amount - paidAmount, 0);
      const isPartial = remainingAmount > 0.001;
      const daysToPay = !isPartial
        ? calculateDaysToPay(invoiceData.createdAt, paidAt)
        : null;

      const updateMask = isPartial
        ? "status&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=agentStatus&updateMask.fieldPaths=nextAction&updateMask.fieldPaths=lastCheckedAt&updateMask.fieldPaths=amountPaid&updateMask.fieldPaths=remainingAmount"
        : "status&updateMask.fieldPaths=updatedAt&updateMask.fieldPaths=agentStatus&updateMask.fieldPaths=nextAction&updateMask.fieldPaths=lastCheckedAt&updateMask.fieldPaths=paidAt&updateMask.fieldPaths=daysToPay&updateMask.fieldPaths=amountPaid&updateMask.fieldPaths=remainingAmount";

      const fields: Record<string, any> = {
        status: { stringValue: isPartial ? "partial" : "paid" },
        agentStatus: { stringValue: isPartial ? "partial" : "paid" },
        nextAction: {
          stringValue: isPartial ? "request_remaining_balance" : "none",
        },
        lastCheckedAt: { stringValue: paidAt },
        amountPaid: { doubleValue: paidAmount },
        remainingAmount: { doubleValue: remainingAmount },
        updatedAt: { timestampValue: paidAt },
      };

      if (!isPartial) {
        fields.paidAt = { stringValue: paidAt };
        fields.daysToPay =
          daysToPay === null
            ? { nullValue: null }
            : { integerValue: String(daysToPay) };
      }

      console.log("Updating payment status via REST API...");
      const patchRes = await fetch(
        `${baseUrl}?updateMask.fieldPaths=${updateMask}&key=${apiKey}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fields,
          }),
        },
      );

      if (!patchRes.ok) {
        throw new Error(`Failed to update status: ${patchRes.statusText}`);
      }

      return NextResponse.json({
        status: isPartial ? "partial" : "paid",
        signature: paymentResult.signature,
        confidence: paymentResult.confidence,
        reason: paymentResult.reason,
        amountPaid: paidAmount,
        remainingAmount,
      });
    }

    return NextResponse.json({
      status: invoiceData.status,
      message: paymentResult.reason || "Payment not detected yet",
      confidence: paymentResult.confidence,
      reason: paymentResult.reason,
    });
  } catch (error: any) {
    console.error("Error in check-payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function firestoreFieldsToJs(fields: Record<string, FirestoreValue>) {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(fields)) {
    result[key] = firestoreValueToJs(value);
  }
  return result;
}

function firestoreValueToJs(value: FirestoreValue): any {
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

function calculateDaysToPay(createdAt: any, paidAt: string) {
  const createdDate = parseInvoiceDate(createdAt);
  if (!createdDate) return null;
  const paidDate = new Date(paidAt);
  const diffMs = paidDate.getTime() - createdDate.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

function parseInvoiceDate(value: any) {
  if (!value) return null;
  if (typeof value === "string") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "number") {
    const date = new Date(value);
    return isNaN(date.getTime()) ? null : date;
  }
  if (typeof value === "object" && "seconds" in value) {
    const date = new Date(value.seconds * 1000);
    return isNaN(date.getTime()) ? null : date;
  }
  return null;
}
