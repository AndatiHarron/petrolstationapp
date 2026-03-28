<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

/**
 * @property-read array $meters List of meter readings
 * @property-read array $dips List of tank dips
 * @property-read array $payments Payment breakdown
 */
class LockShiftRequest extends FormRequest
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
            'meters' => 'required|array',
            'meters.*.nozzle_id' => 'required|exists:nozzles,id',
            'meters.*.opening_reading' => 'required|numeric',
            'meters.*.closing_reading' => 'required|numeric|gte:meters.*.opening_reading',
            'meters.*.evidence' => 'nullable|image|max:8192',
            'meters.*.gps_coordinates' => 'nullable|json',

            'dips' => 'required|array',
            'dips.*.tank_id' => 'required|exists:tanks,id',
            'dips.*.dip_mm' => 'required|numeric',

            'payments' => 'required|array',
            'payments.cash' => 'nullable|numeric|min:0',
            'payments.mpesa' => 'nullable|numeric|min:0',

            'payments.credit' => 'nullable|array',
            'payments.credit.*.customer_id' => 'required|exists:customers,id',
            'payments.credit.*.amount' => 'required|numeric|min:0',
            'payments.credit.*.vehicle_reg' => 'nullable|string',
        ];
    }

    public function bodyParameters(): array
    {
        return [
            'meters.*.evidence' => [
                'type' => 'string',
                'format' => 'binary',
                'description' => 'Photo evidence of the meter reading',
            ],
            'meters.*.gps_coordinates' => [
                'type' => 'object',
                'description' => 'JSON object: {"lat": -1.2, "lng": 36.4}',
                'example' => ['lat' => -1.2921, 'lng' => 36.8219],
            ],
        ];
    }
}
