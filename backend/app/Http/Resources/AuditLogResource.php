<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AuditLogResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'description' => $this->description,
            'time_ago' => $this->created_at->diffForHumans(),
            'timestamp' => $this->created_at->toIso8601String(),

            'causer' => [
                'id' => $this->causer_id,
                'name' => $this->causer->name ?? 'System',
                'role' => $this->causer?->roles->first()?->name ?? 'N/A',
            ],

            'subject' => [
                'type' => class_basename($this->subject_type), // "Shift" instead of "App\Models\Shift"
                'id' => $this->subject_id,
            ],

            'changes' => [
                'old' => $this->properties['old'] ?? [],
                'new' => $this->properties['attributes'] ?? [],
            ],
        ];
    }
}
