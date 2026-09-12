<?php

namespace App\Http\Requests;

use App\Models\Station;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Carbon;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

/**
 * Shared filters for every report endpoint.
 *
 * Every field is optional so an unfiltered call keeps working, but anything
 * supplied is validated. Previously these went straight into whereBetween with
 * no checking, so a malformed date produced a silently wrong figure instead of
 * a 422 — the worst outcome for a report someone acts on.
 */
class ReportFilterRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],

            // Scoped to the caller's organization: without this a valid id from
            // another tenant would pass validation and leak that tenant's totals.
            'station_id' => [
                'nullable',
                'uuid',
                Rule::exists('stations', 'id')->where(
                    fn ($query) => $query->where('organization_id', $this->user()->organization_id)
                ),
            ],
            'customer_id' => [
                'nullable',
                'uuid',
                Rule::exists('customers', 'id')->where(
                    fn ($query) => $query->where('organization_id', $this->user()->organization_id)
                ),
            ],

            // Legacy parameters, still accepted so existing callers keep working.
            'month' => ['nullable', 'integer', 'between:1,12'],
            'year' => ['nullable', 'integer', 'between:2000,2100'],
            'days' => ['nullable', 'integer', 'between:1,730'],

            // A single calendar day, for the end-of-day report.
            'date' => ['nullable', 'date'],

            // Report delivery: inline JSON or a downloadable PDF.
            'format' => ['nullable', 'in:json,pdf'],
            'user_id' => [
                'nullable',
                'uuid',
                Rule::exists('users', 'id')->where(
                    fn ($query) => $query->where('organization_id', $this->user()->organization_id)
                ),
            ],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            $user = $this->user();

            // A manager only ever sees their own station, whatever they ask for.
            if ($user->hasRole('manager') && $user->station_id) {
                $requested = $this->input('station_id');

                if ($requested !== null && $requested !== $user->station_id) {
                    $validator->errors()->add(
                        'station_id',
                        'You can only report on your assigned station.'
                    );
                }
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'end_date.after_or_equal' => 'The end date must not be before the start date.',
            'station_id.exists' => 'That station does not belong to your organization.',
            'customer_id.exists' => 'That customer does not belong to your organization.',
            'user_id.exists' => 'That user does not belong to your organization.',
            'days.between' => 'The day range must be between 1 and 730 days.',
        ];
    }

    /**
     * Start of the reporting window. Falls back to the start of the current month.
     */
    public function startDate(): Carbon
    {
        if ($this->filled('start_date')) {
            return Carbon::parse($this->input('start_date'))->startOfDay();
        }

        if ($this->filled('month') || $this->filled('year')) {
            return Carbon::create(
                (int) $this->input('year', now()->year),
                (int) $this->input('month', now()->month),
                1
            )->startOfMonth();
        }

        return now()->startOfMonth();
    }

    /**
     * End of the reporting window, inclusive of the whole final day.
     */
    public function endDate(): Carbon
    {
        if ($this->filled('end_date')) {
            return Carbon::parse($this->input('end_date'))->endOfDay();
        }

        if ($this->filled('month') || $this->filled('year')) {
            return $this->startDate()->copy()->endOfMonth();
        }

        return now()->endOfMonth();
    }

    /**
     * Station to report on, or null for the whole organization. A manager is
     * always pinned to their own station.
     */
    public function stationId(): ?string
    {
        $user = $this->user();

        if ($user->hasRole('manager') && $user->station_id) {
            return $user->station_id;
        }

        return $this->input('station_id');
    }

    public function customerId(): ?string
    {
        return $this->input('customer_id');
    }

    public function userId(): ?string
    {
        return $this->input('user_id');
    }

    /**
     * The single day an end-of-day report covers. Defaults to today.
     */
    public function day(): Carbon
    {
        return $this->filled('date')
            ? Carbon::parse($this->input('date'))->startOfDay()
            : now()->startOfDay();
    }

    public function wantsPdf(): bool
    {
        return $this->input('format') === 'pdf';
    }
}
