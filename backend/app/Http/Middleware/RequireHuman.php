<?php

declare(strict_types=1);

namespace App\Http\Middleware;

use App\Services\Captcha\PowCaptcha;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Refuse la requête sans réponse valide au défi anti-robot, ou si le champ piège `website` est rempli
 * (invisible pour un humain, mais rempli par les robots qui complètent tous les champs).
 */
class RequireHuman
{
    public function __construct(private readonly PowCaptcha $captcha)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        if (!config('captcha.enabled')) {
            return $next($request);
        }

        if ($request->filled('website') || !$this->captcha->verify($request->input('captcha'))) {
            $message = 'Vérification anti-robot échouée, réessaie.';

            // Même réponse dans tous les cas : on n'indique pas au robot ce qui l'a trahi.
            return response()->json(['message' => $message, 'errors' => ['captcha' => [$message]]], 422);
        }

        return $next($request);
    }
}
