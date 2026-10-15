<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;

/** Inscription, connexion et déconnexion par session (cookie HttpOnly), jamais de token côté navigateur. */
class AuthController extends Controller
{
    public function register(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:100'],
            'email' => ['required', 'string', 'email:rfc', 'max:255', 'unique:users,email'],
            'password' => ['required', 'string', Password::min(12)->max(128)],
        ]);

        $user = User::create($data); // le mot de passe est haché par le modèle
        Auth::login($user);
        $request->session()->regenerate(); // nouvel identifiant de session : anti "session fixation"

        return response()->json($this->profile($user), 201);
    }

    public function login(Request $request): JsonResponse
    {
        $this->normalizeEmail($request);
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials)) {
            // Même message pour "email inconnu" et "mauvais mot de passe" : on ne révèle pas lequel.
            return response()->json(['message' => 'Identifiants invalides.'], 422);
        }
        $request->session()->regenerate();

        return response()->json($this->profile($request->user()));
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return response()->noContent();
    }

    /** Sert au front à savoir, au démarrage, si une session est encore ouverte. */
    public function me(Request $request): JsonResponse
    {
        return response()->json($this->profile($request->user()));
    }

    /** Les emails sont comparés en minuscules, sinon "A@x.fr" et "a@x.fr" feraient deux comptes. */
    private function normalizeEmail(Request $request): void
    {
        $request->merge(['email' => Str::lower((string) $request->input('email'))]);
    }

    /** @return array{name: string, email: string} */
    private function profile(User $user): array
    {
        return ['name' => $user->name, 'email' => $user->email];
    }
}