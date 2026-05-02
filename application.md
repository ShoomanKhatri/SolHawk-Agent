# SolHawk Agent - Agentic Engineering Grant Application

Grant link: https://superteam.fun/earn/grants/agentic-engineering

Verified on May 3, 2026: the listing is open, global, and shows a 200 USDG cheque size.

## Step 1: Basics

**Project Title**

> SolHawk Agent

**One Line Description**

> An AI-powered Solana Pay recovery agent that creates invoices, verifies payments on-chain, and autonomously drafts follow-ups for freelancers.

**TG username**

> t.me/shoomankhatri

**Wallet Address**

> E8oZ8QP3epMY1wSa2qm9YZa2zaVj5tsXX4kbFC3G5ASq

## Step 2: Details

**Project Details**

> Freelancers and small service teams often lose time and revenue chasing overdue payments. Existing invoice tools make it easy to send a bill, but they do not reliably combine low-fee settlement, on-chain payment verification, reminder history, and an autonomous follow-up loop.
>
> SolHawk Agent solves this with a Next.js app that creates Solana Pay invoices, generates payment QR codes, checks Solana Devnet payments by reference and destination, and stores invoice state in Firebase. Gemini powers professional payment reminders, while the policy engine evaluates due dates, payment status, partial payments, reminder count, and decision history to choose the next action.
>
> The agentic part is the monitor -> remind -> escalate -> stop loop. A scheduled `/api/agent/run` endpoint can be invoked by Vercel Cron to process unpaid and partially paid invoices without the freelancer opening the dashboard. The dashboard then shows recovery metrics, recent agent activity, decision history, reminder history, and payment status.
>
> Solana is the right settlement layer because Solana Pay gives the project fast, low-cost payment links and deterministic on-chain references. That lets the agent make timely recovery decisions based on verifiable payment data instead of manual status updates.

**Deadline**

> May 10, 2026 (Asia/Calcutta)

**Proof of Work**

> Repo: https://github.com/ShoomanKhatri/SolHawk-Agent
>
> Live demo: https://sol-hawk-agent.vercel.app/dashboard
>
> Build verification: `npm run build` passes locally with Next.js 16.2.4.
>
> Recent commits:
>
> - `1658c08` fix: build errors
> - `cb6cdd1` feat: add metrics
> - `ca51c20` add: user login
> - `9eb6b6b` feat: integrated gemini and firebase
> - `d0f42cb` feat: enhance ui
>
> Shipped features include Solana Pay invoice links and QR codes, wallet connection, Firebase invoice storage, payment detection, partial-payment state, Gemini reminder generation, reminder history, decision history, agent policy evaluation, dashboard metrics, and a Vercel Cron-compatible scheduled agent runner at `/api/agent/run`.
>
> AI-assisted development proof is available in the exported session transcript files in the project root: `./codex-session.jsonl` and `./claude-session.jsonl`.

**Personal X Profile**

> x.com/shoomankhatri

**Personal GitHub Profile**

> github.com/ShoomanKhatri

**Colosseum Crowdedness Score**

> TODO: Visit https://colosseum.com/copilot, generate the Crowdedness Score for SolHawk Agent, take a screenshot, upload it to a publicly accessible Google Drive link, and paste that link here.

**AI Session Transcript**

> Attach `./codex-session.jsonl` from the project root. Also attach `./claude-session.jsonl` only if you want to include the exported Claude transcript as supporting evidence.

## Step 3: Milestones

**Goals and Milestones**

> - May 5, 2026: Clean up lint issues and tighten typed Firestore serialization/deserialization helpers so the repo is easier to review.
> - May 6, 2026: Harden payment verification for reference matching, partial payments, and user-facing confidence reasons.
> - May 8, 2026: Add configurable recovery policy settings for reminder cadence, escalation thresholds, and auto-stop conditions.
> - May 10, 2026: Ship the public grant demo with seeded invoice scenarios, recovery metrics, agent activity history, and a short demo walkthrough.

**Primary KPI**

> Process at least 25 demo invoices and show a 40% recovery rate for overdue invoices within 7 days of first agent follow-up.

**Final tranche checkbox**

> I understand that to receive the final tranche, I must submit the Colosseum project link, GitHub repo, and AI subscription receipt.

Grant link: https://superteam.fun/earn/grants/agentic-engineering

