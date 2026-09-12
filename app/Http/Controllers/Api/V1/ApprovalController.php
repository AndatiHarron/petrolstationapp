<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CreditSettlement;
use App\Models\EditRequest;
use App\Models\SupplierSettlement;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/**
 * What is waiting for the signed-in user to approve.
 *
 * One call rather than three, so the app can show a badge without firing a
 * request per queue on every screen. A role that cannot approve gets zero, so
 * the badge simply never appears for a manager.
 */
class ApprovalController extends Controller
{
    public function summary(Request $request)
    {
        $user = Auth::user();

        if (! $user->hasAnyRole(['admin', 'super-admin'])) {
            return response()->json([
                'data' => [
                    'total' => 0,
                    'can_approve' => false,
                    'queues' => [],
                ],
            ]);
        }

        $editRequests = EditRequest::query()->where('status', 'pending')->count();
        $creditPayments = CreditSettlement::query()
            ->where('status', CreditSettlement::STATUS_PENDING)
            ->count();
        $supplierPayments = SupplierSettlement::query()
            ->where('status', SupplierSettlement::STATUS_PENDING)
            ->count();

        return response()->json([
            'data' => [
                'total' => $editRequests + $creditPayments + $supplierPayments,
                'can_approve' => true,
                'queues' => [
                    [
                        'key' => 'edit_requests',
                        'label' => 'Shift edit requests',
                        'count' => $editRequests,
                        'href' => '/admin/requests',
                    ],
                    [
                        'key' => 'credit_payments',
                        'label' => 'Customer credit payments',
                        'count' => $creditPayments,
                        'href' => '/admin/requests',
                    ],
                    [
                        'key' => 'supplier_payments',
                        'label' => 'Supplier payments',
                        'count' => $supplierPayments,
                        'href' => '/admin/finance',
                    ],
                ],
            ],
        ]);
    }
}
