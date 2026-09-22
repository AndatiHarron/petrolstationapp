<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Mail\SupportRequested;
use App\Models\SupportRequest;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * "Get help" from the sign-in screen.
 *
 * Necessarily unauthenticated — the person using it cannot sign in, which is
 * the point — so it is throttled by the route and every request is recorded
 * whether or not the email gets through.
 */
class SupportRequestController extends Controller
{
    public function store(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email', 'max:255'],
            'message' => ['nullable', 'string', 'max:1000'],
        ]);

        // Matched case-insensitively, because someone typing their own address
        // on a phone keyboard will capitalise the first letter about half the
        // time, and an unmatched address makes the owner think the account does
        // not exist.
        $account = User::withoutGlobalScopes()
            ->whereRaw('LOWER(email) = ?', [mb_strtolower($data['email'])])
            ->first();

        $supportRequest = SupportRequest::create([
            'email' => $data['email'],
            'message' => $data['message'] ?? null,
            'user_id' => $account?->id,
            'organization_id' => $account?->organization_id,
            'ip_address' => $request->ip(),
        ]);

        $this->notifyOwners($supportRequest);

        // Deliberately the same answer whether or not the address is known.
        // Saying "no such account" would turn this into a way of testing which
        // email addresses exist on the system.
        return response()->json([
            'message' => 'Thanks — the team has been notified and will get back to you by email.',
        ], 202);
    }

    /**
     * Tell the platform owners, and never fail the request if that does not
     * work.
     *
     * The row is already written by this point. A mail server that is down,
     * misconfigured or not set up at all must not turn into an error on the
     * sign-in screen of somebody who is already stuck.
     */
    private function notifyOwners(SupportRequest $supportRequest): void
    {
        try {
            $owners = User::withoutGlobalScopes()
                ->whereHas('roles', fn ($query) => $query->where('name', 'super-admin'))
                ->pluck('email')
                ->filter()
                ->all();

            if ($owners === []) {
                Log::warning('Support request raised with no super-admin to notify', [
                    'support_request_id' => $supportRequest->id,
                ]);

                return;
            }

            Mail::to($owners)->send(new SupportRequested($supportRequest));

            $supportRequest->update(['notified' => true]);
        } catch (Throwable $exception) {
            // Logged, not surfaced. The request is recorded either way, and an
            // owner can see it in the system.
            Log::error('Could not email a support request', [
                'support_request_id' => $supportRequest->id,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    /**
     * What has been asked, for an owner to work through.
     */
    public function index(Request $request)
    {
        abort_unless($request->user()?->hasRole('super-admin'), 403);

        $requests = SupportRequest::query()
            ->with('user:id,name,email')
            ->latest()
            ->paginate(25);

        $requests->getCollection()->transform(fn (SupportRequest $row) => [
            'id' => $row->id,
            'email' => $row->email,
            'message' => $row->message,
            'account_name' => $row->user?->name,
            'notified' => $row->notified,
            'resolved_at' => $row->resolved_at?->toIso8601String(),
            'created_at' => $row->created_at->toIso8601String(),
        ]);

        return response()->json($requests);
    }
}
