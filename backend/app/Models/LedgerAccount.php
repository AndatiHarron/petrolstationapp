<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * One account in the chart of accounts.
 */
class LedgerAccount extends Model
{
    use BelongsToOrganization, HasFactory, HasUuids;

    protected $guarded = [];

    public const TYPE_ASSET = 'ASSET';

    public const TYPE_LIABILITY = 'LIABILITY';

    public const TYPE_EQUITY = 'EQUITY';

    public const TYPE_INCOME = 'INCOME';

    public const TYPE_EXPENSE = 'EXPENSE';

    public const DEBIT = 'DEBIT';

    public const CREDIT = 'CREDIT';

    /**
     * The accounts the posting rules require, created for every organization.
     *
     * Codes are what the code posts against and never change. Names are what
     * people read and an admin may rename.
     *
     * @var array<string, array{name: string, type: string, normal: string, description: string}>
     */
    public const SYSTEM_ACCOUNTS = [
        'CASH' => [
            'name' => 'Cash on Hand',
            'type' => self::TYPE_ASSET,
            'normal' => self::DEBIT,
            'description' => 'Physical currency collected at the pumps.',
        ],
        'MPESA' => [
            'name' => 'M-Pesa Control',
            'type' => self::TYPE_ASSET,
            'normal' => self::DEBIT,
            'description' => 'Money collected through M-Pesa, before it is banked.',
        ],
        'AR' => [
            'name' => 'Accounts Receivable',
            'type' => self::TYPE_ASSET,
            'normal' => self::DEBIT,
            'description' => 'Owed to the station by credit customers.',
        ],
        'STOCK' => [
            'name' => 'Fuel Stock',
            'type' => self::TYPE_ASSET,
            'normal' => self::DEBIT,
            'description' => 'Value of wet stock held in the tanks.',
        ],
        'AP' => [
            'name' => 'Accounts Payable',
            'type' => self::TYPE_LIABILITY,
            'normal' => self::CREDIT,
            'description' => 'Owed by the station to fuel suppliers.',
        ],
        'VAT_OUTPUT' => [
            'name' => 'VAT Payable (Output Tax)',
            'type' => self::TYPE_LIABILITY,
            'normal' => self::CREDIT,
            'description' => 'VAT collected on sales and owed to the authority.',
        ],
        'VAT_INPUT' => [
            'name' => 'VAT Recoverable (Input Tax)',
            'type' => self::TYPE_ASSET,
            'normal' => self::DEBIT,
            'description' => 'VAT paid on liftings and recoverable from the authority.',
        ],
        'SALES' => [
            'name' => 'Fuel Sales',
            'type' => self::TYPE_INCOME,
            'normal' => self::CREDIT,
            'description' => 'Revenue from fuel sold, net of VAT.',
        ],
        'COGS' => [
            'name' => 'Cost of Goods Sold',
            'type' => self::TYPE_EXPENSE,
            'normal' => self::DEBIT,
            'description' => 'Cost of the fuel sold.',
        ],
        'CASH_VARIANCE' => [
            'name' => 'Cash Over / Short',
            'type' => self::TYPE_EXPENSE,
            'normal' => self::DEBIT,
            'description' => 'Shortages and overages found when a shift is reconciled.',
        ],
        'STOCK_VARIANCE' => [
            'name' => 'Stock Gain / Loss',
            'type' => self::TYPE_EXPENSE,
            'normal' => self::DEBIT,
            'description' => 'Value of wet stock found missing or in surplus at dip.',
        ],
    ];

    public function lines(): HasMany
    {
        return $this->hasMany(LedgerLine::class);
    }

    /**
     * The balance in the direction the account normally runs, so a reader never
     * has to remember that a liability with more credits than debits is healthy.
     */
    public function signedBalance(float $debit, float $credit): float
    {
        return $this->normal_balance === self::DEBIT
            ? round($debit - $credit, 2)
            : round($credit - $debit, 2);
    }
}
