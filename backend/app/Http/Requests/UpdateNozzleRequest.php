<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class UpdateNozzleRequest extends FormRequest
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
            'digits' => 'sometimes|integer|min:1|max:10',

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

            // If updating tank, ensure it matches the station (use new station_id if provided, else current model's)
            'tank_id' => [
                'sometimes',
                'uuid',
                Rule::exists('tanks', 'id')->where(function ($query) {
                    $stationId = $this->station_id ?? $this->route('nozzle')->station_id;
                    $query->where('station_id', $stationId);
                    if (! Auth::user()->hasRole('super-admin')) {
                        $query->where('organization_id', Auth::user()->organization_id);
                    }

                    return $query;
                }),
            ],

            'current_reading' => 'sometimes|numeric|min:0',
        ];
    }
}
