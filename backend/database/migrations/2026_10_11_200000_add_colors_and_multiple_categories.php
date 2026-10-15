<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Les catégories existantes prennent le bleu par défaut.
        Schema::table('categories', function (Blueprint $table) {
            $table->string('color', 7)->default('#0098ff');
        });

        // Table de liaison : supprimer une note ou une catégorie supprime seulement le lien.
        Schema::create('category_note', function (Blueprint $table) {
            $table->foreignUuid('note_id')->constrained()->cascadeOnDelete();
            $table->foreignUuid('category_id')->constrained()->cascadeOnDelete();
            $table->primary(['note_id', 'category_id']);
        });

        // Reporte la catégorie déjà attribuée à chaque note.
        DB::statement('insert into category_note (note_id, category_id) select id, category_id from notes where category_id is not null');

        Schema::table('notes', function (Blueprint $table) {
            $table->dropConstrainedForeignId('category_id');
        });
    }

    /** shortcut: le retour en arrière ne garde qu'une seule catégorie par note. */
    public function down(): void
    {
        Schema::table('notes', function (Blueprint $table) {
            $table->foreignUuid('category_id')->nullable()->constrained()->nullOnDelete();
        });
        DB::statement('update notes set category_id = (select category_id from category_note where note_id = notes.id limit 1)');

        Schema::dropIfExists('category_note');
        Schema::table('categories', function (Blueprint $table) {
            $table->dropColumn('color');
        });
    }
};