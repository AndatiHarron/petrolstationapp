<?php

namespace App\Http\Middleware;

use App\Models\AgreementAcceptance;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Stops an administrator using the system until they have accepted the terms.
 *
 * Enforced on the server rather than by the client hiding a screen: a client
 * check is a courtesy, and anything that only the client enforces is not
 * enforced at all. The API refuses, so the terms are a condition of access
 * however the request arrives.
 */
class EnsureAgreementAccepted
{
    /**
     * Reachable without having accepted — otherwise an administrator could
     * neither read the terms nor act on them.
     *
     * @var list<string>
     */
    private const ALWAYS_ALLOWED = [
        'api/v1/agreement',
        'api/v1/agreement/accept',
        'api/v1/agreement/decline',
        'api/v1/user',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user) {
            return $next($request);
        }

        if (in_array($request->path(), self::ALWAYS_ALLOWED, true)) {
            return $next($request);
        }

        // Deliberately conditioned on the environment as well as the flag: a
        // misconfigured variable in production must not be able to switch a
        // legal gate off.
        if (! config('agreement.enforce', true) && app()->environment('testing')) {
            return $next($request);
        }

        if (! AgreementAcceptance::appliesTo($user)) {
            return $next($request);
        }

        if (AgreementAcceptance::currentlyAcceptedBy($user)) {
            return $next($request);
        }

        // A flag the client branches on, so it never has to match on wording.
        return response()->json([
            'error' => 'agreement_required',
            'message' => 'The Administrator Agreement must be accepted before the system can be used.',
            'agreement_version' => config('agreement.version'),
        ], 403);
    }
}
