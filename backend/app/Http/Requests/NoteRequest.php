<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class NoteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true; // l'accès est déjà réservé aux utilisateurs connectés par la route
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        return [
            'title' => ['nullable', 'string', 'max:200'],
            'content' => ['nullable', 'string', 'max:10000'],
            'items' => ['present', 'array', 'max:100'],
            'items.*.id' => ['required', 'uuid', 'distinct'],
            'items.*.text' => ['required', 'string', 'max:200'],
            'items.*.done' => ['required', 'boolean'],
            // Chaque catégorie doit exister ET appartenir à cet utilisateur.
            'categoryIds' => ['present', 'array', 'max:20'],
            'categoryIds.*' => [
                'uuid',
                'distinct',
                Rule::exists('categories', 'id')->where('user_id', $this->user()->id),
            ],
            'createdAt' => ['nullable', 'date'],
        ];
    }

    /** @return array<int, callable> */
    public function after(): array
    {
        return [
            function (Validator $validator): void {
                if (!$this->filled('title') && !$this->filled('content') && !$this->input('items')) {
                    $validator->errors()->add('title', 'La note est vide.');
                }
            },
        ];
    }
}