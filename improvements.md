# SolHawk Agent - Agentic Improvements

- Add a persistent agent memory layer that stores invoice-specific outcomes and uses them to tune tone selection and timing (per-client calibration).
- Introduce an autonomous scheduler that adapts reminder cadence based on on-chain signals (partial payments, wallet activity) instead of fixed intervals.
- Implement multi-channel actions (email, SMS, Telegram) with the agent selecting the channel based on response history.
- Add a policy safety layer with confidence scores, guardrails, and auto-stop rules to prevent over-escalation.
- Generate on-chain attestation records for reminders sent and payments verified to make recovery actions auditable.
- Add a self-evaluation loop that measures reminder effectiveness and proposes policy updates with human approval.
- Support multi-agent roles (collector, analyst, auditor) that collaborate on complex cases like partial or disputed payments.
