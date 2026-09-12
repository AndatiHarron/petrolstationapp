<?php

namespace App\Http\Requests;

use App\Models\CreditSettlement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreCreditSettlementRequest extends FormRequest
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
            'customer_id' => [
                'required',
                'uuid',
                Rule::exists('customers', 'id')->where(
                    fn ($query) => $query->where('organization_id', $this->user()->organization_id)
                ),
            ],
            'amount' => ['required', 'numeric', 'gt:0', 'max:99999999999.99'],
            'method' => ['required', Rule::in(CreditSettlement::METHODS)],
            'reference' => ['nullable', 'string', 'max:255'],
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }

    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator): void {
            if ($validator->errors()->isNotEmpty()) {
                return;
            }

            $customer = \App\Models\Customer::query()->find($this->input('customer_id'));

            if ($customer === null) {
                return;
            }

            // Settling more than is owed would push the balance negative and turn
            // the debtor list into a credit list. Overpayments are a different
            // thing and should be handled deliberately, not by accident here.
            $outstanding = (float) $customer->current_balance;

            if ((float) $this->input('amount') > $outstanding) {
                $validator->errors()->add(
                    'amount',
                    sprintf(
                        'That is more than the customer owes. Outstanding balance is %s.',
                        number_format($outstanding, 2)
                    )
                );
            }
        });
    }

    /**
     * @return array<string, string>
     */
    public function messages(): array
    {
        return [
            'amount.gt' => 'The amount must be greater than zero.',
            'method.in' => 'Choose cash, M-Pesa, bank or cheque.',
            'customer_id.exists' => 'That customer does not belong to your organization.',
        ];
    }
}
