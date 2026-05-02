import { GoogleGenerativeAI } from "@google/generative-ai";
import { Invoice } from "../types/invoice";
import { ReminderTone } from "./agentPolicy";

interface ReminderContext {
  reminderTone: ReminderTone;
  decisionSummary: string;
  previousTone?: ReminderTone | null;
}

export async function generatePaymentReminder(
  invoice: Invoice,
  context: ReminderContext,
) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from process.env");
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const amountPaid =
      typeof invoice.amountPaid === "number" ? invoice.amountPaid : null;
    const remainingBalance =
      typeof invoice.remainingAmount === "number"
        ? invoice.remainingAmount
        : invoice.status === "partial" && amountPaid !== null
          ? Math.max(invoice.amount - amountPaid, 0)
          : null;
    const previousTone = context.previousTone ?? "none";

    const amountDue =
      invoice.status === "partial" && remainingBalance !== null
        ? remainingBalance
        : invoice.amount;

    const prompt = `
      You are SolHawk Agent, an AI financial assistant helping freelancers recover payments.

      Analyze the situation and write a short reminder.
      Selected Tone: ${context.reminderTone}

      Details:
      Client: ${invoice.clientName}
      Amount Due: ${amountDue} ${invoice.currency}
      Status: ${invoice.status}
      Amount Paid: ${amountPaid ?? "unknown"}
      Remaining Balance: ${remainingBalance ?? "unknown"}
      Due Date: ${invoice.dueDate}
      Note: ${invoice.note}
      Invoice Reference: ${invoice.reference ?? "unknown"}
      Payment Link: ${invoice.solanaPayLink}
      Previous Reminder Tone: ${previousTone}
      Decision History Summary:
      ${context.decisionSummary}

      Rules:
      - Keep it under 90 words
      - Match the selected tone exactly: friendly, firm, urgent, or partial
      - Avoid repeating the same phrasing from previous reminders
      - If partial: acknowledge partial payment and request remaining balance
      - If partial: mention only the remaining amount, not the original amount
      - Do not invent details or payment terms
      - Do not mention legal action or threaten the client
      - Always include the invoice reference and the Solana Pay link
      - Do NOT use markdown
      - Return plain text only
    `;

    console.log("Generating reminder with Gemini...");
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      throw new Error("Empty response from Gemini");
    }

    console.log("Reminder generated successfully");
    return text;
  } catch (error: any) {
    console.error("Gemini API Error details:", error);
    throw new Error(`AI generation failed: ${error.message}`);
  }
}
