<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreShiftScheduleRequest extends FormRequest
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

        return [
            'name' => [
                'required', 'string', 'max:40',
                // Unique within the station, not globally: every station is
                // entitled to call one of its shifts "Morning".
                Rule::unique('shift_schedules', 'name')
                    ->where('station_id', $station?->id),
            ],
            // No rule that the end is after the start. An end earlier than its
            // start is how a night shift is written, and refusing it would make
            // the commonest overnight pattern impossible to enter.
            'starts_at' => ['required', 'date_format:H:i'],
            'ends_at' => ['required', 'date_format:H:i', 'different:starts_at'],
            'position' => ['nullable', 'integer', 'min:0', 'max:100'],
            'is_active' => ['boolean'],
        ];
    }

    public function messages(): array
    {
        return [
            'ends_at.different' => 'A shift cannot start and end at the same time.',
            'name.unique' => 'This station already has a shift with that name.',
        ];
    }
}
