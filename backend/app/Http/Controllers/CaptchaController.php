<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\Captcha\PowCaptcha;
use Illuminate\Http\JsonResponse;

/** Délivre un défi anti-robot à résoudre avant une connexion ou une inscription. */
class CaptchaController extends Controller
{
    public function __invoke(PowCaptcha $captcha): JsonResponse
    {
        return response()->json($captcha->issue())->header('Cache-Control', 'no-store');
    }
}
