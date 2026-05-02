import { NextRequest, NextResponse } from "next/server";
import { checkSolanaPayment } from "@/src/lib/solana";
import { Invoice } from "@/src/types/invoice";

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    console.log("Fetching invoice via REST API for payment check:", invoiceId);
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

    // Check payment on Solana Devnet
    const paymentResult = await checkSolanaPayment(
      invoiceData.receiverWallet,
      Number(invoiceData.amount)
    );

    if (paymentResult.found) {
      // Update status to paid via REST API
      console.log("Updating status to paid via REST API...");
      const patchRes = await fetch(`${baseUrl}?updateMask.fieldPaths=status&updateMask.fieldPaths=updatedAt&key=${apiKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fields: {
            status: { stringValue: "paid" },
            updatedAt: { timestampValue: new Date().toISOString() }
          }
        })
      });

      if (!patchRes.ok) {
        throw new Error(`Failed to update status: ${patchRes.statusText}`);
      }

      return NextResponse.json({ 
        status: "paid", 
        signature: paymentResult.signature 
      });
    }

    return NextResponse.json({ 
      status: invoiceData.status, 
      message: "Payment not detected yet" 
    });
  } catch (error: any) {
    console.error("Error in check-payment:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
