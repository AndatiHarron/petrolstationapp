<?php

namespace App\Policies;

use App\Models\Lifting;
use App\Models\User;

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

        if ($user->hasRole('manager')) {
            return $user->organization_id === $lifting->organization_id
                && $user->station_id === $lifting->station_id;
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
        if ($user->hasRole('super-admin')) {
            return true;
        }

        if ($user->hasRole('admin')) {
            return $user->organization_id === $lifting->organization_id;
        }

        if ($user->hasRole('manager')) {
            if ($user->organization_id !== $lifting->organization_id || $user->station_id !== $lifting->station_id) {
                return false;
            }

            // Managers can only update recent liftings (<= 24 hours)
            return $lifting->created_at->diffInHours(now()) <= 24;
        }

        return false;
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Lifting $lifting): bool
    {
        // Per "No Deletions" requirement, only super-admins and admins (heads of organization) may perform deletes (soft deletes only)
        if ($user->hasRole('super-admin')) {
            return true;
        }

        return $user->hasRole('admin') && $user->organization_id === $lifting->organization_id;
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
