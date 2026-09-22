<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class UpdateShiftScheduleRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        $station = $this->route('station');
        $schedule = $this->route('shiftSchedule');

        return [
            'name' => [
                'sometimes', 'required', 'string', 'max:40',
                Rule::unique('shift_schedules', 'name')
                    ->where('station_id', $station?->id)
                    ->ignore($schedule?->id),
            ],
            'starts_at' => ['sometimes', 'required', 'date_format:H:i'],
            'ends_at' => ['sometimes', 'required', 'date_format:H:i'],
            'position' => ['nullable', 'integer', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
        ];
    }
}
