# Petrol Integrity System App

Expo (React Native) app for managing petrol station operations with an emphasis on shift integrity.

## Tech stack

- Expo + React Native
- Expo Router
- TanStack Query + TanStack React Form
- Zustand
- NativeWind
- Orval-generated API client (see `features/api/`)

## Getting started

### Prerequisites

- Node.js + pnpm
- Expo Go on your device (recommended), or Android Studio / Xcode simulators

### Install

```bash
pnpm install
```

### Run

```bash
pnpm start
```

Platform shortcuts:

```bash
pnpm ios
pnpm android
pnpm web
```

## Project structure (high level)

- `app/`: routes (Expo Router)
  - `app/(auth)/login.tsx`: login screen
  - `app/(main)/`: main dashboard stack
  - `app/(station-manager)/`: station manager tab routes
  - `app/admin/`: admin tab routes
  - `app/super-admin/`: super admin routes
- `components/`: UI + feature components
- `store/`: Zustand stores (e.g. auth)
- `features/api/`: API client + models

## Scripts

- `pnpm lint`: run eslint + prettier check
- `pnpm format`: autofix eslint + prettier

## Notes / product backlog

See `notes.md`.

