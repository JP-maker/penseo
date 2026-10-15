<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Note extends Model
{
    use HasUuids;

    // Les catégories passent par la relation categories() : jamais remplies depuis la requête brute.
    protected $fillable = ['title', 'content', 'items'];

    protected function casts(): array
    {
        return ['items' => 'array'];
    }

    public function categories(): BelongsToMany
    {
        return $this->belongsToMany(Category::class);
    }
}