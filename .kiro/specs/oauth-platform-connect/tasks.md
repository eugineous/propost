# Implementation Plan: OAuth Platform Connect

## Overview

Add one-click OAuth connect buttons for Instagram, Facebook, LinkedIn, X, and TikTok to ProPost. Tokens are stored in a new `platform_connections` DB table and retrieved via a shared `getToken()` helper used by all platform wrappers.

## Tasks

- [x] 1. Add platform_connections table to schema and migration
  - Add `platformConnections` Drizzle table to `lib/schema.ts`
  - Add `CREATE TABLE IF NOT EXISTS platform_connections` SQL to `app/api/admin/migrate/route.ts`
  - _Requirements: 4.1, 4.2_

- [x] 2. Implement token helper lib/platforms/token.ts
  - [x] 2.1 Create `lib/platforms/token.ts` with `getToken()`, `refreshToken()`, and `PlatformNotConnectedError`
    - `getToken(platform)` reads from DB, refreshes on-demand if expiring within 5 min
    - `refreshToken(platform)` calls platform-specific refresh endpoint and upserts DB row
    - Throws `PlatformNotConnectedError` when no DB record exists
    - _Requirements: 5.5, 5.6, 6.2, 6.3_
  - [ ]* 2.2 Write property test for getToken — Property 6: Token refresh on-demand
    - **Property 6: Token refresh on-demand**
    - **Validates: Requirements 5.5, 6.3**
  - [ ]* 2.3 Write property test for getToken — Property 12: Missing token throws
    - **Property 12: Missing token throws, not falls back**
    - **Validates: Requirements 5.6**

- [x] 3. Implement OAuth initiation route app/api/auth/connect/[platform]/route.ts
  - [x] 3.1 Create `app/api/auth/connect/[platform]/route.ts`
    - Validate NextAuth session (redirect to `/login` if unauthenticated)
    - Validate platform is one of: instagram, facebook, linkedin, x, tiktok
    - Generate random `state` (32-byte hex) and `code_verifier` for X/TikTok PKCE
    - Store state + verifier in HTTP-only cookie `oauth_state_<platform>` (10-min expiry)
    - Redirect to platform authorization URL with correct params and scopes
    - _Requirements: 2.1, 2.2, 2.3, 8.1, 8.2_
  - [ ]* 3.2 Write property test for OAuth redirect — Property 3: OAuth redirect contains required parameters
    - **Property 3: OAuth redirect contains required parameters**
    - **Validates: Requirements 2.1, 2.3**

- [-] 4. Implement OAuth callback route app/api/auth/callback/[platform]/route.ts
  - [-] 4.1 Create `app/api/auth/callback/[platform]/route.ts`
    - Validate NextAuth session
    - Read and validate `state` cookie — reject with 400 + redirect on mismatch
    - Exchange `code` for tokens (include `code_verifier` for X/TikTok)
    - Fetch platform username/user ID
    - Upsert record in `platform_connections`
    - Redirect to `/settings/connections?connected=<platform>` or `?error=<reason>`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 8.3_
  - [ ]* 4.2 Write property test for callback — Property 4: State param CSRF protection
    - **Property 4: State param CSRF protection**
    - **Validates: Requirements 3.1, 3.2, 8.3**
  - [ ]* 4.3 Write property test for callback — Property 5: Token upsert uniqueness
    - **Property 5: Token upsert uniqueness**
    - **Validates: Requirements 3.5, 3.7, 4.3**

- [ ] 5. Checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [-] 6. Implement connections API routes
  - [ ] 6.1 Create `app/api/connections/route.ts` — GET all connections
    - Validate session
    - Query `platform_connections` for all 5 platforms
    - Return sanitized status array (no raw tokens)
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1_
  - [ ]* 6.2 Write property test for connections API — Property 8: Connections API response shape
    - **Property 8: Connections API response shape**
    - **Validates: Requirements 7.1, 7.2, 7.3**
  - [ ]* 6.3 Write property test for connections API — Property 9: No raw tokens in API response
    - **Property 9: No raw tokens in API response**
    - **Validates: Requirements 7.4**
  - [ ] 6.4 Create `app/api/connections/[platform]/route.ts` — DELETE connection
    - Validate session
    - Delete row from `platform_connections` for given platform
    - Return `{ ok: true }` (idempotent)
    - _Requirements: 7.5, 8.5_
  - [ ]* 6.5 Write property test for DELETE — Property 10: Delete removes token record
    - **Property 10: Delete removes token record**
    - **Validates: Requirements 7.5**

- [-] 7. Implement token refresh cron app/api/cron/refresh-tokens/route.ts
  - [ ] 7.1 Create `app/api/cron/refresh-tokens/route.ts`
    - Protect with `CRON_SECRET` header check
    - Query connections where `expires_at` is within 48 hours
    - Call `refreshToken(platform)` for each; log errors without deleting existing tokens
    - _Requirements: 5.1, 5.2, 5.3, 5.4_
  - Add cron entry to `vercel.json`: `{ "path": "/api/cron/refresh-tokens", "schedule": "0 2 * * *" }`
  - _Requirements: 5.1_
  - [ ]* 7.2 Write property test for cron — Property 7: Cron refreshes only near-expiry tokens
    - **Property 7: Cron refreshes only near-expiry tokens**
    - **Validates: Requirements 5.2, 5.3**

- [-] 8. Update platform wrappers to use getToken() with env var fallback
  - [ ] 8.1 Update `lib/platforms/instagram.ts` — use `getToken('instagram')` with `process.env.INSTAGRAM_ACCESS_TOKEN` fallback
    - _Requirements: 6.1, 6.4_
  - [ ] 8.2 Update `lib/platforms/facebook.ts` — use `getToken('facebook')` with `process.env.FACEBOOK_ACCESS_TOKEN` fallback
    - _Requirements: 6.1, 6.7_
  - [ ] 8.3 Update `lib/platforms/linkedin.ts` — use `getToken('linkedin')` with `process.env.LINKEDIN_ACCESS_TOKEN` fallback
    - _Requirements: 6.1, 6.6_
  - [ ] 8.4 Update `lib/platforms/x.ts` — use `getToken('x')` with OAuth 1.0a env var fallback for user-context calls
    - _Requirements: 6.1, 6.5_

- [-] 9. Build settings connections UI app/settings/connections/page.tsx
  - [ ] 9.1 Create `app/settings/connections/page.tsx`
    - Fetch `GET /api/connections` on load
    - Render platform cards with Connect/Disconnect buttons
    - Show connected username, days until expiry, and warning indicator when ≤ 7 days
    - Connect button links to `/api/auth/connect/<platform>`
    - Disconnect button calls `DELETE /api/connections/<platform>`
    - Handle `?connected=` and `?error=` query params for success/error feedback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 8.5_
  - [ ]* 9.2 Write property test for UI — Property 1: Connect/Disconnect button reflects connection state
    - **Property 1: Connect/Disconnect button reflects connection state**
    - **Validates: Requirements 1.2, 1.4**
  - [ ]* 9.3 Write property test for UI — Property 2: Expiry warning threshold
    - **Property 2: Expiry warning threshold**
    - **Validates: Requirements 1.6**

- [ ] 10. Add link to connections page from existing settings page
  - Update `app/settings/page.tsx` Platform Connections section to link to `/settings/connections`
  - _Requirements: 1.1_

- [ ] 11. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties
- Unit tests validate specific examples and edge cases
