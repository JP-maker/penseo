<?php

return [
    // Désactivé uniquement par les tests existants (phpunit.xml) ; toujours actif en développement et en production.
    'enabled' => env('CAPTCHA_ENABLED', true),
];
