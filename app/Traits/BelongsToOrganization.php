<?php

namespace App\Traits;

use App\Models\Organization;
use App\Models\Scopes\OrganizationScope;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        // Always add the global scope; the scope itself decides based on the current user/role
        static::addGlobalScope(new OrganizationScope);

        static::creating(function ($model) {
            if (auth()->check() && is_null($model->organization_id)) {
                $model->organization_id = Auth::user()->organization_id;
            }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
