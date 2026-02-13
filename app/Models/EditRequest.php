<?php

namespace App\Models;

use App\Traits\BelongsToOrganization;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;

class EditRequest extends Model
{
    /** @use HasFactory<\Database\Factories\EditRequestFactory> */
    use BelongsToOrganization, HasFactory, HasUuids;

    public $incrementing = false;

    protected $keyType = 'string';

    protected $fillable = [
        'organization_id',
        'user_id',
        'approver_id',
        'status',
        'model_type',
        'model_id',
        'original_data',
        'requested_data',
        'reason',
        'comments',
        'approved_at',
        'rejected_at',
    ];

    protected function casts(): array
    {
        return [
            'original_data' => 'array',
            'requested_data' => 'array',
            'approved_at' => 'datetime',
            'rejected_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_id');
    }

    public function model(): MorphTo
    {
        return $this->morphTo();
    }
}
