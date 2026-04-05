# AGENTS.md

## NTI context
Backend-first NestJS + Prisma + PostgreSQL project.
Sensitive areas: auth, roles, teams, invitations, verification tokens, refresh tokens.

## Change policy
- Follow existing module patterns in the touched area.
- Prefer extending current flows over introducing new abstractions.
- Do not change unrelated files unless required by the task.

## NTI invariants
- Role enforcement must stay consistent across protected endpoints.
- Invitation, verification, and refresh token flows must preserve expiry and one-time-use semantics where expected.
- Team membership changes must not allow duplicate, stale, or conflicting states.
- Multi-step state changes in auth/team flows should be treated as atomic where inconsistency is possible.
- API responses must not expose sensitive internal fields.

## Prisma / data rules
- Be careful with `include` and broad fetching.
- Watch nullable fields, unique constraints, and relation integrity.
- Schema changes must preserve domain rules for users, teams, invitations, and tokens.

## Auth and Token Rules
- Do not reveal whether a user, email, or token exists unless the endpoint explicitly requires it.
- Do not store one-time tokens in plaintext; store a hash and send the raw token once.
- Consume one-time tokens atomically in the same transaction as the state change.
- Keep authorization checks in services for protected mutations as defense in depth.
- If an endpoint response shape changes, update DTO, Swagger decorators, controller return type, and tests in the same change.
- Auth changes are incomplete without negative-path tests for invalid, expired, reused, and unauthorized cases.

## Review focus
When reviewing changes, check for:
- missing or inconsistent authorization
- unsafe token handling
- duplicate acceptance / duplicate membership bugs
- race-prone state transitions (!)
- broken model invariants
- response data leaks
- missing negative-path coverage for protected flows