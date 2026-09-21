<?php

namespace App\Policies;

use App\Models\User;

/**
 * Who may read the books.
 *
 * The ledger shows margins, supplier terms and what every customer owes — the
 * commercial picture of the whole business, not the operational detail a shift
 * needs. That is an owner's view, so it stays with the owner.
 */
class LedgerPolicy
{
    public function viewLedger(User $user): bool
    {
        return $user->hasAnyRole(['admin', 'super-admin']);
    }
}
