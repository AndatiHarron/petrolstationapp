<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class StoreNozzleRequest extends FormRequest
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
            'digits' => 'required|integer|min:1|max:10', // e.g., 7-digit mechanical counter

            'station_id' => [
                'required',
                'uuid',
                Rule::exists('stations', 'id')->where(function ($query) {
                    return $query->where('organization_id', Auth::user()->organization_id);
                }),
            ],

            // Validate Tank exists AND belongs to the chosen Station
            'tank_id' => [
                'required',
                'uuid',
                Rule::exists('tanks', 'id')->where(function ($query) {
                    return $query->where('station_id', $this->station_id)
                        ->where('organization_id', Auth::user()->organization_id);
                }),
            ],

            'current_reading' => 'required|numeric|min:0',
        ];
    }
}
