<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreCreditSaleRequest extends FormRequest
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
        $user = Auth::user();

        return [
            'shift_id' => [
                'required',
                'uuid',
                Rule::exists('shifts', 'id')->where(function ($query) use ($user) {
                    if (! $user->hasRole('super-admin')) {
                        $query->where('organization_id', $user->organization_id);
                    }

                    if ($user->hasRole('manager') && $user->station_id) {
                        $query->where('station_id', $user->station_id);
                    }
                }),
            ],
            'customer_id' => [
                'required',
                'uuid',
                Rule::exists('customers', 'id')->where(function ($query) {
                    if (Auth::user()->hasRole('super-admin')) {
                        return $query;
                    }

                    return $query->where('organization_id', Auth::user()->organization_id);
                }),
            ],
            'amount' => 'required|numeric|min:0.01',
            'vehicle_reg' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ];
    }
}
