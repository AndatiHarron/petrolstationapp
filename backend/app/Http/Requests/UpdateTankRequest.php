<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateTankRequest extends FormRequest
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
            'name' => 'sometimes|string|max:255',
            // Allow moving tank to another station, but ONLY within same Org
            'station_id' => [
                'sometimes',
                'uuid',
                Rule::exists('stations', 'id')->where(function ($query) {
                    if (Auth::user()->hasRole('super-admin')) {
                        return $query;
                    }

                    return $query->where('organization_id', Auth::user()->organization_id);
                }),
            ],
            'product_id' => 'sometimes|exists:products,id',
            'capacity_liters' => 'sometimes|numeric|min:1',
            'current_volume' => 'nullable|numeric|min:0',

            'calibration_chart' => 'nullable|array',
            'calibration_chart.*.mm' => 'required_with:calibration_chart|numeric|min:0',
            'calibration_chart.*.liters' => 'required_with:calibration_chart|numeric|min:0',
        ];
    }
}
