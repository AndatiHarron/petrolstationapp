<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Every query in the application is rewritten by OrganizationScope to include
 * `where organization_id = ?`. These six tables carried the column without an
 * index, so each of those queries degrades into a full table scan as data grows.
 * The remaining tenant-scoped tables were already indexed.
 */
return new class extends Migration
{
    /**
     * @var list<string>
     */
    private array $tables = [
        'credit_sales',
        'liftings',
        'invoices',
        'edit_requests',
        'suppliers',
        'users',
    ];

    public function up(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table) || ! Schema::hasColumn($table, 'organization_id')) {
                continue;
            }

            if ($this->hasIndex($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table): void {
                $blueprint->index('organization_id', $this->indexName($table));
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $table) {
            if (! Schema::hasTable($table) || ! $this->hasIndex($table)) {
                continue;
            }

            Schema::table($table, function (Blueprint $blueprint) use ($table): void {
                $blueprint->dropIndex($this->indexName($table));
            });
        }
    }

    private function indexName(string $table): string
    {
        return "{$table}_organization_id_index";
    }

    private function hasIndex(string $table): bool
    {
        return collect(Schema::getIndexes($table))
            ->contains(fn (array $index): bool => $index['name'] === $this->indexName($table));
    }
};
