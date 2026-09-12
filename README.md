# Petrol Station App

Multi-tenant fuel-station integrity system. Reconciles each shift's pump-meter
readings against cash collected and tank dip readings, so missing fuel and
missing money surface the moment a shift is closed.

| Directory | What it is |
|---|---|
| [`backend/`](backend) | Laravel 12 API and Filament admin panel (PHP 8.5, PostgreSQL) |
| [`frontend/`](frontend) | Expo / React Native app for station managers and admins |

Each directory keeps its own README, dependencies and test suite; see those for
setup. The two were previously separate repositories and their full commit
history is preserved here.
