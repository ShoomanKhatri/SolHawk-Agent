import { NextRequest, NextResponse } from "next/server";
import { db } from "@/src/lib/firebase";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { generatePaymentReminder } from "@/src/lib/gemini";
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

    // Generate AI reminder
    const reminder = await generatePaymentReminder(invoiceData);

    // Save reminder to Firestore
    await updateDoc(invoiceRef, {
      aiReminder: reminder,
      updatedAt: new Date().toISOString(),
    });

    return NextResponse.json({ reminder });
  } catch (error: any) {
    console.error("Error in generate-reminder:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
