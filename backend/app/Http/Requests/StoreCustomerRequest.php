<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreCustomerRequest extends FormRequest
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
        return [
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'email',
                Rule::unique('customers')->where(fn ($query) => $query->where('organization_id', \Auth::user()->organization_id)
                ),
            ],
            'phone' => 'nullable|string|max:20',
            'tax_pin' => 'nullable|string|max:50',
            'credit_limit' => 'nullable|numeric|min:0',
        ];
    }
}
