<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('notes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->index()->constrained()->cascadeOnDelete();
            // Catégorie supprimée => la note est conservée, sans catégorie (même règle que côté navigateur).
            $table->foreignUuid('category_id')->nullable()->constrained()->nullOnDelete();
            $table->string('title', 200)->default('');
            $table->text('content')->default('');
            $table->jsonb('items')->default('[]'); // la checklist
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('notes');
    }
};