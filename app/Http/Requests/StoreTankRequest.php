<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreTankRequest extends FormRequest
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
            'station_id' => [
                'required',
                'uuid',
                // Ensure the station belongs to the User's Organization
                Rule::exists('stations', 'id')->where(function ($query) {
                    if (Auth::user()->hasRole('super-admin')) {
                        return $query;
                    }

                    return $query->where('organization_id', Auth::user()->organization_id);
                }),
            ],
            'product_id' => 'required|exists:products,id',
            'capacity_liters' => 'required|numeric|min:1',
            'current_volume' => 'nullable|numeric|min:0|lte:capacity_liters',

            // Calibration Chart Validation
            'calibration_chart' => 'nullable|array',
            'calibration_chart.*.mm' => 'required_with:calibration_chart|numeric|min:0',
            'calibration_chart.*.liters' => 'required_with:calibration_chart|numeric|min:0',
        ];
    }
}
