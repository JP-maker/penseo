<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

/** Le serveur stocke un bloc chiffré sans le lire, et refuse tout ce qui n'en a pas la forme. */
class NoteEncryptionTest extends TestCase
{
    use RefreshDatabase;

    private const BLOCK = 'v1.600000.c2VsMTIzNDU2Nzg5MA==.aXYxMjM0NTY3OA==.Y2lwaGVydGV4dA==';

    protected function setUp(): void
    {
        parent::setUp();
        Sanctum::actingAs(User::factory()->create());
    }

    /** @param array<string, mixed> $overrides */
    private function payload(array $overrides = []): array
    {
        return array_merge([
            'title' => 'Mes codes',
            'content' => self::BLOCK,
            'items' => [],
            'categoryIds' => [],
            'encrypted' => true,
        ], $overrides);
    }

    public function test_enregistre_une_note_chiffree_telle_quelle(): void
    {
        $id = (string) Str::uuid();

        $this->putJson("/api/notes/$id", $this->payload())
            ->assertCreated()
            ->assertJsonPath('encrypted', true)
            ->assertJsonPath('content', self::BLOCK)
            ->assertJsonPath('title', 'Mes codes');

        $this->assertTrue(Note::findOrFail($id)->encrypted);
    }

    public function test_une_note_normale_n_est_pas_chiffree(): void
    {
        $id = (string) Str::uuid();

        $this->putJson("/api/notes/$id", $this->payload(['encrypted' => false, 'content' => 'bonjour']))
            ->assertCreated()
            ->assertJsonPath('encrypted', false);
    }

    public function test_refuse_du_texte_en_clair_dans_une_note_chiffree(): void
    {
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['content' => 'mon mot de passe est 1234']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');
    }

    public function test_refuse_des_cases_a_cocher_en_clair_dans_une_note_chiffree(): void
    {
        $item = ['id' => (string) Str::uuid(), 'text' => 'Acheter du lait', 'done' => false];

        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['items' => [$item]]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items');
    }

    public function test_une_note_chiffree_doit_avoir_un_contenu(): void
    {
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['content' => '']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('content');
    }

    public function test_accepte_un_gros_bloc_chiffre_mais_pas_demesure(): void
    {
        $big = 'v1.600000.c2Vs.aXY=.' . str_repeat('QUJD', 40000); // environ 160 000 caractères

        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['content' => $big]))->assertCreated();

        $huge = 'v1.600000.c2Vs.aXY=.' . str_repeat('QUJD', 70000); // environ 280 000 caractères
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['content' => $huge]))
            ->assertUnprocessable();
    }

    public function test_une_note_normale_reste_limitee_a_10000_caracteres(): void
    {
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload([
            'encrypted' => false,
            'content' => str_repeat('a', 10001),
        ]))->assertUnprocessable()->assertJsonValidationErrors('content');
    }
}
