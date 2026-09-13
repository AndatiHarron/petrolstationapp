<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateOrganizationRequest extends FormRequest
{
    /**
     * Authorization is settled by the policy in the controller.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $organization = $this->route('organization');

        return [
            'name' => ['sometimes', 'required', 'string', 'max:255'],
            // Unique across tenants, but not against itself — saving a form
            // without touching the slug must not fail on its own value.
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('organizations', 'slug')->ignore($organization?->id),
            ],
            // Suspending a tenant is the reversible way to switch it off; the
            // column only admits these two.
            'status' => ['sometimes', 'required', 'in:active,inactive'],
        ];
    }
}
