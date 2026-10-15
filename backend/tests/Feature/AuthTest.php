<?php

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    private const PASSWORD = 'correct-horse-battery';

    protected function setUp(): void
    {
        parent::setUp();
        // Sanctum ne démarre la session que pour les requêtes venant du front déclaré.
        config(['sanctum.stateful' => ['localhost:4200']]);
        $this->withHeader('Origin', 'http://localhost:4200');
    }

    public function test_l_inscription_cree_le_compte_et_connecte(): void
    {
        $this->postJson('/api/register', [
            'name' => 'Alice', 'email' => 'Alice@Example.test', 'password' => self::PASSWORD,
        ])->assertCreated()->assertExactJson(['name' => 'Alice', 'email' => 'alice@example.test']);

        $user = User::firstOrFail();
        $this->assertNotSame(self::PASSWORD, $user->password);
        $this->assertTrue(Hash::check(self::PASSWORD, $user->password));
        $this->assertAuthenticatedAs($user);
    }

    public function test_l_inscription_refuse_un_mot_de_passe_trop_court(): void
    {
        $this->postJson('/api/register', ['name' => 'A', 'email' => 'a@example.test', 'password' => 'court'])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('password');
    }

    public function test_l_inscription_refuse_un_email_deja_pris_meme_en_majuscules(): void
    {
        User::factory()->create(['email' => 'alice@example.test']);

        $this->postJson('/api/register', [
            'name' => 'Alice 2', 'email' => 'ALICE@example.test', 'password' => self::PASSWORD,
        ])->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_la_connexion_ouvre_la_session(): void
    {
        $user = User::factory()->create(['password' => self::PASSWORD]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => self::PASSWORD])
            ->assertOk()
            ->assertJson(['email' => $user->email]);

        $this->assertAuthenticatedAs($user);
    }

    public function test_la_connexion_echoue_avec_un_message_generique(): void
    {
        $user = User::factory()->create(['password' => self::PASSWORD]);

        $this->postJson('/api/login', ['email' => $user->email, 'password' => 'mauvais-mot-de-passe'])
            ->assertUnprocessable()
            ->assertExactJson(['message' => 'Identifiants invalides.']);

        $this->assertGuest();
    }

    public function test_la_connexion_est_limitee_en_debit(): void
    {
        for ($i = 0; $i < 5; $i++) {
            $this->postJson('/api/login', ['email' => 'x@example.test', 'password' => 'nope'])->assertUnprocessable();
        }

        $this->postJson('/api/login', ['email' => 'x@example.test', 'password' => 'nope'])->assertStatus(429);
    }

    public function test_user_exige_d_etre_connecte(): void
    {
        $this->getJson('/api/user')->assertUnauthorized();
    }

    public function test_user_retourne_le_profil(): void
    {
        $user = User::factory()->create();
        Sanctum::actingAs($user);

        $this->getJson('/api/user')->assertOk()->assertExactJson(['name' => $user->name, 'email' => $user->email]);
    }

    public function test_la_deconnexion_ferme_la_session(): void
    {
        $this->actingAs(User::factory()->create(), 'web')->postJson('/api/logout')->assertNoContent();

        $this->assertGuest('web');
    }
}