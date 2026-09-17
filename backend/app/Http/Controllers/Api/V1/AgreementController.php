<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\AgreementAcceptance;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class AgreementController extends Controller
{
    /**
     * The terms, and whether this caller still has to decide.
     */
    public function show(Request $request): JsonResponse
    {
        $user = $request->user();

        return response()->json([
            'data' => [
                'version' => config('agreement.version'),
                'effective_date' => config('agreement.effective_date'),
                'title' => config('agreement.title'),
                'intro' => config('agreement.intro'),
                'sections' => config('agreement.sections'),
                'applies_to_me' => AgreementAcceptance::appliesTo($user),
                'accepted' => AgreementAcceptance::currentlyAcceptedBy($user),
                // Sent with the terms, not on decline: the client has to be
                // able to tell someone who it is they should contact even if
                // the decline request itself fails.
                'distributor' => config('agreement.distributor'),
                'decline_title' => config('agreement.decline_title'),
                'decline_message' => config('agreement.decline_message'),
            ],
        ]);
    }

    /**
     * Record acceptance.
     *
     * Idempotent: accepting twice is one acceptance, so a retried request or a
     * double tap cannot produce two records of the same decision.
     */
    public function accept(Request $request): JsonResponse
    {
        $user = $request->user();

        if (! AgreementAcceptance::appliesTo($user)) {
            return response()->json([
                'error' => 'agreement_not_applicable',
                'message' => 'These terms do not apply to this account.',
            ], 422);
        }

        $record = DB::transaction(function () use ($request, $user) {
            $existing = AgreementAcceptance::query()
                ->where('user_id', $user->getKey())
                ->where('version', config('agreement.version'))
                ->where('action', AgreementAcceptance::ACCEPTED)
                ->lockForUpdate()
                ->first();

            if ($existing) {
                return $existing;
            }

            return AgreementAcceptance::create([
                'user_id' => $user->getKey(),
                'user_email' => $user->email,
                'organization_id' => $user->organization_id,
                'version' => config('agreement.version'),
                'action' => AgreementAcceptance::ACCEPTED,
                'decided_at' => now(),
                'ip_address' => $request->ip(),
                'user_agent' => substr((string) $request->userAgent(), 0, 1000),
            ]);
        });

        return response()->json([
            'data' => [
                'version' => $record->version,
                'accepted_at' => $record->decided_at->toIso8601String(),
                'accepted' => true,
            ],
        ]);
    }

    /**
     * Record a refusal, then end the session.
     *
     * The refusal is kept because it is as much a fact as an acceptance, and
     * because it explains why an account that exists has never been used. The
     * tokens go so that refusing actually stops access rather than leaving a
     * valid token in the client's hands.
     */
    public function decline(Request $request): JsonResponse
    {
        $user = $request->user();

        AgreementAcceptance::create([
            'user_id' => $user->getKey(),
            'user_email' => $user->email,
            'organization_id' => $user->organization_id,
            'version' => config('agreement.version'),
            'action' => AgreementAcceptance::DECLINED,
            'decided_at' => now(),
            'ip_address' => $request->ip(),
            'user_agent' => substr((string) $request->userAgent(), 0, 1000),
        ]);

        $user->tokens()->delete();

        return response()->json([
            'data' => [
                'version' => config('agreement.version'),
                'accepted' => false,
                'signed_out' => true,
                'distributor' => config('agreement.distributor'),
            ],
            'title' => config('agreement.decline_title'),
            'message' => config('agreement.decline_message'),
        ]);
    }

    /**
     * Who has decided what — for the owner's records.
     */
    public function index(Request $request): JsonResponse
    {
        if (! Auth::user()->hasRole('super-admin')) {
            return response()->json([
                'error' => 'forbidden',
                'message' => 'Only the platform owner may read the acceptance log.',
            ], 403);
        }

        $rows = AgreementAcceptance::query()
            ->orderByDesc('decided_at')
            ->limit(500)
            ->get()
            ->map(fn (AgreementAcceptance $a) => [
                'user_email' => $a->user_email,
                'version' => $a->version,
                'action' => $a->action,
                'decided_at' => $a->decided_at->toIso8601String(),
                'ip_address' => $a->ip_address,
            ]);

        return response()->json(['data' => $rows]);
    }
}
