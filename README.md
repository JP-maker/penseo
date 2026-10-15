# Penséo

Application de prise de notes inspirée de Google Keep : notes en texte enrichi, listes à cocher, catégories colorées, aperçu de liens, avec ou sans compte.

Projet personnel, développé pas à pas avec une attention particulière à la sécurité (OWASP), à la lisibilité du code (clean code, SOLID) et aux tests.

## Fonctionnalités

- **Notes** : titre, texte avec mise en forme légère (gras, italique, barré, titres, listes, liens, code) et **listes à cocher** (Entrée crée la case suivante).
- **Catégories** : couleur au choix, plusieurs catégories par note, compteur par catégorie, filtre en un clic.
- **Recherche** dans les titres, textes, cases à cocher et catégories (sans tenir compte des accents ni de la casse).
- **Aperçu d'URL** : titre, description et image d'un lien collé dans une note.
- **Deux modes de stockage** : sans compte, les notes restent dans le navigateur. Avec un compte, elles sont enregistrées sur le serveur, et les notes locales sont importées à la première connexion.
- **Interface adaptée au téléphone** : mosaïque de cartes teintées selon la catégorie, bouton « + » à portée du pouce, saisie dans une feuille coulissante.
- **Retours à l'utilisateur** : indicateurs de chargement, messages d'erreur génériques, enregistrement optimiste des cases cochées.

## Technologies

| Couche | Choix |
| --- | --- |
| Frontend | Angular (composants autonomes, signaux), SCSS, tests avec Vitest |
| Backend | Laravel (PHP 8.4), API JSON, authentification par session avec Sanctum |
| Base de données | PostgreSQL 17 |
| Outillage | Docker Compose |

## Lancer le projet

Prérequis : [Docker](https://www.docker.com/) avec Docker Compose.

```bash
git clone https://github.com/JP-maker/penseo.git
cd penseo

# Variables d'environnement (à adapter, surtout le mot de passe)
cp .env.example .env
cp backend/.env.example backend/.env

# Démarrage
docker compose up -d --build

# Clé de l'application et tables de la base
docker compose exec backend php artisan key:generate
docker compose exec backend php artisan migrate
```

- Application : <http://localhost:4200>
- API : <http://localhost:8000> (le frontend la joint par un proxy, sur `/api` et `/sanctum`)

Les ports sont ouverts uniquement sur `127.0.0.1`.

Pour arrêter : `docker compose down` (les données sont conservées ; ajouter `-v` pour supprimer aussi la base).

## Tests

```bash
# Backend : tests unitaires et fonctionnels de l'API (base dédiée)
docker compose exec -T db psql -U penseo -c "CREATE DATABASE penseo_test;"   # une seule fois
docker compose exec -T backend php artisan test

# Frontend
docker compose exec -T frontend npx ng test --no-watch
```

## Architecture

- **Frontend** : le magasin de notes (`NotesStore`) ne connaît pas l'origine des données. Il passe par une abstraction `NoteRepository`, avec trois implémentations : navigateur (`LocalNoteRepository`), serveur (`HttpNoteRepository`) et un routeur qui choisit selon que l'utilisateur est connecté (`RoutingNoteRepository`). Un changement de stockage n'impose donc aucune modification de l'interface.
- **Enregistrements** : mise à jour optimiste de l'écran, puis envoi au serveur, une note à la fois, pour qu'aucune coche rapide ne soit perdue.
- **Backend** : contrôleurs fins, validation dans des `FormRequest`, réponses mises en forme par des `Resource`. Les identifiants sont des UUID générés côté client, ce qui permet de créer et de modifier par un même appel (`PUT`).

## Sécurité

- Session par cookie `HttpOnly` avec protection CSRF (Sanctum) ; aucun jeton stocké dans le navigateur.
- Mot de passe d'au moins 12 caractères, régénération de la session à la connexion, limitation du débit des appels sensibles.
- Contenu des notes toujours échappé à l'affichage : le Markdown est converti en éléments du DOM, jamais injecté en HTML ; les liens sont limités à `http` et `https` avec `rel="noopener noreferrer"`.
- **Aperçu d'URL protégé contre les attaques SSRF** : adresses publiques uniquement, résolution DNS fixée pour la requête, ports 80 et 443, redirections revalidées, taille de réponse limitée.
- Messages d'erreur génériques côté client.
- Aucun secret dans le dépôt : les fichiers `.env` sont ignorés, seuls les modèles `.env.example` sont versionnés.

## Feuille de route

- Mise en production (images Docker dédiées, HTTPS, cookies sécurisés) et pipeline d'intégration continue.
- Modification et renommage des catégories.
- Mise en évidence du terme recherché dans les cartes.
