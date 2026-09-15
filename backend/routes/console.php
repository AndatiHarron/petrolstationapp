<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// The database is the only part of this system that cannot be rebuilt from
// something else, and the platform's own backups sit behind a paid tier. This
// writes a snapshot to object storage — a different provider from the database,
// so it survives the database being lost outright.
//
// 02:00 UTC is chosen to fall outside any trading shift. onOneServer means a
// second instance, if one is ever added, will not duplicate the work.
Schedule::command('backup:run')
    ->dailyAt('02:00')
    ->onOneServer()
    ->withoutOverlapping()
    ->description('Snapshot the database to object storage');
