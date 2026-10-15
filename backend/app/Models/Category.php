<?php

declare(strict_types=1);

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Model;

class Category extends Model
{
    use HasUuids;

    // user_id et id ne sont jamais remplis depuis la requête : le contrôleur les fixe lui-même.
     protected $fillable = ['name', 'color'];
}