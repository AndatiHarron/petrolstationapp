<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Payment extends Model
{
    use BelongsToOrganization;
    use HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';
    protected $guarded = [];

    public function organization(): BelongsTo
    {
        return $this->belongsTo(Organization::class);
    }

    public function shift(): BelongsTo {
        return $this->belongsTo(Shift::class);
    }
}
