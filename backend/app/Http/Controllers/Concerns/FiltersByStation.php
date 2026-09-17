<?php

namespace App\Http\Controllers\Concerns;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;

/**
 * Lets an administrator narrow a listing to one station.
 *
 * The rule is in a trait rather than repeated in each controller because it
 * is a rule about authority, and one controller quietly disagreeing with the
 * others is how a manager ends up reading a station that is not theirs.
 *
 * It deliberately behaves the same way as `ReportFilterRequest`, which
 * already governs `station_id` on the report endpoints: an unusable value is
 * refused with a 422 rather than silently ignored. Silently ignoring it would
 * answer a mistyped or unauthorised id with an empty list, which reads as
 * "this station has no trading" — the one conclusion that must never be
 * reached by accident.
 */
trait FiltersByStation
{
    /**
     * The station the caller has asked to be shown, or null for all of them.
     *
     * A manager is answered null. Their own station is already forced onto
     * the query by each controller, and asking for any other is refused
     * above, so the filter is only ever a narrowing available to those who
     * can already see everything.
     *
     * @throws \Illuminate\Validation\ValidationException
     */
    protected function requestedStationId(Request $request): ?string
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        $validated = Validator::make(
            $request->only('station_id'),
            [
                'station_id' => [
                    'nullable',
                    'uuid',
                    // Scoped to the caller's own organization, so a valid id
                    // from another tenant is refused rather than quietly
                    // matching nothing. The platform owner is exempt because
                    // their whole purpose is to look across tenants.
                    $user->hasRole('super-admin')
                        ? Rule::exists('stations', 'id')
                        : Rule::exists('stations', 'id')->where(
                            fn ($query) => $query->where('organization_id', $user->organization_id)
                        ),
                ],
            ],
            [
                'station_id.exists' => 'That station does not belong to your organization.',
            ]
        )->validate();

        $stationId = $validated['station_id'] ?? null;

        if ($user->hasRole('manager') && $user->station_id) {
            // Asking for somebody else's station is an error, not something to
            // be quietly rewritten to their own.
            if ($stationId !== null && $stationId !== $user->station_id) {
                Validator::make([], [])->after(function ($validator) {
                    $validator->errors()->add(
                        'station_id',
                        'You can only view your assigned station.'
                    );
                })->validate();
            }

            return null;
        }

        return $stationId;
    }
}
