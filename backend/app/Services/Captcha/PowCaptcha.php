<?php

declare(strict_types=1);

namespace App\Services\Captcha;

use Illuminate\Support\Facades\Cache;

/**
 * Anti-robot par preuve de travail (même principe qu'ALTCHA), sans service tiers ni cookie.
 *
 * Le serveur choisit un nombre secret N, publie sha256(sel . N) et signe le tout (HMAC). Le navigateur doit
 * retrouver N en essayant les nombres un par un : quelques dixièmes de seconde pour un humain, mais un coût
 * réel pour qui tente des milliers d'inscriptions. Aucun état côté serveur, sauf pour interdire de réutiliser
 * une même réponse.
 */
final class PowCaptcha
{
    /** Plus ce nombre est grand, plus le calcul est long (moyenne : la moitié des essais). */
    public const MAX_NUMBER = 30000;

    /** Durée de validité d'un défi, en secondes. */
    public const TTL = 300;

    /** @return array{algorithm: string, challenge: string, salt: string, signature: string, maxnumber: int} */
    public function issue(): array
    {
        $number = random_int(0, self::MAX_NUMBER);
        // L'expiration est dans le sel : elle est donc couverte par la signature, et non modifiable.
        $salt = bin2hex(random_bytes(12)).'.'.(now()->timestamp + self::TTL);
        $challenge = hash('sha256', $salt.$number);

        return [
            'algorithm' => 'SHA-256',
            'challenge' => $challenge,
            'salt' => $salt,
            'signature' => $this->sign($challenge, $salt),
            'maxnumber' => self::MAX_NUMBER,
        ];
    }

    /** Vrai si la réponse (JSON en base64) est valide, non expirée et jamais utilisée. */
    public function verify(mixed $payload): bool
    {
        if (!is_string($payload) || $payload === '' || strlen($payload) > 1000) {
            return false;
        }
        $json = base64_decode($payload, true);
        $data = $json === false ? null : json_decode($json, true);
        if (!is_array($data)) {
            return false;
        }

        $challenge = $data['challenge'] ?? null;
        $salt = $data['salt'] ?? null;
        $signature = $data['signature'] ?? null;
        $number = $data['number'] ?? null;
        if (!is_string($challenge) || !is_string($salt) || !is_string($signature)
            || !is_int($number) || $number < 0 || $number > self::MAX_NUMBER) {
            return false;
        }

        // 1. Le défi vient bien de nous (avant tout accès au cache : on ne le remplit pas avec des faux).
        if (!hash_equals($this->sign($challenge, $salt), $signature)) {
            return false;
        }
        // 2. Il n'a pas expiré.
        $parts = explode('.', $salt);
        if (count($parts) !== 2 || !ctype_digit($parts[1]) || (int) $parts[1] < now()->timestamp) {
            return false;
        }
        // 3. Le nombre proposé est le bon.
        if (!hash_equals($challenge, hash('sha256', $salt.$number))) {
            return false;
        }

        // 4. Usage unique : add() échoue si la signature a déjà été vue.
        return Cache::add('captcha:'.$signature, 1, self::TTL);
    }

    private function sign(string $challenge, string $salt): string
    {
        return hash_hmac('sha256', $challenge.'|'.$salt, (string) config('app.key'));
    }
}
