<?php

namespace App\Http\Requests;

use Illuminate\Contracts\Encryption\DecryptException;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;

class SignedUploadConfirm extends FormRequest
{
    protected function prepareForValidation(): void
    {
        if ($this->has('payload')) {
            $payload = $this->input('payload');

            try {
                $payload = Crypt::decryptString($payload);
            } catch (DecryptException) {
                $payload = Crypt::decryptString(
                    urldecode($payload)
                );
            }

            if (is_string($payload)) {
                $decoded = json_decode($payload, true);

                if (json_last_error() === JSON_ERROR_NONE) {
                    $this->replace($decoded);

                    return;
                }
            }
        }

        $this->replace([]);
    }

    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->hasValidSignature(
            absolute: false
        );
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'filePath' => 'required|string',
            'disk' => ['nullable', Rule::in(['local'])],
        ];
    }
}
