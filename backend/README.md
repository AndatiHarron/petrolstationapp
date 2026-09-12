# Petrol Integrity System

Petrol Integrity System is a multi-tenant Laravel 12 application for fuel station operations. It reconciles shift sales against meter readings and tank dips, tracks cash and stock variance, and surfaces tax liability through a Filament 5 admin panel and a Sanctum-protected API for mobile workflows.

## Key Features

- Shift lifecycle management (OPEN to LOCKED to APPROVED) with reconciliation logic for expected cash, variance, and tax.
- Meter reading capture per nozzle, tank dip readings, and automatic tank/nozzle updates.
- Payments split by cash, M-Pesa, and credit sales with customer and vehicle tracking.
- Inventory liftings with VAT paid, total cost calculation, and tank destination.
- Role-based access (admin and manager) with organization scoping and station-level visibility.
- PDF shift reports and Filament dashboards for variance trends and tax liability.

## Tech Stack

- Laravel 12, PHP 8.5.1
- Filament 5 admin panel
- Laravel Sanctum for API auth
- spatie/laravel-permission and spatie/laravel-activitylog
- DomPDF for shift reports
- Flowframe Trend for dashboard charts

## Project Structure

- `app/Services/ShiftReconciliationService.php` handles meter, dip, and payment reconciliation.
- `app/Filament/Resources` defines admin CRUD for stations, tanks, products, shifts, customers, and more.
- `app/Filament/Widgets` includes variance trend and tax liability widgets.
- `routes/api.php` exposes the mobile shift API.
- `resources/views/reports/shift-summary.blade.php` is the PDF report template.

## Local Setup

Prereqs: PHP 8.2, Composer, Node.js, SQLite or your preferred DB.

```bash
composer run setup
```

This script installs dependencies, sets up `.env`, runs migrations, installs Node packages, and builds assets.

If you want explicit steps instead:

```bash
composer install
copy .env.example .env
php artisan key:generate
php artisan migrate
npm install
npm run build
```

For meter evidence uploads, ensure the public disk is linked:

```bash
php artisan storage:link
```

## Development

Run the stack (app server, queue listener, and Vite) via:

```bash
composer run dev
```

The admin panel is available at `/admin`.

## Seeding Demo Data

```bash
php artisan db:seed --class=RolesAndPermissionsSeeder
php artisan db:seed --class=DevSeeder
```

The dev seeder provisions an organization, station, sample product, tank, nozzle, and two users:

- admin: `admin@octane.com` / `password`
- manager: `manager@octane.com` / `password`

## API (Sanctum)

All mobile endpoints live under `/api` and require a Bearer token unless stated.

- `POST /api/login` returns a Sanctum token.
- `GET /api/v1/shifts/current` returns the active shift for the authenticated user.
- `POST /api/v1/shifts/start` opens a new shift if one is not already open.
- `POST /api/v1/shifts/{shift}/lock` locks and reconciles a shift.

`/api/v1/shifts/{shift}/lock` accepts:

- `meters`: list of nozzle readings (with optional evidence image uploads).
- `dips`: list of tank dip measurements.
- `payments`: cash, mpesa, and credit sales.

## Reports

Shift PDFs are available at `/admin/shifts/{shift}/report` for authenticated users in the same organization.

## Testing

```bash
composer test
```

## Notes

- Default database is SQLite via `database/database.sqlite`.
- Queue, cache, and sessions use the database driver by default.
