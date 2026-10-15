<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Services\LinkPreview\SafeFetcher;
use Mockery\MockInterface;
use Tests\TestCase;

class LinkPreviewTest extends TestCase
{
    public function test_retourne_l_apercu_d_une_page(): void
    {
        $this->mock(SafeFetcher::class, function (MockInterface $mock): void {
            $mock->shouldReceive('fetchHtml')
                ->once()
                ->with('https://exemple.test/page')
                ->andReturn('<html><head><title>Bonjour</title></head></html>');
        });

        $this->getJson('/api/link-preview?url=https://exemple.test/page')
            ->assertOk()
            ->assertJson(['url' => 'https://exemple.test/page', 'title' => 'Bonjour']);
    }

    public function test_refuse_une_url_invalide(): void
    {
        $this->getJson('/api/link-preview?url=javascript:alert(1)')->assertStatus(422);
        $this->getJson('/api/link-preview')->assertStatus(422);
    }

    public function test_repond_de_facon_generique_si_l_url_est_interne(): void
    {
        // Pas de mock : le vrai SafeFetcher refuse l'IP avant tout accès réseau.
        $this->getJson('/api/link-preview?url=http://127.0.0.1/')
            ->assertStatus(422)
            ->assertExactJson(['message' => 'Aperçu indisponible pour ce lien.']);
    }

    public function test_limite_le_debit(): void
    {
        for ($i = 0; $i < 60; $i++) {
            $this->getJson('/api/link-preview?url=http://127.0.0.1/');
        }

        $this->getJson('/api/link-preview?url=http://127.0.0.1/')->assertStatus(429);
    }
}