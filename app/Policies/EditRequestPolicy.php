<?php

namespace App\Policies;

use App\Models\EditRequest;
use App\Models\User;

class EditRequestPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true; // Filtered in controller
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, EditRequest $editRequest): bool
    {
        return $user->organization_id === $editRequest->organization_id &&
               ($user->hasAnyRole(['admin', 'super-admin']) || $user->id === $editRequest->user_id);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, EditRequest $editRequest): bool
    {
        return $user->organization_id === $editRequest->organization_id &&
               $user->hasAnyRole(['admin', 'super-admin']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, EditRequest $editRequest): bool
    {
        return $user->organization_id === $editRequest->organization_id &&
               $user->hasAnyRole(['admin', 'super-admin']);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, EditRequest $editRequest): bool
    {
        return false;
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, EditRequest $editRequest): bool
    {
        return false;
    }
}
