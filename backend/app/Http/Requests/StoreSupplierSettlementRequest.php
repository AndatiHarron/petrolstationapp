<?php

namespace App\Http\Requests;

use App\Models\Supplier;
use App\Models\SupplierSettlement;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class StoreSupplierSettlementRequest extends FormRequest
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
            'supplier_id' => [
                'required',
                'uuid',
                Rule::exists('suppliers', 'id')->where(
                    fn ($query) => $query->where('organization_id', $this->user()->organization_id)
                ),
            ],
            'amount' => ['required', 'numeric', 'gt:0', 'max:99999999999.99'],
            'method' => ['required', Rule::in(SupplierSettlement::METHODS)],
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

            $supplier = Supplier::query()->find($this->input('supplier_id'));

            if ($supplier === null) {
                return;
            }

            // Paying more than is owed would push the balance negative and turn
            // a creditor into a debtor. Overpayments need handling deliberately.
            $outstanding = (float) $supplier->current_balance;

            if ((float) $this->input('amount') > $outstanding) {
                $validator->errors()->add(
                    'amount',
                    sprintf(
                        'That is more than is owed to this supplier. Outstanding balance is %s.',
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
            'supplier_id.exists' => 'That supplier does not belong to your organization.',
        ];
    }
}
