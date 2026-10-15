<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class CategoryApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_cree_renomme_et_liste(): void
    {
        Sanctum::actingAs(User::factory()->create());
        $id = (string) Str::uuid();

        $this->putJson("/api/categories/$id", ['name' => 'Travail', 'color' => '#e74c3c'])
            ->assertCreated()
            ->assertExactJson(['id' => $id, 'name' => 'Travail', 'color' => '#e74c3c']);
        $this->putJson("/api/categories/$id", ['name' => 'Boulot', 'color' => '#2ecc71'])
            ->assertOk()
            ->assertJsonPath('name', 'Boulot')
            ->assertJsonPath('color', '#2ecc71');

        $this->getJson('/api/categories')->assertOk()->assertJsonCount(1)->assertJsonPath('0.name', 'Boulot');
    }

    public function test_ne_permet_pas_de_toucher_la_categorie_d_un_autre(): void
    {
        $category = User::factory()->create()->categories()->create(['name' => 'Privée']);

        Sanctum::actingAs(User::factory()->create());
        $this->putJson("/api/categories/{$category->id}", ['name' => 'Piratée', 'color' => '#e74c3c'])->assertNotFound();

        $this->assertDatabaseHas('categories', ['id' => $category->id, 'name' => 'Privée']);
    }

    public function test_supprimer_une_categorie_garde_ses_notes_sans_cette_categorie(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);
        $category = $user->categories()->create(['name' => 'Travail']);
        $noteId = (string) Str::uuid();
        $this->putJson("/api/notes/$noteId", [
            'title' => 'A', 'content' => '', 'items' => [], 'categoryIds' => [$category->id],
        ])->assertCreated();

        $this->deleteJson("/api/categories/{$category->id}")->assertNoContent();

        $this->getJson('/api/notes')->assertJsonCount(1)->assertJsonPath('0.categoryIds', []);
    }

    public function test_le_nom_est_obligatoire(): void
    {
        Sanctum::actingAs(User::factory()->create());

        $this->putJson('/api/categories/' . Str::uuid(), ['name' => '  ', 'color' => '#e74c3c'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('name');
    }

    public function test_refuse_une_couleur_qui_n_est_pas_un_hexadecimal(): void
    {
        Sanctum::actingAs(User::factory()->create());

        foreach (['rouge', '#12345', 'red; background:url(x)'] as $color) {
            $this->putJson('/api/categories/' . Str::uuid(), ['name' => 'A', 'color' => $color])
                ->assertUnprocessable()
                ->assertJsonValidationErrors('color');
        }
    }
}