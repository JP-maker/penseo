<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CategoryController;
use App\Http\Controllers\LinkPreviewController;
use App\Http\Controllers\NoteController;
use App\Http\Controllers\CaptchaController;
use App\Http\Middleware\RequireHuman;
use Illuminate\Support\Facades\Route;

// Ouvert aux visiteurs sans compte (mode local) : la limite de débit protège le serveur.
Route::get('/link-preview', LinkPreviewController::class)->middleware('throttle:60,1');

// Anti force brute : 5 essais par minute et par IP.
// shortcut: limite par IP seulement ; à passer en IP + email si des utilisateurs partagent une IP (NAT).
Route::get('/captcha', CaptchaController::class)->middleware('throttle:30,1');
Route::post('/register', [AuthController::class, 'register'])->middleware(['throttle:5,1', RequireHuman::class]);
Route::post('/login', [AuthController::class, 'login'])->middleware(['throttle:5,1', RequireHuman::class]);

// 240 requêtes/min par utilisateur : l'import des notes locales se fait par une requête par note.
// shortcut: un import de plus de 240 éléments sera freiné ; le front devra réessayer.
Route::middleware(['auth:sanctum', 'throttle:240,1'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/user', [AuthController::class, 'me']);

    Route::get('/notes', [NoteController::class, 'index']);
    Route::put('/notes/{id}', [NoteController::class, 'upsert'])->whereUuid('id');
    Route::delete('/notes/{id}', [NoteController::class, 'destroy'])->whereUuid('id');

    Route::get('/categories', [CategoryController::class, 'index']);
    Route::put('/categories/{id}', [CategoryController::class, 'upsert'])->whereUuid('id');
    Route::delete('/categories/{id}', [CategoryController::class, 'destroy'])->whereUuid('id');
});