<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use PDO;

/**
 * Write a snapshot of every row to object storage.
 *
 * The hosting platform's own backups sit behind a paid tier, and the database
 * is the one part of this system that cannot be rebuilt — the code comes from
 * git, the container from the image, the photos are already elsewhere. So the
 * application takes its own, into the same object storage the evidence uses,
 * which is a different provider from the database and therefore survives the
 * database being lost entirely.
 *
 * Data only. The schema is recreated by the migrations on any fresh
 * deployment, so what is worth keeping is the rows.
 */
class BackupDatabase extends Command
{
    protected $signature = 'backup:run
                            {--keep=30 : How many snapshots to retain}
                            {--prefix=backups : Where in the bucket to write}';

    protected $description = 'Snapshot every table to object storage';

    public function handle(): int
    {
        $disk = Storage::disk();
        $prefix = trim((string) $this->option('prefix'), '/');

        if (config('filesystems.default') === 'local') {
            $this->error('The default disk is local, so a backup would sit on the same');
            $this->error('container it is meant to outlive. Set FILESYSTEM_DISK first.');

            return self::FAILURE;
        }

        $ordered = $this->tablesInRestoreOrder();

        $payload = [
            'taken_at' => gmdate('c'),
            'database' => DB::getDatabaseName(),
            'driver' => DB::getDriverName(),
            'server_version' => DB::getPdo()->getAttribute(PDO::ATTR_SERVER_VERSION),
            'app_commit' => env('RAILWAY_GIT_COMMIT_SHA'),
            'restore_order' => $ordered,
            'tables' => [],
        ];

        $rows = 0;

        foreach ($ordered as $table) {
            $records = DB::table($table)->get()->map(fn ($r) => (array) $r)->all();
            $payload['tables'][$table] = $records;
            $rows += count($records);
        }

        $payload['row_count'] = $rows;

        $json = json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
        $key = sprintf('%s/%s.json', $prefix, gmdate('Y-m-d\THis\Z'));

        // The disk runs with throw => false, so a failed write returns false
        // rather than raising. A backup that silently did not happen is worse
        // than no backup at all, because it is believed in.
        if ($disk->put($key, $json) === false) {
            $this->error("Could not write {$key}. The snapshot was NOT saved.");

            return self::FAILURE;
        }

        $this->info(sprintf(
            'Saved %s — %d tables, %d rows, %s KB',
            $key,
            count($ordered),
            $rows,
            number_format(strlen($json) / 1024, 1)
        ));

        $this->prune($prefix, (int) $this->option('keep'));

        return self::SUCCESS;
    }

    /**
     * Parents before children, derived from the foreign keys rather than
     * hard-coded, so adding a relation cannot quietly break a restore.
     *
     * @return list<string>
     */
    private function tablesInRestoreOrder(): array
    {
        // Asked through the schema builder rather than with a query against
        // pg_tables, so this works on the sqlite the tests run against as well
        // as the postgres production uses.
        //
        // The listing comes back schema-qualified — "public.shifts" on postgres,
        // "main.shifts" on sqlite — while foreign keys name their parent table
        // bare. Strip the qualifier so the two can be matched, and so the keys
        // in the snapshot are plain table names on either engine.
        $tables = array_values(array_unique(array_map(
            static function (string $name): string {
                $dot = strrpos($name, '.');

                return $dot === false ? $name : substr($name, $dot + 1);
            },
            Schema::getTableListing()
        )));

        sort($tables);

        $deps = array_fill_keys($tables, []);

        foreach ($tables as $table) {
            foreach (Schema::getForeignKeys($table) as $key) {
                $parent = $key['foreign_table'] ?? null;

                // A self-reference imposes no ordering between tables.
                if ($parent !== null && $parent !== $table && array_key_exists($parent, $deps)) {
                    $deps[$table][$parent] = true;
                }
            }
        }

        $ordered = [];
        $placed = [];

        while (count($ordered) < count($tables)) {
            $progress = false;

            foreach ($tables as $table) {
                if (isset($placed[$table])) {
                    continue;
                }

                $waiting = false;

                foreach (array_keys($deps[$table]) as $parent) {
                    if (! isset($placed[$parent]) && array_key_exists($parent, $deps)) {
                        $waiting = true;
                        break;
                    }
                }

                if (! $waiting) {
                    $ordered[] = $table;
                    $placed[$table] = true;
                    $progress = true;
                }
            }

            // A cycle would stop making progress; take the rest as they are
            // rather than looping for ever.
            if (! $progress) {
                foreach ($tables as $table) {
                    if (! isset($placed[$table])) {
                        $ordered[] = $table;
                        $placed[$table] = true;
                    }
                }

                break;
            }
        }

        return $ordered;
    }

    /**
     * Keep the most recent snapshots and remove the rest.
     */
    private function prune(string $prefix, int $keep): void
    {
        if ($keep < 1) {
            return;
        }

        $disk = Storage::disk();

        // The keys are timestamps, so sorting them sorts by age.
        $existing = array_values(array_filter(
            $disk->files($prefix),
            fn (string $f) => str_ends_with($f, '.json')
        ));

        sort($existing);

        $excess = array_slice($existing, 0, max(0, count($existing) - $keep));

        foreach ($excess as $old) {
            $disk->delete($old);
            $this->line("  removed old snapshot {$old}");
        }

        $this->line(sprintf('  %d snapshot(s) retained', min(count($existing), $keep)));
    }
}
