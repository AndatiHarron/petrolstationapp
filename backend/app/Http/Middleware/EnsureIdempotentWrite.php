<?php

namespace App\Http\Middleware;

use App\Models\IdempotencyKey;
use Closure;
use Illuminate\Database\QueryException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Makes a replayed write harmless.
 *
 * A station with no signal queues its writes on the device. When the connection
 * returns they are sent, and the request that has to be survivable is not the
 * one that fails — it is the one that succeeded on the server and whose response
 * never made it back. The device cannot tell those apart, so it retries, and
 * without this that retry locks the same shift twice.
 *
 * The client sends `Idempotency-Key`: a UUID generated once for an intended
 * action and reused for every attempt at it. The first attempt does the work and
 * its response is kept; later attempts are handed that stored response.
 *
 * Requests with no key behave exactly as before, so nothing existing changes.
 */
class EnsureIdempotentWrite
{
    /** How long a stored response stays replayable. */
    private const RETENTION_HOURS = 72;

    public function handle(Request $request, Closure $next): Response
    {
        $key = $request->header('Idempotency-Key');

        if (! $key || ! Auth::check() || ! $request->isMethod('POST')) {
            return $next($request);
        }

        $userId = Auth::id();
        $hash = hash('sha256', $request->getContent() ?: json_encode($request->all()));

        $existing = IdempotencyKey::query()
            ->where('user_id', $userId)
            ->where('key', $key)
            ->first();

        if ($existing) {
            // The same key with a different body is a client bug. Answering it
            // with the stored response would quietly discard whatever the caller
            // actually meant to send, so it is refused instead.
            if ($existing->request_hash !== $hash) {
                return response()->json([
                    'message' => 'This idempotency key was already used for a different request.',
                ], 422);
            }

            if ($existing->status === IdempotencyKey::STATUS_COMPLETED) {
                return response(
                    $existing->response_body,
                    $existing->response_status ?? 200
                )->header('Content-Type', 'application/json')
                    ->header('Idempotent-Replay', 'true');
            }

            // The original is still running. Telling the client to come back is
            // better than starting a second run of the same work.
            return response()->json([
                'message' => 'This request is already being processed. Retry shortly.',
            ], 409);
        }

        try {
            $record = IdempotencyKey::create([
                'user_id' => $userId,
                'organization_id' => Auth::user()->organization_id,
                'key' => $key,
                'method' => $request->method(),
                'path' => $request->path(),
                'request_hash' => $hash,
                'status' => IdempotencyKey::STATUS_PROCESSING,
            ]);
        } catch (QueryException) {
            // Two retries arrived at once and the other won the unique index.
            return response()->json([
                'message' => 'This request is already being processed. Retry shortly.',
            ], 409);
        }

        $response = $next($request);

        // Only a success is worth replaying. A failure should be allowed to be
        // retried properly rather than having its error frozen in place.
        if ($response->getStatusCode() < 400) {
            $record->update([
                'status' => IdempotencyKey::STATUS_COMPLETED,
                'response_status' => $response->getStatusCode(),
                'response_body' => $response->getContent(),
            ]);
        } else {
            $record->delete();
        }

        $this->prune();

        return $response;
    }

    /**
     * Drop keys older than the retention window.
     *
     * Done here, occasionally, rather than as a scheduled job: this table only
     * grows when writes happen, so the writes themselves are the right moment to
     * trim it, and one in fifty requests is often enough to keep it small.
     */
    private function prune(): void
    {
        if (random_int(1, 50) !== 1) {
            return;
        }

        IdempotencyKey::where('created_at', '<', now()->subHours(self::RETENTION_HOURS))->delete();
    }
}
