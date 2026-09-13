<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Turns an organization's `status` from a label into a rule.
 *
 * Setting a tenant inactive used to change nothing: its administrator could
 * still add stations, its managers could still open shifts, and the only thing
 * that moved was a badge on the owner's screen. Suspension is the reversible
 * alternative offered instead of deleting a populated tenant, so it has to
 * actually stop the tenant being served.
 *
 * The platform owner is exempt. They sit in their own organization and need to
 * reach a suspended tenant to put it back into service.
 */
class EnsureOrganizationIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || $user->hasRole('super-admin')) {
            return $next($request);
        }

        $organization = $user->organization;

        // A user with no organization is a configuration problem of its own and
        // is left to the policies, which already require one.
        if ($organization && $organization->status !== 'active') {
            return response()->json([
                // A flag the client can branch on, so it never has to match
                // on the wording of the message.
                'error' => 'organization_suspended',
                'message' => 'This organization has been suspended. Contact your provider.',
            ], 403);
        }

        return $next($request);
    }
}
