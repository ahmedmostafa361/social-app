# Social App API

Express 5 + TypeScript + MongoDB (Mongoose) + Redis.

## Run

```bash
npm install
cp .env.example .env
npm run dev
```

Production: `npm run build && npm start`.

MongoDB and Redis must be running. If Redis is down, the app keeps working (rate limiting and login lockout are skipped with a warning).

## Auth — `/api/auth`

| Method | Path | Description |
| --- | --- | --- |
| POST | `/register` | Create account and email a 6-digit verification code |
| POST | `/verify-account` | Verify email with `{ email, code }` |
| POST | `/resend-verification` | Send a new verification code |
| POST | `/login` | Returns access + refresh token (also set as httpOnly cookies) |
| POST | `/google` | Google sign-in with `{ idToken }` |
| POST | `/refresh-token` | Rotate tokens (body `refreshToken` or cookie). Reusing an old refresh token revokes the session |
| POST | `/logout` | Revoke current session |
| POST | `/logout-all` | Revoke every session |
| GET | `/sessions` | List active sessions |
| DELETE | `/sessions/:sessionId` | Revoke one session |
| POST | `/forgot-password` | Email a password reset code |
| POST | `/reset-password` | `{ email, code, newPassword, confirmPassword }`, revokes all sessions |

## Users — `/api/users`

| Method | Path | Description |
| --- | --- | --- |
| GET / PATCH | `/me` | Get / update own profile |
| GET / PATCH | `/me/settings` | Privacy (`isPrivate`) and `emailNotifications`. Switching to public auto-accepts pending requests |
| PATCH | `/me/password` | Change password, revokes other sessions |
| GET | `/me/followers`, `/me/following` | Own lists |
| DELETE | `/me/followers/:userId` | Remove a follower |
| GET | `/me/follow-requests` | Incoming requests |
| GET | `/me/follow-requests/sent` | Outgoing requests |
| POST | `/me/follow-requests/:userId/accept` | Accept request |
| DELETE | `/me/follow-requests/:userId` | Decline request |
| GET | `/search?q=&page=&limit=` | Search by username |
| GET | `/suggestions?limit=` | People followed by people you follow, then popular users |
| GET | `/username/:userName` | Profile by username |
| GET | `/:userId` | Profile by id |
| GET | `/:userId/followers`, `/:userId/following` | Hidden for private accounts unless you follow them |
| POST / DELETE | `/:userId/follow` | Follow (or request if private) / unfollow (or cancel request) |
