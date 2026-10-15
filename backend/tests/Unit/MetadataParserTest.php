<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\LinkPreview\MetadataParser;
use PHPUnit\Framework\TestCase;

class MetadataParserTest extends TestCase
{
    public function test_prefere_open_graph_et_normalise_les_espaces(): void
    {
        $html = '<html><head><title>Titre page</title>
            <meta property="og:title" content="Titre OG">
            <meta property="og:description" content="Une   description
                sur deux lignes">
            <meta property="og:image" content="https://exemple.test/a.png"></head></html>';

        $result = (new MetadataParser())->parse($html);

        $this->assertSame('Titre OG', $result['title']);
        $this->assertSame('Une description sur deux lignes', $result['description']);
        $this->assertSame('https://exemple.test/a.png', $result['image']);
    }

    public function test_retombe_sur_les_balises_classiques(): void
    {
        $html = '<html><head><title>Titre page</title><meta name="description" content="Desc"></head></html>';

        $result = (new MetadataParser())->parse($html);

        $this->assertSame('Titre page', $result['title']);
        $this->assertSame('Desc', $result['description']);
        $this->assertNull($result['image']);
    }

    public function test_rejette_une_image_qui_n_est_pas_http(): void
    {
        $html = '<head><meta property="og:image" content="javascript:alert(1)"></head>';

        $this->assertNull((new MetadataParser())->parse($html)['image']);
    }

    public function test_conserve_les_accents(): void
    {
        $html = '<head><title>Café de l\'été</title></head>';

        $this->assertSame('Café de l\'été', (new MetadataParser())->parse($html)['title']);
    }
}