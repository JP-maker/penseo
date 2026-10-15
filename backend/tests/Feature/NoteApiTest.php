<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Note;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class NoteApiTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<string, mixed> */
    private function payload(array $over = []): array
    {
        return [...['title' => 'Courses', 'content' => 'Lait', 'items' => [], 'categoryIds' => []], ...$over];
    }

    public function test_exige_d_etre_connecte(): void
    {
        $this->getJson('/api/notes')->assertUnauthorized();
    }

    public function test_liste_uniquement_les_notes_de_l_utilisateur(): void
    {
        $alice = User::factory()->create();
        $bob = User::factory()->create();

        Sanctum::actingAs($alice);
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['title' => 'A']))->assertCreated();
        Sanctum::actingAs($bob);
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['title' => 'B']))->assertCreated();

        Sanctum::actingAs($alice);
        $this->getJson('/api/notes')->assertOk()->assertJsonCount(1)->assertJsonPath('0.title', 'A');
    }

    public function test_cree_puis_modifie_sans_changer_la_date_de_creation(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $id = (string) Str::uuid();

        $created = $this->putJson("/api/notes/$id", $this->payload(['createdAt' => '2026-01-01T00:00:00.000Z']))
            ->assertCreated()
            ->assertJsonPath('id', $id);
        $this->assertStringStartsWith('2026-01-01T00:00:00', $created->json('createdAt'));

        $updated = $this->putJson("/api/notes/$id", $this->payload(['title' => 'Modifié', 'createdAt' => '2030-01-01T00:00:00.000Z']))
            ->assertOk()
            ->assertJsonPath('title', 'Modifié');
        $this->assertStringStartsWith('2026-01-01T00:00:00', $updated->json('createdAt'));
    }

    public function test_ne_permet_pas_d_ecraser_la_note_d_un_autre(): void
    {
        $id = (string) Str::uuid();
        Sanctum::actingAs(User::factory()->create());
        $this->putJson("/api/notes/$id", $this->payload(['title' => 'Secret']))->assertCreated();

        Sanctum::actingAs(User::factory()->create());
        $this->putJson("/api/notes/$id", $this->payload(['title' => 'Piraté']))->assertNotFound();

        $this->assertSame('Secret', Note::findOrFail($id)->title);
    }

    public function test_refuse_la_categorie_d_un_autre_utilisateur(): void
    {
        $alice = User::factory()->create();
        $category = $alice->categories()->create(['name' => 'Privée']);

        Sanctum::actingAs(User::factory()->create());
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['categoryIds' => [$category->id]]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('categoryIds.0');
    }

    public function test_refuse_une_note_vide_mais_accepte_une_checklist_seule(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['title' => '', 'content' => '']))
            ->assertUnprocessable();

        $items = [['id' => (string) Str::uuid(), 'text' => 'Lait', 'done' => false]];
        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['title' => '', 'content' => '', 'items' => $items]))
            ->assertCreated()
            ->assertJsonPath('items.0.text', 'Lait');
    }

    public function test_refuse_trop_d_elements_de_checklist(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $items = array_map(
            fn () => ['id' => (string) Str::uuid(), 'text' => 'x', 'done' => false],
            range(1, 101),
        );

        $this->putJson('/api/notes/' . Str::uuid(), $this->payload(['items' => $items]))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('items');
    }

    public function test_supprime_sa_propre_note(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $id = (string) Str::uuid();
        $this->putJson("/api/notes/$id", $this->payload())->assertCreated();

        $this->deleteJson("/api/notes/$id")->assertNoContent();

        $this->assertDatabaseMissing('notes', ['id' => $id]);
    }

    public function test_ne_supprime_pas_la_note_d_un_autre(): void
    {
        $id = (string) Str::uuid();
        Sanctum::actingAs(User::factory()->create());
        $this->putJson("/api/notes/$id", $this->payload())->assertCreated();

        Sanctum::actingAs(User::factory()->create());
        $this->deleteJson("/api/notes/$id")->assertNoContent();

        $this->assertDatabaseHas('notes', ['id' => $id]);
    }

    public function test_un_id_qui_n_est_pas_un_uuid_donne_404(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->putJson('/api/notes/pas-un-uuid', $this->payload())->assertNotFound();
        $this->deleteJson('/api/notes/pas-un-uuid')->assertNotFound();
    }

    public function test_associe_plusieurs_categories_puis_les_remplace(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $a = $user->categories()->create(['name' => 'A']);
        $b = $user->categories()->create(['name' => 'B']);
        $id = (string) Str::uuid();

        $this->putJson("/api/notes/$id", $this->payload(['categoryIds' => [$a->id, $b->id]]))->assertCreated();
        $ids = $this->getJson('/api/notes')->json('0.categoryIds');
        $this->assertEqualsCanonicalizing([$a->id, $b->id], $ids);

        $this->putJson("/api/notes/$id", $this->payload(['categoryIds' => [$a->id]]))
            ->assertOk()
            ->assertJsonPath('categoryIds', [$a->id]);
    }
}