<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\FiltersByStation;
use App\Http\Controllers\Controller;
use App\Http\Resources\AuditLogResource;
use App\Models\Nozzle;
use App\Models\Shift;
use App\Models\Tank;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Spatie\Activitylog\Models\Activity;

class AuditLogController extends Controller
{
    use FiltersByStation;

    /**
     * Models reachable from an activity's subject that belong to a station.
     *
     * @var list<class-string>
     */
    private const STATION_SUBJECTS = [Shift::class, Tank::class, Nozzle::class];

    /**
     * Display audit logs according to the user role
     */
    public function index(Request $request)
    {
        $query = Activity::with(['causer', 'subject'])->latest();
        $user = $request->user();

        // What the caller is entitled to see at all.
        if ($user->hasRole('manager') && $user->station_id) {
            $this->scopeToStation($query, $user->station_id);
        } elseif (! $user->hasRole('super-admin')) {
            $this->scopeToOrganization($query, $user->organization_id);
        }

        // An administrator narrowing to one station. Applied on top of the
        // entitlement above rather than instead of it, so choosing a station
        // can only ever subtract from what is already visible.
        $query->when(
            $this->requestedStationId($request),
            fn (Builder $q, string $stationId) => $this->scopeToStation($q, $stationId)
        );

        return AuditLogResource::collection($query->paginate(20));
    }

    /**
     * Display a specific audit log
     */
    public function show(Request $request, Activity $activity)
    {
        $user = $request->user();

        if ($user->hasRole('super-admin')) {
            return new AuditLogResource($activity->load(['causer', 'subject']));
        }

        $query = Activity::where('id', $activity->id);

        // Deliberately not narrowed by the station filter: this is an
        // entitlement check on one record, and an administrator who is
        // currently looking at one station is still entitled to open an entry
        // belonging to another.
        if ($user->hasRole('manager') && $user->station_id) {
            $this->scopeToStation($query, $user->station_id);
        } else {
            $this->scopeToOrganization($query, $user->organization_id);
        }

        $authorizedActivity = $query->first();

        if (! $authorizedActivity) {
            abort(403);
        }

        return new AuditLogResource($authorizedActivity->load(['causer', 'subject']));
    }

    /**
     * Narrow to entries either made by someone at the station, or about
     * something that belongs to it.
     *
     * An activity row carries no station column — it points at a causer and a
     * subject — so the station has to be reached through both. Wrapped in its
     * own `where` closure so the causer/subject alternatives stay grouped and
     * cannot leak past an `and` applied alongside them.
     */
    private function scopeToStation(Builder $query, string $stationId): Builder
    {
        return $query->where(function (Builder $q) use ($stationId) {
            $q->whereHasMorph(
                'causer',
                [User::class],
                fn (Builder $sub) => $sub->where('station_id', $stationId)
            );

            $q->orWhereHasMorph(
                'subject',
                self::STATION_SUBJECTS,
                fn (Builder $sub) => $sub->where('station_id', $stationId)
            );
        });
    }

    /**
     * The same reach, one level wider: the caller's own tenant.
     */
    private function scopeToOrganization(Builder $query, string $orgId): Builder
    {
        return $query->where(function (Builder $q) use ($orgId) {
            $q->whereHasMorph(
                'causer',
                [User::class],
                fn (Builder $sub) => $sub->where('organization_id', $orgId)
            );

            $q->orWhereHasMorph(
                'subject',
                self::STATION_SUBJECTS,
                fn (Builder $sub) => $sub->where('organization_id', $orgId)
            );
        });
    }
}
