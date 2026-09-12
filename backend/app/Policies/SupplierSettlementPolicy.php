<?php

namespace App\Policies;

use App\Models\SupplierSettlement;
use App\Models\User;

/**
 * Whoever pays records it; an admin approves. Same separation as customer
 * credit: the person releasing money is not the one who confirms it went out.
 */
class SupplierSettlementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin', 'manager']);
    }

    public function view(User $user, SupplierSettlement $settlement): bool
    {
        if ($user->hasAnyRole(['super-admin', 'admin'])) {
            return true;
        }

        if ($user->hasRole('manager')) {
            return $settlement->recorded_by_user_id === $user->getKey()
                || ($user->station_id !== null && $settlement->station_id === $user->station_id);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin', 'manager']);
    }

    public function approve(User $user, SupplierSettlement $settlement): bool
    {
        return $settlement->isPending() && $user->hasAnyRole(['super-admin', 'admin']);
    }

    public function update(User $user, SupplierSettlement $settlement): bool
    {
        return false;
    }

    public function delete(User $user, SupplierSettlement $settlement): bool
    {
        return false;
    }
}
