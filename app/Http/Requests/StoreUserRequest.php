<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreUserRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()->hasAnyRole(['super-admin', 'admin']);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $rules = [
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email|max:255',
            'password' => 'required|string|min:8',
            'role' => 'required|string|in:admin,manager',
            'station_id' => 'nullable|exists:stations,id',
        ];

        if ($this->user()->hasRole('super-admin')) {
            $rules['organization_id'] = 'required|exists:organizations,id';
        } else {
            $rules['role'] = 'required|string|in:manager';
        }

        return $rules;
    }
}
