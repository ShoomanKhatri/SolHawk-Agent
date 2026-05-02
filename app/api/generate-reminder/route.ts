import { NextRequest, NextResponse } from "next/server";
import { generatePaymentReminder } from "@/src/lib/gemini";
import { Invoice } from "@/src/types/invoice";

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    console.log("Fetching invoice via REST API:", invoiceId);
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
    const baseUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/invoices/${invoiceId}`;
    
    const getRes = await fetch(`${baseUrl}?key=${apiKey}`);
    if (!getRes.ok) {
      if (getRes.status === 404) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
      throw new Error(`Failed to fetch invoice: ${getRes.statusText}`);
    }
    
    const docData = await getRes.json();
    
    // Map REST response to Invoice type
    const invoiceData: any = {};
    Object.entries(docData.fields).forEach(([key, value]: [string, any]) => {
      invoiceData[key] = value.stringValue || value.integerValue || value.doubleValue || value.timestampValue || value.booleanValue;
    });

    console.log("Invoice data fetched successfully");

    // Generate AI reminder
    console.log("Calling Gemini for reminder...");
    const reminder = await generatePaymentReminder(invoiceData as Invoice);

    // Save reminder to Firestore via PATCH
    console.log("Updating invoice with reminder via REST API...");
    const patchRes = await fetch(`${baseUrl}?updateMask.fieldPaths=aiReminder&updateMask.fieldPaths=updatedAt&key=${apiKey}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fields: {
          aiReminder: { stringValue: reminder },
          updatedAt: { timestampValue: new Date().toISOString() }
        }
      })
    });

    if (!patchRes.ok) {
      throw new Error(`Failed to update invoice: ${patchRes.statusText}`);
    }

    console.log("Invoice updated successfully");

    return NextResponse.json({ reminder });
  } catch (error: any) {
    console.error("DETAILED ERROR in generate-reminder:", error);
    return NextResponse.json({ 
      error: error.message,
    }, { status: 500 });
  }
}
