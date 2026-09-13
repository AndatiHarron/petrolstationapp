<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        // Behind a hosting platform's load balancer, TLS is terminated before
        // the request reaches PHP — so without this Laravel sees plain HTTP.
        // It would then generate http:// URLs and, with
        // SESSION_SECURE_COOKIE=true, decline to send the session cookie back,
        // which shows up as an endless redirect loop on the /admin login.
        // The proxy is the platform's own and its address is not fixed, hence '*'.
        $middleware->trustProxies(at: '*');

        $middleware->alias([
            'organization.active' => \App\Http\Middleware\EnsureOrganizationIsActive::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
