# Backend and Frontend Diagnostic Report

Date: 2026-10-15

## Scope

Audited the Redis/Mongo hold flow, OTP issuance and verification, Razorpay order/client/webhook paths, notification API/UI, and related tests before refactoring.

## Findings before refactoring

### Seat locking and booking concurrency

- The application already uses Redis `SET ... NX PX` slot locks with ownership tokens, sorted multi-key acquisition, watchdog renewal, and compare-token release in `backend/src/lib/redisLock.js`.
- Hold creation acquires the Redis lock, rechecks Mongo occupancy inside a transaction, creates an active `BookingHold`, then releases the short-lived Redis mutex. Persistent occupancy is represented by the Mongo hold and is included in availability queries.
- Hold expiry is handled by BullMQ with a Mongo transaction, and the change-stream watcher is a fallback. This is resilient, but expiry depends on workers/change streams being started in production.
- Confirmed defect: `createHold` accepted `totalAmount` from the client and persisted it. A customer could manipulate the amount sent to the hold endpoint; the payment order then used the manipulated booking total.
- Remaining concurrency risk: the short Redis mutex is released after hold creation; correctness then relies on Mongo transaction conflict/occupancy behavior. This was retained because the current model uses capacity over time ranges rather than one physical seat ID. A production deployment should keep replica-set transactions enabled and monitor transaction conflicts.

### OTP/email verification

- OTPs were cryptographically random and SHA-256 hashed in MongoDB, with constant-time comparison and Redis failed-attempt lockout.
- Confirmed mismatches: implementation generated six digits while the requested contract is four digits; expiry was 15 minutes instead of five minutes; request issuance had no Redis email/IP window limiter on the resend route.
- Failed attempts were rate-limited by email, but request generation needed separate abuse protection.

### Razorpay order and webhook flow

- Order amounts are now sourced from the Mongo booking total in `createRazorpayOrder`; before the fix that booking total could originate from the client-controlled hold amount.
- Webhooks are mounted before `express.json()` and parsed with `express.raw()`. HMAC verification uses the raw Buffer and a timing-safe comparison, so the raw-body requirement is satisfied.
- Confirmed defect: a webhook event was inserted as `received` before processing, and any retry after a process crash was treated as a duplicate and skipped permanently. The refactor retries `received`/`error` records while still returning duplicates for `processed`/`ignored` records.
- Payment confirmation is idempotent through the captured-state short circuit and the existing payment tests cover repeated confirmation.
- The duplicate webhook route in the JSON payment router was removed to leave one authoritative raw-body route.

### Notifications and screenshot bug

- Backend routes correctly scope updates to `recipient: req.user._id` and expose both single and bulk PATCH endpoints.
- The UI optimistically changed state but used clickable `div` rows, had no busy state, and provided no reliable interaction semantics. This made taps/clicks fragile and gave no feedback when the request was blocked or failed.
- Notification rows are now real buttons, single-message actions call the scoped PATCH endpoint, bulk actions are disabled while in flight, and failed optimistic updates revert with an error notification.

## Changes implemented

- `backend/src/utils/otp.js`: four-digit secure OTP generation and Redis request limits of three per email and three per IP per ten minutes.
- `backend/src/controllers/user.controller.js`: five-minute OTP expiry and rate-limit checks for registration, resend, and unverified-login reissue paths.
- `backend/src/schemas/user.schema.js`: four-digit verification validation.
- `frontend/src/pages/VerifyEmailPage.jsx`: four input cells, four-digit validation, five-minute countdown, and updated copy.
- `backend/src/services/hold.service.js`: ignores client `totalAmount` and persists only the server-calculated service total.
- `backend/src/controllers/payment.controller.js`: recoverable webhook deduplication for interrupted `received`/`error` events.
- `backend/src/routes/payment.routes.js`: removes the duplicate JSON webhook route.
- `frontend/src/components/navPage.jsx`: reliable notification single/bulk actions and semantic buttons.
- `backend/tests/phase1.security.test.js`: updates the OTP contract test to four digits.

## Verification performed

- `node --check` passed for the changed backend JavaScript modules.
- Frontend targeted ESLint passed with zero errors; three existing hook-dependency warnings remain.
- `npm.cmd test -- tests/phase1.security.test.js --runInBand --detectOpenHandles`: passed, 3 tests.
- `npm.cmd test -- tests/payment.test.js tests/api.booking.test.js --runInBand --detectOpenHandles`: passed, 11 tests.

## Remaining risks and required deployment checks

- Full backend suite previously exceeded the local 120-second timeout; run it in CI or with a longer timeout.
- Frontend production build is still blocked by the existing OneDrive `frontend/vite.config.js` reparse-point access error.
- Configure `RAZORPAY_WEBHOOK_SECRET`, Redis, Mongo replica-set transactions, and mail credentials in production; never rely on test fallbacks.
- Add an integration test using a raw signed webhook body and a duplicate/retry sequence against a test Mongo instance.
- Browser-test notification actions against the deployed API, including expired sessions and a failed PATCH, because the screenshot was supplied without a live browser session.
