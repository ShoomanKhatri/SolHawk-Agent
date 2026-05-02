import { GoogleGenerativeAI } from "@google/generative-ai";
import { Invoice } from "../types/invoice";

export async function generatePaymentReminder(invoice: Invoice) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error("GEMINI_API_KEY is missing from process.env");
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
      You are SolHawk Agent, a professional AI payment assistant.

      Write a short and polite payment reminder.

      Details:
      Client: ${invoice.clientName}
      Amount: ${invoice.amount} ${invoice.currency}
      Due Date: ${invoice.dueDate}
      Note: ${invoice.note}
      Payment Link: ${invoice.solanaPayLink}

      Rules:
      - Keep it short (3–5 lines)
      - Friendly and professional tone
      - Include the payment link
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
