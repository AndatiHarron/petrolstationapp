<?php

namespace App\Http\Controllers\Api\V1;

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
    /**
     * Display audit logs according to the user role
     */
    public function index(Request $request)
    {
        $query = Activity::with(['causer', 'subject'])->latest();
        $user = $request->user();

        if ($user->hasRole('super-admin')) {
            return AuditLogResource::collection($query->paginate(20));
        }

        if ($user->hasRole('manager') && $user->station_id) {
            $stationId = $user->station_id;

            $query->where(function (Builder $q) use ($stationId) {
                $q->whereHasMorph('causer', [User::class], function ($subQ) use ($stationId) {
                    $subQ->where('station_id', $stationId);
                });

                $q->orWhereHasMorph(
                    'subject',
                    [Shift::class, Tank::class, Nozzle::class], // Add models that have 'station_id'
                    function ($subQ) use ($stationId) {
                        $subQ->where('station_id', $stationId);
                    }
                );
            });

            return AuditLogResource::collection($query->paginate(20));
        }

        $orgId = $user->organization_id;

        $query->where(function (Builder $q) use ($orgId) {
            $q->whereHasMorph('causer', [User::class], function ($subQ) use ($orgId) {
                $subQ->where('organization_id', $orgId);
            });

            $q->orWhereHasMorph(
                'subject',
                [Shift::class, Tank::class, Nozzle::class],
                function ($subQ) use ($orgId) {
                    $subQ->where('organization_id', $orgId);
                }
            );
        });

        return AuditLogResource::collection(
            $query->paginate(20)
        );
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

        if ($user->hasRole('manager') && $user->station_id) {
            $stationId = $user->station_id;

            $query->where(function (Builder $q) use ($stationId) {
                $q->whereHasMorph('causer', [User::class], function ($subQ) use ($stationId) {
                    $subQ->where('station_id', $stationId);
                });

                $q->orWhereHasMorph(
                    'subject',
                    [Shift::class, Tank::class, Nozzle::class],
                    function ($subQ) use ($stationId) {
                        $subQ->where('station_id', $stationId);
                    }
                );
            });
        } else {
            $orgId = $user->organization_id;

            $query->where(function (Builder $q) use ($orgId) {
                $q->whereHasMorph('causer', [User::class], function ($subQ) use ($orgId) {
                    $subQ->where('organization_id', $orgId);
                });

                $q->orWhereHasMorph(
                    'subject',
                    [Shift::class, Tank::class, Nozzle::class],
                    function ($subQ) use ($orgId) {
                        $subQ->where('organization_id', $orgId);
                    }
                );
            });
        }

        $authorizedActivity = $query->first();

        if (! $authorizedActivity) {
            abort(403);
        }

        return new AuditLogResource($authorizedActivity->load(['causer', 'subject']));
    }
}
