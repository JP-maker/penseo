<?php

declare(strict_types=1);

namespace App\Services\LinkPreview;

use DOMDocument;
use DOMXPath;

/** Extrait titre, description et image d'une page HTML (balises Open Graph, sinon balises classiques). */
class MetadataParser
{
    /** @return array{title: ?string, description: ?string, image: ?string} */
    public function parse(string $html): array
    {
        $dom = new DOMDocument();
        libxml_use_internal_errors(true); // le HTML du web est rarement valide : on ignore les avertissements
        // Le préfixe force l'UTF-8 ; sans lui, DOMDocument lit les accents comme du Latin-1.
        $dom->loadHTML('<?xml encoding="UTF-8">' . $html, LIBXML_NONET);
        libxml_clear_errors();
        $xpath = new DOMXPath($dom);

        $title = $this->meta($xpath, ['og:title', 'twitter:title']) ?? $xpath->evaluate('string(//title)');
        $description = $this->meta($xpath, ['og:description', 'twitter:description', 'description']);
        $image = $this->meta($xpath, ['og:image', 'twitter:image']);

        return [
            'title' => $this->clean($title, 200),
            'description' => $this->clean($description, 500),
            // Seules les images http(s) absolues passent : jamais de javascript: ni de data:.
            'image' => $image !== null && strlen($image) <= 2048 && preg_match('#^https?://#i', $image) === 1
                ? $image
                : null,
        ];
    }

    /** Première balise <meta> non vide parmi les clés données (les clés viennent du code, jamais de l'utilisateur). */
    private function meta(DOMXPath $xpath, array $keys): ?string
    {
        foreach ($keys as $key) {
            $value = $xpath->evaluate("string(//meta[@property='$key' or @name='$key']/@content)");
            if (trim($value) !== '') {
                return $value;
            }
        }

        return null;
    }

    /** Espaces normalisés, longueur limitée, null si vide. */
    private function clean(?string $text, int $max): ?string
    {
        $text = trim(preg_replace('/\s+/u', ' ', $text ?? '') ?? '');

        return $text === '' ? null : mb_substr($text, 0, $max);
    }
}