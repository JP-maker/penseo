<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Http\Requests\CategoryRequest;
use App\Http\Resources\CategoryResource;
use App\Models\Category;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;

class CategoryController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        return CategoryResource::collection($request->user()->categories()->orderBy('created_at')->get());
    }

    public function upsert(CategoryRequest $request, string $id): JsonResponse
    {
        $user = $request->user();
        $category = Category::findOrNew($id);
        abort_if($category->exists && (int) $category->user_id !== (int) $user->id, 404);

        $category->id = $id;
        $category->user_id = $user->id;
        $category->name = $request->validated('name');
        $category->color = $request->validated('color');
        $category->save();

        return CategoryResource::make($category)->response()->setStatusCode($category->wasRecentlyCreated ? 201 : 200);
    }

    /** Les notes de la catégorie sont conservées : la base les passe à "sans catégorie" (nullOnDelete). */
    public function destroy(Request $request, string $id): Response
    {
        $request->user()->categories()->whereKey($id)->delete();

        return response()->noContent();
    }
}