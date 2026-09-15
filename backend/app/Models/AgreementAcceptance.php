<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * One administrator's decision on one version of the terms.
 *
 * Deliberately not scoped to an organization. The organization scope exists to
 * keep tenants apart in trading data, but this is a legal record between the
 * provider and an individual — it has to be readable whatever organization the
 * person later belongs to, or none at all.
 */
class AgreementAcceptance extends Model
{
    use HasUuids;

    public const ACCEPTED = 'accepted';

    public const DECLINED = 'declined';

    protected $fillable = [
        'user_id',
        'user_email',
        'organization_id',
        'version',
        'action',
        'decided_at',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'decided_at' => 'datetime',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Has this user accepted the version currently in force?
     */
    public static function currentlyAcceptedBy(User $user): bool
    {
        return static::query()
            ->where('user_id', $user->getKey())
            ->where('version', config('agreement.version'))
            ->where('action', self::ACCEPTED)
            ->exists();
    }

    /**
     * Is this user one of those the terms apply to?
     *
     * The platform owner is excluded: they are the party offering the terms,
     * not a party bound by them. A manager is excluded because the obligations
     * are about configuration and account administration, which a manager
     * cannot do.
     */
    public static function appliesTo(User $user): bool
    {
        return $user->hasAnyRole((array) config('agreement.required_roles', ['admin']));
    }
}
