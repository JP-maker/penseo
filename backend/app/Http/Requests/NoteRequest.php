<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Validator;

class NoteRequest extends FormRequest
{
    /** Forme d'un bloc chiffré : v1.<itérations>.<sel>.<vecteur>.<données>, en base64. */
    private const CIPHER_FORMAT = '/^v1\.\d{1,9}\.[A-Za-z0-9+\/=]+\.[A-Za-z0-9+\/=]+\.[A-Za-z0-9+\/=]+$/';

    public function authorize(): bool
    {
        return true; // l'accès est déjà réservé aux utilisateurs connectés par la route
    }

    /** @return array<string, mixed> */
    public function rules(): array
    {
        // Note chiffrée dans le navigateur : `content` est un bloc opaque (voir note-crypto.ts côté front).
        // Le serveur n'en lit rien, mais refuse tout ce qui n'a pas la forme d'un bloc chiffré : une note
        // marquée « chiffrée » ne doit pas pouvoir contenir du texte en clair, ni des cases à cocher en clair.
        $encrypted = $this->boolean('encrypted');

        return [
            'title' => ['nullable', 'string', 'max:200'],
            'encrypted' => ['sometimes', 'boolean'],
            'content' => $encrypted
                ? ['required', 'string', 'max:250000', 'regex:' . self::CIPHER_FORMAT]
                : ['nullable', 'string', 'max:10000'],
            'items' => ['present', 'array', 'max:' . ($encrypted ? 0 : 100)],
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
