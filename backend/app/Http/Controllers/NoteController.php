<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\NoteRequest;
use App\Http\Resources\NoteResource;
use App\Models\Note;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class NoteController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return NoteResource::collection($request->user()->notes()->with('categories')->latest()->get());
    }

        /** Crée la note, ou la remplace si l'id existe déjà (même contrat que NoteRepository.saveNote côté front). */
    public function upsert(NoteRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        $note = Note::findOrNew($id);
        // Un id déjà pris par un autre utilisateur est traité comme un id inconnu : 404, sans rien révéler.
        abort_if($note->exists && (int) $note->user_id !== (int) $user->id, 404);

        $data = $request->validated();
        $note->id = $id;
        $note->user_id = $user->id;
        $note->fill([
            'title' => $data['title'] ?? '',
            'content' => $data['content'] ?? '',
            'items' => $data['items'],
        ]);
        // La date d'origine n'est reprise qu'à la création : c'est elle qui conserve l'ordre à l'import.
        if (!$note->exists && isset($data['createdAt'])) {
            $note->created_at = $data['createdAt'];
        }

        // La note et ses catégories s'enregistrent ensemble, ou pas du tout.
        DB::transaction(function () use ($note, $data): void {
            $note->save();
            $note->categories()->sync($data['categoryIds']);
        });
        $note->load('categories');

        return NoteResource::make($note)->response()->setStatusCode($note->wasRecentlyCreated ? 201 : 200);
    }

    /** Idempotent : supprimer une note déjà supprimée (ou qui n'est pas la sienne) répond 204 sans rien toucher. */
    public function destroy(Request $request, string $id): Response
    {
        $request->user()->notes()->whereKey($id)->delete();

        return response()->noContent();
    }
}