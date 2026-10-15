<?php

declare(strict_types=1);

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Note chiffrée dans le navigateur : `content` contient alors un bloc opaque, jamais du texte lisible. */
    public function up(): void
    {
        Schema::table('notes', function (Blueprint $table): void {
            $table->boolean('encrypted')->default(false);
        });
    }

    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table): void {
            $table->dropColumn('encrypted');
        });
    }
};
