<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use App\Services\Captcha\PowCaptcha;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CaptchaTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'correct-horse-battery';

    protected function setUp(): void
    {
        parent::setUp();
        config(['captcha.enabled' => true, 'sanctum.stateful' => ['localhost:4200']]);
        $this->withHeader('Origin', 'http://localhost:4200');
    }

    /** Fait comme le navigateur : cherche le nombre dont le hachage donne le défi. */
    private function solve(?array $challenge = null): string
    {
        $challenge ??= $this->getJson('/api/captcha')->assertOk()->json();
        for ($number = 0; $number <= $challenge['maxnumber']; $number++) {
            if (hash('sha256', $challenge['salt'].$number) === $challenge['challenge']) {
                return base64_encode(json_encode([
                    'algorithm' => $challenge['algorithm'],
                    'challenge' => $challenge['challenge'],
                    'salt' => $challenge['salt'],
                    'signature' => $challenge['signature'],
                    'number' => $number,
                ]));
            }
        }
        $this->fail('Défi insoluble');
    }

    /** @return array<string, mixed> */
    private function registration(array $extra = []): array
    {
        return ['name' => 'Alice', 'email' => 'alice@example.test', 'password' => self::PASSWORD] + $extra;
    }

    public function test_le_defi_est_publie_sans_la_reponse(): void
    {
        $response = $this->getJson('/api/captcha')
            ->assertOk()
            ->assertJsonStructure(['algorithm', 'challenge', 'salt', 'signature', 'maxnumber'])
            ->assertJsonMissingPath('number');

        $this->assertStringContainsString('no-store', (string) $response->headers->get('Cache-Control'));
    }

    public function test_une_inscription_avec_un_defi_resolu_passe(): void
    {
        $this->postJson('/api/register', $this->registration(['captcha' => $this->solve(), 'website' => '']))
            ->assertCreated();
    }

    public function test_sans_reponse_au_defi_la_requete_est_refusee(): void
    {
        $this->postJson('/api/register', $this->registration())
            ->assertUnprocessable()
            ->assertJsonValidationErrors('captcha');
        $this->assertDatabaseCount('users', 0);
    }

    public function test_le_champ_piege_rempli_est_refuse(): void
    {
        $this->postJson('/api/register', $this->registration(['captcha' => $this->solve(), 'website' => 'http://spam.test']))
            ->assertUnprocessable()
            ->assertJsonValidationErrors('captcha');
    }

    public function test_une_reponse_ne_sert_qu_une_fois(): void
    {
        $captcha = $this->solve();
        $credentials = ['email' => 'x@example.test', 'password' => 'nope', 'captcha' => $captcha];

        // La 1re passe le contrôle anti-robot et échoue ensuite sur les identifiants.
        $this->postJson('/api/login', $credentials)->assertUnprocessable()->assertJsonPath('message', 'Identifiants invalides.');
        // La 2e, avec la même réponse, est stoppée avant.
        $this->postJson('/api/login', $credentials)->assertJsonValidationErrors('captcha');
    }

    public function test_une_reponse_modifiee_est_refusee(): void
    {
        $data = json_decode(base64_decode($this->solve()), true);
        $data['signature'] = str_repeat('0', 64);

        $this->postJson('/api/login', ['email' => 'x@example.test', 'password' => 'nope', 'captcha' => base64_encode(json_encode($data))])
            ->assertJsonValidationErrors('captcha');
    }

    public function test_un_mauvais_nombre_est_refuse(): void
    {
        $data = json_decode(base64_decode($this->solve()), true);
        $data['number'] = ($data['number'] + 1) % (PowCaptcha::MAX_NUMBER + 1);

        $this->postJson('/api/login', ['email' => 'x@example.test', 'password' => 'nope', 'captcha' => base64_encode(json_encode($data))])
            ->assertJsonValidationErrors('captcha');
    }

    public function test_un_defi_expire_est_refuse(): void
    {
        $captcha = $this->solve();
        $this->travel(PowCaptcha::TTL + 1)->seconds();

        $this->postJson('/api/login', ['email' => 'x@example.test', 'password' => 'nope', 'captcha' => $captcha])
            ->assertJsonValidationErrors('captcha');
    }

    public function test_une_connexion_valide_fonctionne_avec_le_defi(): void
    {
        $user = User::factory()->create(['password' => self::PASSWORD]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => self::PASSWORD, 'captcha' => $this->solve()])
            ->assertOk();
    }

    public function test_la_garde_peut_etre_desactivee_par_la_configuration(): void
    {
        config(['captcha.enabled' => false]);

        $this->postJson('/api/register', $this->registration())->assertCreated();
    }
}
