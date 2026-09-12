<?php

namespace App\Policies;

use App\Models\CreditSettlement;
use App\Models\User;

/**
 * Managers record settlements; admins approve them.
 *
 * A manager deliberately cannot approve — including their own. That separation
 * is the reason this workflow exists rather than letting whoever takes the cash
 * write the balance down directly.
 */
class CreditSettlementPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin', 'manager']);
    }

    public function view(User $user, CreditSettlement $settlement): bool
    {
        if ($user->hasAnyRole(['super-admin', 'admin'])) {
            return true;
        }

        if ($user->hasRole('manager')) {
            // Their own, or anything at their station.
            return $settlement->recorded_by_user_id === $user->getKey()
                || ($user->station_id !== null && $settlement->station_id === $user->station_id);
        }

        return false;
    }

    public function create(User $user): bool
    {
        return $user->hasAnyRole(['super-admin', 'admin', 'manager']);
    }

    public function approve(User $user, CreditSettlement $settlement): bool
    {
        return $settlement->isPending() && $user->hasAnyRole(['super-admin', 'admin']);
    }

    public function update(User $user, CreditSettlement $settlement): bool
    {
        return false;
    }

    public function delete(User $user, CreditSettlement $settlement): bool
    {
        return false;
    }
}
