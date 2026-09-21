<?php

namespace App\Providers;

use App\Models\LedgerEntry;
use App\Policies\LedgerPolicy;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\URL;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        // Telescope is a debugging tool: it writes rows on every request and serves
        // a browsable history UI. Registering it only outside production keeps it out
        // of the deployed app entirely, rather than relying on a config flag alone.
        if (! $this->app->environment('production')) {
            $this->app->register(TelescopeServiceProvider::class);
        }
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        if ($this->app->environment('production')) {
            URL::forceScheme('https');
        }

        // Registered by hand: policy auto-discovery pairs App\Models\X with
        // App\Policies\XPolicy, and the ledger's policy covers the whole module
        // rather than one model of that name.
        Gate::policy(LedgerEntry::class, LedgerPolicy::class);
    }
}
