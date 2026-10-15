<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('categories', function (Blueprint $table) {
            // L'id est un UUID créé par le navigateur : une note ou catégorie garde le même id en local et en base.
            $table->uuid('id')->primary();
            $table->foreignId('user_id')->index()->constrained()->cascadeOnDelete();
            $table->string('name', 50);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('categories');
    }
};