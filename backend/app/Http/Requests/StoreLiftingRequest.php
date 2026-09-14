<?php

namespace App\Http\Requests;

use Auth;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreLiftingRequest extends FormRequest
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
            'station_id' => [
                'required',
                'exists:stations,id',
                // If user is a Manager, they MUST use their assigned station_id
                function ($attribute, $value, $fail) {
                    $user = Auth::user();
                    if ($user->hasRole('manager') && $user->station_id && $value !== $user->station_id) {
                        $fail('You can only record liftings for your assigned station.');
                    }
                },
            ],
            'tank_id' => [
                'required',
                'uuid',
                // Ensure the Tank belongs to the selected Station
                Rule::exists('tanks', 'id')->where(function ($query) {
                    return $query->where('station_id', $this->station_id);
                }),
            ],
            'lifting_date' => 'required|date|before_or_equal:today',
            'invoice_number' => 'nullable|string|max:255',
            'volume_liters' => 'required|numeric|min:1',
            'buying_price_per_liter' => 'required|numeric|min:0',
            // Total cost is usually calculated, but if provided manually, validate it
            'total_cost' => 'required|numeric|min:0',
            'supplier_name' => 'nullable|string|max:255',
            'supplier_id' => [
                Rule::requiredIf(fn () => $this->boolean('is_credit') === true),
                'uuid',
                Rule::exists('suppliers', 'id')->where(function ($query) {
                    if (Auth::user()->hasRole('super-admin')) {
                        return $query;
                    }

                    return $query->where('organization_id', Auth::user()->organization_id);
                }),
            ],
            'is_credit' => 'sometimes|boolean',
        ];
    }
}
