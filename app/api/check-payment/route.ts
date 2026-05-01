import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { checkSolanaPayment } from "@/src/lib/solana";
import { Invoice } from "@/src/types/invoice";

export async function POST(req: NextRequest) {
  try {
    const { invoiceId } = await req.json();

    if (!invoiceId) {
      return NextResponse.json({ error: "Invoice ID is required" }, { status: 400 });
    }

    const invoiceRef = doc(db, "invoices", invoiceId);
    const invoiceSnap = await getDoc(invoiceRef);

    if (!invoiceSnap.exists()) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const invoiceData = invoiceSnap.data() as Invoice;

    // Check payment on Solana Devnet
    const paymentResult = await checkSolanaPayment(
      invoiceData.receiverWallet,
      invoiceData.amount
    );

    if (paymentResult.found) {
      // Update status to paid
      await updateDoc(invoiceRef, {
        status: "paid",
        updatedAt: new Date().toISOString(),
      });

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
