# Requirements Document

## Introduction

OAuth Platform Connect replaces hardcoded API keys in ProPost with a proper OAuth 2.0 "Connect" flow for each social platform. Eugine Micah (the sole user) clicks a Connect button, is redirected to the platform's login/authorization page, and is redirected back to ProPost where the token is persisted to the Neon PostgreSQL database. Platform API wrappers then read tokens from the DB instead of environment variables. Supported platforms: Instagram/Facebook (Meta OAuth), LinkedIn, X/Twitter, and TikTok.

## Glossary

- **Connection_Manager**: The `/settings/connections` page UI that displays platform connection status and provides Connect/Disconnect controls.
- **OAuth_Handler**: The Next.js API route that initiates an OAuth authorization redirect for a given platform.
- **Callback_Handler**: The Next.js API route that receives the OAuth callback, exchanges the authorization code for tokens, and persists them.
- **Token_Store**: The `platform_connections` Drizzle ORM table in Neon PostgreSQL that stores OAuth tokens per platform.
- **Token_Refresher**: The logic (cron or on-demand) that refreshes expiring access tokens using stored refresh tokens.
- **Platform_Wrapper**: The existing `lib/platforms/*.ts` modules (instagram.ts, x.ts, linkedin.ts, facebook.ts, tiktok.ts) that call platform APIs.
- **Platform**: One of: `instagram`, `facebook`, `linkedin`, `x`, `tiktok`.
- **State_Param**: A cryptographically random string included in the OAuth redirect and verified on callback to prevent CSRF attacks.

## Requirements

### Requirement 1: Platform Connections Settings Page

**User Story:** As Eugine, I want a dedicated `/settings/connections` page, so that I can see the connection status of every platform and connect or disconnect them with one click.

#### Acceptance Criteria

1. THE Connection_Manager SHALL display a card for each Platform showing: platform name, icon, connection status (connected/disconnected), connected account handle, and token expiry information.
2. WHEN a Platform is disconnected, THE Connection_Manager SHALL display a "Connect" button that initiates the OAuth flow for that Platform.
3. WHEN a Platform is connected, THE Connection_Manager SHALL display the connected account handle (e.g. `@euginemicah`) and the number of days until token expiry.
4. WHEN a Platform is connected, THE Connection_Manager SHALL display a "Disconnect" button that removes the stored tokens for that Platform from the Token_Store.
5. WHEN the Connection_Manager page loads, THE Connection_Manager SHALL fetch current connection status for all Platforms from the Token_Store and render it without requiring a page refresh.
6. WHEN a token expires within 7 days, THE Connection_Manager SHALL display a visual warning indicator on that Platform's card.

### Requirement 2: OAuth Authorization Initiation

**User Story:** As Eugine, I want clicking "Connect" to redirect me to the platform's official login page, so that I can authorize ProPost without sharing my credentials directly.

#### Acceptance Criteria

1. WHEN Eugine clicks "Connect" for a Platform, THE OAuth_Handler SHALL redirect the browser to the platform's OAuth authorization URL with the correct `client_id`, `redirect_uri`, `scope`, and `response_type` parameters.
2. THE OAuth_Handler SHALL generate a cryptographically random State_Param, store it in an HTTP-only cookie with a 10-minute expiry, and include it in the authorization URL.
3. THE OAuth_Handler SHALL use the following scopes per platform:
   - Instagram/Facebook: `instagram_basic,instagram_content_publish,pages_read_engagement,pages_manage_posts`
   - LinkedIn: `openid,profile,w_member_social`
   - X/Twitter: `tweet.read,tweet.write,users.read,offline.access`
   - TikTok: `user.info.basic,video.publish`
4. IF the Platform already has a valid token in the Token_Store, THEN THE OAuth_Handler SHALL still allow re-authorization to refresh or replace the token.

### Requirement 3: OAuth Callback and Token Persistence

**User Story:** As Eugine, I want to be automatically redirected back to ProPost after authorizing a platform, so that my tokens are saved and I can start using the connection immediately.

#### Acceptance Criteria

1. WHEN the platform redirects to the Callback_Handler with a valid `code` and `state`, THE Callback_Handler SHALL verify the `state` parameter matches the value stored in the HTTP-only cookie.
2. IF the `state` parameter does not match or is absent, THEN THE Callback_Handler SHALL reject the request with a 400 error and redirect to `/settings/connections?error=invalid_state`.
3. WHEN the state is valid, THE Callback_Handler SHALL exchange the `code` for tokens by calling the platform's token endpoint with `client_id`, `client_secret`, `redirect_uri`, and `grant_type=authorization_code`.
4. IF the token exchange fails, THEN THE Callback_Handler SHALL redirect to `/settings/connections?error=token_exchange_failed` and log the error.
5. WHEN the token exchange succeeds, THE Callback_Handler SHALL upsert a record in the Token_Store containing: `platform`, `access_token`, `refresh_token` (if provided), `expires_at`, `scope`, `platform_user_id`, and `platform_username`.
6. WHEN the token is persisted, THE Callback_Handler SHALL redirect to `/settings/connections?connected=<platform>`.
7. THE Token_Store SHALL enforce a unique constraint on `platform` so that only one active connection per platform exists at any time.

### Requirement 4: Token Storage Schema

**User Story:** As a developer, I want a well-structured DB table for OAuth tokens, so that tokens can be reliably stored, retrieved, and refreshed.

#### Acceptance Criteria

1. THE Token_Store SHALL contain the columns: `id` (uuid, primary key), `platform` (text, unique), `access_token` (text, not null), `refresh_token` (text, nullable), `expires_at` (timestamp with timezone, nullable), `scope` (text, nullable), `platform_user_id` (text, nullable), `platform_username` (text, nullable), `created_at` (timestamp), `updated_at` (timestamp).
2. THE Token_Store SHALL be defined as a Drizzle ORM table in `lib/schema.ts` following the existing schema conventions.
3. WHEN a new connection is established for a Platform that already has a record, THE Token_Store SHALL update the existing record rather than insert a duplicate (upsert by `platform`).

### Requirement 5: Token Auto-Refresh

**User Story:** As Eugine, I want my platform tokens to be refreshed automatically before they expire, so that posting never fails due to an expired token.

#### Acceptance Criteria

1. THE Token_Refresher SHALL be invoked by a scheduled cron job at `/api/cron/refresh-tokens` on a daily schedule.
2. WHEN the Token_Refresher runs, THE Token_Refresher SHALL query the Token_Store for all connections where `expires_at` is within 48 hours of the current time.
3. WHEN a connection has a `refresh_token`, THE Token_Refresher SHALL call the platform's token refresh endpoint and update the Token_Store with the new `access_token`, `refresh_token`, and `expires_at`.
4. IF a token refresh fails, THEN THE Token_Refresher SHALL log the error and leave the existing token in place without deleting it.
5. WHEN a Platform_Wrapper requests a token, THE Platform_Wrapper SHALL call a `getToken(platform)` helper that checks if the token expires within 5 minutes and, if a `refresh_token` exists, refreshes it on-demand before returning it.
6. IF no valid token exists in the Token_Store for a Platform, THEN THE Platform_Wrapper SHALL throw a descriptive error indicating the platform is not connected rather than falling back to environment variables.

### Requirement 6: Platform Wrapper Token Migration

**User Story:** As a developer, I want the existing platform API wrappers to read tokens from the DB, so that the OAuth-connected tokens are used for all API calls.

#### Acceptance Criteria

1. THE Platform_Wrapper for each Platform SHALL call `getToken(platform)` from a shared `lib/platforms/token.ts` helper instead of reading from environment variables.
2. THE `lib/platforms/token.ts` helper SHALL export a `getToken(platform: string): Promise<string>` function that retrieves the `access_token` from the Token_Store.
3. WHEN `getToken` is called and the token is expired or expiring within 5 minutes and a `refresh_token` is available, THE `getToken` function SHALL refresh the token before returning it.
4. THE Platform_Wrapper for Instagram SHALL use the token returned by `getToken('instagram')` in place of `process.env.INSTAGRAM_ACCESS_TOKEN`.
5. THE Platform_Wrapper for X SHALL use the token returned by `getToken('x')` in place of the OAuth 1.0a env vars for user-context calls.
6. THE Platform_Wrapper for LinkedIn SHALL use the token returned by `getToken('linkedin')` in place of `process.env.LINKEDIN_ACCESS_TOKEN`.
7. THE Platform_Wrapper for Facebook SHALL use the token returned by `getToken('facebook')` in place of `process.env.FACEBOOK_ACCESS_TOKEN`.
8. THE Platform_Wrapper for TikTok SHALL use the token returned by `getToken('tiktok')` for all API calls.

### Requirement 7: Connection Status API

**User Story:** As a developer, I want a REST endpoint that returns the current connection status for all platforms, so that the Connection_Manager UI can display live data.

#### Acceptance Criteria

1. THE Connection_Manager SHALL expose a `GET /api/connections` endpoint that returns an array of connection status objects for all Platforms.
2. WHEN a Platform is connected, THE `GET /api/connections` response SHALL include: `platform`, `connected: true`, `platform_username`, `expires_at`, `days_until_expiry`, and `scope`.
3. WHEN a Platform is not connected, THE `GET /api/connections` response SHALL include: `platform`, `connected: false`.
4. THE `GET /api/connections` endpoint SHALL NOT return raw `access_token` or `refresh_token` values in the response.
5. THE `DELETE /api/connections/:platform` endpoint SHALL remove the token record for the specified Platform from the Token_Store and return `{ ok: true }`.

### Requirement 8: Security and Access Control

**User Story:** As Eugine, I want the OAuth flow and token endpoints to be protected, so that no one else can connect or disconnect platforms on my behalf.

#### Acceptance Criteria

1. WHEN a request is made to any OAuth or connection endpoint, THE OAuth_Handler SHALL verify the user is authenticated via NextAuth session before proceeding.
2. IF the user is not authenticated, THEN THE OAuth_Handler SHALL redirect to `/login`.
3. THE Callback_Handler SHALL validate the State_Param on every callback request to prevent CSRF attacks.
4. THE Token_Store SHALL store `access_token` and `refresh_token` values as plaintext in the database, relying on Neon's encryption at rest and Vercel's secure environment for `DATABASE_URL`.
5. WHEN the Disconnect action is triggered, THE Connection_Manager SHALL require the user to be authenticated before calling `DELETE /api/connections/:platform`.
