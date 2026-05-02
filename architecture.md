# SolHawk Agent - Architecture

## Overview

SolHawk Agent is a Next.js app that creates Solana Pay invoices, monitors payment references, and runs an agent policy loop to drive recovery actions. Firebase stores invoice state and history. A scheduled API route runs the agent automatically.

## Core Components

- **UI (Next.js App Router):** Invoice creation, dashboard metrics, invoice detail view, AI reminder display.
- **Firestore (Firebase):** Invoices, reminder history, decision history, and agent metrics.
- **Solana Pay Links + Reference Checks:** Verifies payment based on reference and transaction status.
- **Agent Policy Engine:** Evaluates status, due date, partial payments, and history to decide next action.
- **Agent Runner API:** Scheduled endpoint at /api/agent/run that evaluates invoices and triggers actions.
- **Reminder Generator:** AI-powered reminder drafting (Gemini).

## Data Flow

1. User creates invoice -> Firestore stores invoice record.
2. UI renders Solana Pay QR + link.
3. Agent runner checks payment references and updates status.
4. Policy engine selects next action (friendly, firm, urgent, request balance, stop).
5. Reminder generator creates message and stores it in Firestore.
6. UI shows updated status, reminder history, and metrics.

## Agent Policy Loop

monitor -> remind -> escalate -> stop

Inputs:

- Due date, days overdue
- Payment status and remaining balance
- Reminder and decision history

Outputs:

- Next action
- Agent status
- Reminder tone

## Storage Model (High Level)

- Invoice: client, amount, due date, status, solanaPayLink, reference
- Payment state: amountPaid, remainingAmount, daysToPay
- Agent state: agentStatus, nextAction, reminderCount
- History: reminderHistory[], decisionHistory[]

## Deployment Notes

- Vercel cron can invoke /api/agent/run for daily automation.
- The app runs on Solana Devnet for testing by default.
