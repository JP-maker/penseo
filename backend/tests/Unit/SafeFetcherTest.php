<?php

declare(strict_types=1);

namespace Tests\Unit;

use App\Services\LinkPreview\LinkPreviewException;
use App\Services\LinkPreview\SafeFetcher;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

class SafeFetcherTest extends TestCase
{
    #[DataProvider('unsafeUrls')]
    public function test_refuse_les_urls_dangereuses(string $url): void
    {
        $this->expectException(LinkPreviewException::class);

        (new SafeFetcher())->fetchHtml($url);
    }

    /** @return array<string, array{string}> */
    public static function unsafeUrls(): array
    {
        return [
            'loopback' => ['http://127.0.0.1/'],
            'loopback IPv6' => ['http://[::1]/'],
            'réseau privé 10.x' => ['http://10.0.0.5/'],
            'réseau privé 192.168.x' => ['http://192.168.1.1/'],
            'métadonnées cloud' => ['http://169.254.169.254/latest/meta-data/'],
            'CGNAT' => ['http://100.64.0.1/'],
            'IPv4 mappée en IPv6' => ['http://[::ffff:127.0.0.1]/'],
            'schéma ftp' => ['ftp://example.com/'],
            'schéma file' => ['file:///etc/passwd'],
            'identifiants dans l\'URL' => ['http://user:pass@example.com/'],
            'port non standard' => ['http://example.com:8080/'],
        ];
    }

    public function test_refuse_un_domaine_qui_pointe_vers_le_reseau_interne(): void
    {
        $fetcher = new class extends SafeFetcher {
            protected function resolveHost(string $host): array
            {
                return ['93.184.216.34', '10.0.0.1']; // une seule IP privée suffit à refuser
            }
        };

        $this->expectException(LinkPreviewException::class);
        $fetcher->fetchHtml('http://piege.example/');
    }

    public function test_refuse_un_domaine_sans_adresse(): void
    {
        $fetcher = new class extends SafeFetcher {
            protected function resolveHost(string $host): array
            {
                return [];
            }
        };

        $this->expectException(LinkPreviewException::class);
        $fetcher->fetchHtml('http://inconnu.example/');
    }
}