<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Concerns\FiltersByStation;
use App\Http\Controllers\Controller;
use App\Http\Requests\StoreUserRequest;
use App\Http\Resources\UserResource;
use App\Models\Station;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Gate;
use Illuminate\Support\Facades\Hash;

class UserController extends Controller
{
    use FiltersByStation;

    public function index(Request $request)
    {
        Gate::authorize('viewAny', User::class);

        // The organization scope already limits this to the caller's tenant.
        // The platform owner's account is held out on top of that: it belongs
        // to an organization like any other row, so without this it would show
        // up to an administrator of that one organization.
        $users = User::with(['organization', 'station'])
            ->unless(
                $request->user()?->hasRole('super-admin'),
                fn ($query) => $query->whereDoesntHave(
                    'roles',
                    fn ($roles) => $roles->where('name', 'super-admin')
                )
            )
            // An administrator narrowing the staff list to one station.
            ->when(
                $this->requestedStationId($request),
                fn ($query, $stationId) => $query->where('station_id', $stationId)
            )
            ->latest()
            ->paginate(20);

        return UserResource::collection($users);
    }

    public function store(StoreUserRequest $request)
    {
        Gate::authorize('create', User::class);

        $data = $request->validated();
        $user = $request->user();

        if ($user->hasRole('admin')) {
            $data['organization_id'] = $user->organization_id;

            if (isset($data['station_id'])) {
                $station = Station::find($data['station_id']);
                if (! $station || $station->organization_id !== $user->organization_id) {
                    abort(403, 'Unauthorized station for this organization.');
                }
            }
        }

        $newUser = User::create([
            'name' => $data['name'],
            'email' => $data['email'],
            'password' => Hash::make($data['password']),
            'organization_id' => $data['organization_id'] ?? null,
            'station_id' => $data['station_id'] ?? null,
        ]);

        $newUser->assignRole($data['role']);

        return new UserResource($newUser);
    }

    public function show(User $user)
    {
        Gate::authorize('view', $user);

        $user->load(['organization', 'station']);

        return new UserResource($user);
    }
}
