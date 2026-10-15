<?php

declare(strict_types=1);

namespace App\Services\LinkPreview;

use RuntimeException;

/** Toute raison de ne pas fournir d'aperçu (URL dangereuse, réseau, page non HTML…). */
class LinkPreviewException extends RuntimeException
{
}