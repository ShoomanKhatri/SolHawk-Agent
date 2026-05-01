import { GoogleGenerativeAI } from "@google/generative-ai";
import { Invoice } from "../types/invoice";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export async function generatePaymentReminder(invoice: Invoice) {
  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const prompt = `
    You are SolHawk Agent, a professional AI payment recovery assistant for freelancers. 
    Write a short, polite payment reminder. 
    
    Details:
    - Client Name: ${invoice.clientName}
    - Amount: ${invoice.amount} ${invoice.currency}
    - Due Date: ${invoice.dueDate}
    - Invoice Note: ${invoice.note}
    - Solana Pay Link: ${invoice.solanaPayLink}
    
    Keep it friendly and professional.
  `;

  const result = await model.generateContent(prompt);
  const response = await result.response;
  return response.text();
}
