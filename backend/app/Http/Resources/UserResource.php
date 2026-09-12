<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
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
            'name' => $this->name,
            'email' => $this->email,

            // Return the roles as an array (e.g., ["manager", "super-admin"])
            'roles' => $this->getRoleNames(),

            'organization_id' => $this->organization_id,
            'station_id' => $this->station_id,

            'organization_name' => $this->organization->name ?? null,
            'station_name' => $this->station->name ?? null,

            'created_at' => $this->created_at->toIso8601String(),
        ];
    }
}
