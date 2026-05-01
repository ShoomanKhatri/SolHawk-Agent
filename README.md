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

## Limitations (MVP)
- Payment detection checks recent transactions for the receiver wallet and matches the amount. It does not use reference keys for 100% precision (recommended for production).
- Transaction history is limited to the last 10 signatures.

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
