<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\LinkPreview\LinkPreviewException;
use App\Services\LinkPreview\MetadataParser;
use App\Services\LinkPreview\SafeFetcher;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** GET /api/link-preview?url=… : renvoie titre, description et image de la page. */
class LinkPreviewController extends Controller
{
    public function __invoke(Request $request, SafeFetcher $fetcher, MetadataParser $parser): JsonResponse
    {
        $data = $request->validate([
            'url' => ['required', 'string', 'max:2048', 'url:http,https'],
        ]);

        try {
            $html = $fetcher->fetchHtml($data['url']);
        } catch (LinkPreviewException) {
            // Même réponse pour tous les échecs : on ne révèle pas pourquoi (réseau interne, port fermé…).
            return response()->json(['message' => 'Aperçu indisponible pour ce lien.'], 422);
        }

        return response()
            ->json(['url' => $data['url'], ...$parser->parse($html)])
            ->header('Cache-Control', 'private, max-age=86400'); // le navigateur réutilise l'aperçu 24 h
    }
}