# SolHawk Agent MVP

SolHawk Agent is a professional AI payment recovery assistant for freelancers, integrated with Solana Pay. It allows users to create invoices, generate Solana Pay QR codes, and use Gemini AI to draft polite payment reminders.

## Setup Steps

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Environment Variables**:
   Create a `.env.local` file and fill in the values from `.env.example`.

3. **Firebase Setup**:
   - Create a new Firebase project.
   - Enable Firestore Database.
   - Copy the project settings and add them to your environment variables.

4. **Gemini API Setup**:
   - Get an API key from the [Google AI Studio](https://aistudio.google.com/).
   - Add it as `GEMINI_API_KEY` in your `.env.local`.

5. **Solana Devnet Testing**:
   - The app is configured to use Solana Devnet.
   - You can get Devnet SOL for testing from a [Solana Faucet](https://faucet.solana.com/).

## Demo Flow

1. Navigate to `/dashboard` to see your invoices.
2. Go to `/create-invoice` to create a new one.
   - Enter your Solana wallet address as the receiver.
   - Enter an amount in SOL.
3. Once created, click **View** to see the invoice details.
4. Scan the **Solana Pay QR code** with a wallet like Phantom or Solflare (set to Devnet).
5. Use **Generate Reminder** to let SolHawk AI write a professional follow-up.
6. Click **Check Payment** to verify if the transaction has landed on-chain.

## Grant Materials

- Colosseum Crowdedness Score screenshot: https://drive.google.com/drive/folders/1z07p3uYU4uXIPiVbAtg-zj1c0k00RNdz?usp=sharing

## Agent Automation (Vercel Cron)

SolHawk Agent can run daily using Vercel Cron. This allows the agent to monitor invoices and generate recovery actions without the user opening the app.

1. Deploy to Vercel.
2. Add a cron schedule in `vercel.json` to hit `/api/agent/run`.
3. The agent will evaluate invoices, check payments, and generate reminders automatically.

## Demo Seed Data

For hackathon demos, create four example invoices in Firestore:

- **Paid invoice**: status `paid`, `amountPaid = amount`, `remainingAmount = 0`, `daysToPay = 2`
- **Unpaid overdue invoice**: status `unpaid`, due date 3+ days ago
- **Partial payment invoice**: status `partial`, `amountPaid` < `amount`, `remainingAmount = amount - amountPaid`
- **Urgent overdue invoice**: status `unpaid`, due date 7+ days ago

Tip: Use the Firestore console to edit these fields directly for a clean demo narrative.

## Limitations (MVP)

- Payment detection uses Solana Pay references for matching, but still relies on recent transaction history for speed.
- Transaction history is limited to the last 10 signatures for destination-based checks.

---

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.
