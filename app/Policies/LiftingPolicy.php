<?php

namespace App\Policies;

use App\Models\Lifting;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class LiftingPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Lifting $lifting): bool
    {
        if ($user->hasRole('super-admin')) {
            return true;
        }
        return $user->organization_id === $lifting->organization_id;
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['manager', 'admin', 'super-admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Lifting $lifting): bool
    {
        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Lifting $lifting): bool
    {
        if ($user->hasRole('super-admin')) {
            return true;
        }

        // Prevent Managers from deleting OLD liftings (e.g., older than 24 hours)
        // to prevent fraud/manipulation of past records.
        if ($user->hasRole('manager')) {
            if ($lifting->created_at->diffInHours(now()) > 24) {
                return false;
            }
        }

        return $user->organization_id === $lifting->organization_id;
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Lifting $lifting): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Lifting $lifting): bool
    {
        return false;
    }
}
