# Auth Service

The auth service owns user authentication and account security for Dedicate. It issues JWTs, manages refresh flow, handles TOTP MFA, and tracks trusted devices.

## Responsibilities

- Registration and login
- Access and refresh token issuance
- MFA setup, verification, and disable flows
- Trusted-device lifecycle
- Auth-side account deletion and user lifecycle events

All routes are served under `/auth/**` through the gateway.

## Local Workflow

The easiest way to run this service is through the root compose stack in `ops/local/`.

Useful standalone commands from this directory:

```bash
./gradlew test
./gradlew bootRun
```

`bootRun` expects the required Spring environment to be available, so most day-to-day development is simpler through Docker Compose.
