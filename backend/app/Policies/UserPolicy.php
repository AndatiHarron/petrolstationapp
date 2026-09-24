<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin']);
    }

    public function view(User $user, User $model): bool
    {
        if ($user->hasRole('super-admin')) {
            return true;
        }

        return $user->hasRole('admin') && $user->organization_id === $model->organization_id;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin']);
    }

    /**
     * An owner runs their own staff.
     *
     * They could already create a person with a role; being unable to change
     * one afterwards meant a supervisor who moved station, or was promoted, had
     * to be deleted and re-created. The limits that matter are the other two:
     * an account outside their organization is none of their business, and a
     * platform administrator's account is above them — the roles they may hand
     * out are filtered separately, so they cannot promote anyone past
     * themselves either.
     */
    public function update(User $user, User $model): bool
    {
        if ($user->hasRole('super-admin')) {
            return true;
        }

        return $user->hasRole('admin')
            && $user->organization_id !== null
            && $user->organization_id === $model->organization_id
            && ! $model->hasRole('super-admin');
    }

    public function delete(User $user, User $model): bool
    {
        // Nobody removes their own account. It is never what was meant, and it
        // locks the organization out of the panel that would undo it.
        if ($user->getKey() === $model->getKey()) {
            return false;
        }

        if ($user->hasRole('super-admin')) {
            return true;
        }

        return $user->hasRole('admin')
            && $user->organization_id !== null
            && $user->organization_id === $model->organization_id
            && ! $model->hasRole('super-admin');
    }
}
