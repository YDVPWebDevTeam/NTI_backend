# Program A — Application Status Map

## Flow diagram

```
                        ┌─────────────────────────────────────────────────────┐
                        │                   REVIEWER ACTIONS                  │
                        └─────────────────────────────────────────────────────┘

  [applicant]                [reviewer]                  [staff/admin]

  createDraft
      │
      ▼
    DRAFT
      │ submit
      ▼
  SUBMITTED ──────────────── formalVerify ──────► FORMALLY_VERIFIED
      │                                                    │
      │                                              startEvaluation
      │                                                    │
      │                                                    ▼
      │                          ◄──── resubmit ──── EVALUATING ──── approve ──► APPROVED
      │                          │         ▲               │                         │
      │                          ▼         │               │                   startOnboarding
      │                      NEEDS_INFO    │               │                         │
      │                          │  reply  │          needsInfo                      ▼
      │                          └─────────┘               │                    ONBOARDING
      │                                                     ▼                        │
      │                                               NEEDS_INFO                 activate
      │                                                                               │
      │                                                                               ▼
      │                                                                        ACTIVE_PROJECT
      │                                                                         │         │
      │                                                                       pause    complete
      │                                                                         │         │
      │                                                                         ▼         ▼
      │                                                                       PAUSED  COMPLETED
      │                                                                         │         │
      │                                                                      activate  archive
      │                                                                                   │
      │                                                                                   ▼
      │                                                                               ARCHIVED

  reject is available from: SUBMITTED, FORMALLY_VERIFIED, EVALUATING, NEEDS_INFO ──► REJECTED
```

## Transition table

| Status | Transitions out | Who |
|--------|----------------|-----|
| `DRAFT` | → `SUBMITTED` (submit) | applicant |
| `SUBMITTED` | → `FORMALLY_VERIFIED`, → `NEEDS_INFO`, → `REJECTED` | reviewer |
| `FORMALLY_VERIFIED` | → `EVALUATING`, → `NEEDS_INFO`, → `REJECTED` | reviewer |
| `EVALUATING` | → `APPROVED`, → `NEEDS_INFO`, → `REJECTED` | reviewer |
| `NEEDS_INFO` | → `EVALUATING` (resubmit, after all items answered) | applicant / team lead |
| `APPROVED` | → `ONBOARDING` | staff |
| `ONBOARDING` | → `ACTIVE_PROJECT` | staff |
| `ACTIVE_PROJECT` | → `PAUSED`, → `COMPLETED` | staff |
| `PAUSED` | → `ACTIVE_PROJECT` | staff |
| `COMPLETED` | → `ARCHIVED` | staff |
| `REJECTED` | — (terminal) | — |
| `ARCHIVED` | — (terminal) | — |

## NEEDS_INFO rules

- Reviewer can open a `NEEDS_INFO` item from `SUBMITTED`, `FORMALLY_VERIFIED`, or `EVALUATING`.
- Applicant (team lead) replies to each item; all items must be at least `ANSWERED` (none `OPEN`) before resubmit.
- `resubmit` transitions `NEEDS_INFO → EVALUATING` and auto-resolves answered items.
