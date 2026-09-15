<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreStationRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $user = $this->user();

        // A tenant admin's station belongs to their own organization, filled in
        // by the BelongsToOrganization trait. The platform owner belongs to no
        // organization in particular, so there is nothing to fill in from and
        // the organization has to be named — otherwise the insert fails on a
        // not-null constraint with nothing useful to show the person.
        $ownerWithoutOrganization = $user
            && $user->hasRole('super-admin')
            && $user->organization_id === null;

        return [
            'name' => 'required|string|max:255',
            'location' => 'nullable|string|max:255',
            'is_active' => 'boolean',
            'organization_id' => [
                $ownerWithoutOrganization ? 'required' : 'nullable',
                'uuid',
                'exists:organizations,id',
            ],
        ];
    }
}
