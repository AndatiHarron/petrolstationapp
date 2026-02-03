<?php

namespace App\Traits;

use App\Models\Scopes\OrganizationScope;
use App\Models\Organization;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Facades\Auth;

/**
 * @mixin \Illuminate\Database\Eloquent\Model
 */
trait BelongsToOrganization
{
    public static function bootBelongsToOrganization(): void
    {
        if (!auth()->check() || !auth()->user()->hasRole('super-admin')) {
            static::addGlobalScope(new OrganizationScope);
        }

        static::creating(function ($model) {
           if(auth()->check()) {
               if (is_null($model->organization_id)) {
                    $model->organization_id = Auth::user()->organization_id;
               }
           }
        });
    }

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }
}
