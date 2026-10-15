<?php

declare(strict_types=1);

namespace App\Services\LinkPreview;

/**
 * Télécharge une page HTML choisie par l'utilisateur sans jamais atteindre le réseau interne (anti-SSRF).
 * On utilise curl directement : c'est le seul moyen d'imposer l'IP vérifiée et de plafonner la taille.
 */
class SafeFetcher
{
    private const MAX_REDIRECTS = 3;
    private const MAX_BYTES = 524_288; // 512 Ko : les balises <meta> sont dans le <head>, au début
    private const ALLOWED_PORTS = [80, 443];

    /** @throws LinkPreviewException */
    public function fetchHtml(string $url): string
    {
        for ($redirects = 0; $redirects <= self::MAX_REDIRECTS; $redirects++) {
            // Chaque URL, y compris celle d'une redirection, repasse par la validation.
            [$host, $port, $ip] = $this->validate($url);
            $response = $this->download($url, $host, $port, $ip);

            $isRedirect = $response['status'] >= 300 && $response['status'] < 400;
            if ($isRedirect && isset($response['headers']['location'])) {
                $url = $this->absolute($response['headers']['location'], $url);
                continue;
            }
            if ($response['status'] !== 200) {
                throw new LinkPreviewException('Statut HTTP inattendu.');
            }
            if (!preg_match('#^(text/html|application/xhtml\+xml)#i', $response['headers']['content-type'] ?? '')) {
                throw new LinkPreviewException('Ce lien n\'est pas une page HTML.');
            }

            return $response['body'];
        }

        throw new LinkPreviewException('Trop de redirections.');
    }

    /**
     * Vérifie l'URL et retourne [hôte, port, IP publique à utiliser].
     *
     * @return array{0: string, 1: int, 2: string}
     * @throws LinkPreviewException
     */
    private function validate(string $url): array
    {
        $parts = parse_url($url);
        if ($parts === false || !isset($parts['scheme'], $parts['host'])) {
            throw new LinkPreviewException('URL invalide.');
        }

        $scheme = strtolower($parts['scheme']);
        if (!in_array($scheme, ['http', 'https'], true)) {
            throw new LinkPreviewException('Schéma interdit.');
        }
        if (isset($parts['user']) || isset($parts['pass'])) {
            throw new LinkPreviewException('Identifiants dans l\'URL interdits.');
        }

        $port = $parts['port'] ?? ($scheme === 'https' ? 443 : 80);
        if (!in_array($port, self::ALLOWED_PORTS, true)) {
            throw new LinkPreviewException('Port interdit.');
        }

        $host = trim($parts['host'], '[]'); // retire les crochets d'une IPv6 littérale
        $ips = $this->resolveHost($host);
        // Une seule IP interne suffit à refuser : on ne devine pas laquelle curl choisirait.
        // Aucune IP trouvée = refus aussi (on échoue du côté sûr).
        if ($ips === [] || array_filter($ips, fn (string $ip) => !$this->isPublic($ip)) !== []) {
            throw new LinkPreviewException('Adresse non publique.');
        }

        return [$host, $port, $ips[0]];
    }

    /**
     * IP du nom d'hôte. Surchargeable pour les tests.
     * dns_get_record interroge le DNS tel quel : pas d'interprétation des formes exotiques
     * comme http://2130706433/ (= 127.0.0.1), qui ne résolvent donc rien et sont refusées.
     *
     * @return list<string>
     */
    protected function resolveHost(string $host): array
    {
        if (filter_var($host, FILTER_VALIDATE_IP) !== false) {
            return [$host];
        }

        $records = @dns_get_record($host, DNS_A | DNS_AAAA) ?: [];

        return array_values(array_map(fn (array $r) => $r['ip'] ?? $r['ipv6'], $records));
    }

    private function isPublic(string $ip): bool
    {
        $flags = FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE;
        if (filter_var($ip, FILTER_VALIDATE_IP, $flags) === false) {
            return false;
        }
        // Non couverts par les filtres PHP : IPv4 mappée en IPv6 (::ffff:127.0.0.1) et CGNAT 100.64.0.0/10.
        if (str_starts_with(strtolower($ip), '::ffff:')) {
            return false;
        }
        $long = ip2long($ip);

        return $long === false || ($long & 0xFFC00000) !== 0x64400000;
    }

    /**
     * Résout l'en-tête Location d'une redirection.
     * shortcut: seules les redirections absolues ou "/chemin" sont suivies, pas "../x" ;
     * à compléter si des liens courants échouent.
     */
    private function absolute(string $location, string $base): string
    {
        if (preg_match('#^https?://#i', $location) === 1) {
            return $location;
        }
        if (str_starts_with($location, '/') && !str_starts_with($location, '//')) {
            $p = parse_url($base);

            return $p['scheme'] . '://' . $p['host'] . (isset($p['port']) ? ':' . $p['port'] : '') . $location;
        }

        throw new LinkPreviewException('Redirection non gérée.');
    }

    /**
     * Une requête, sans suivre de redirection.
     *
     * @return array{status: int, headers: array<string, string>, body: string}
     */
    private function download(string $url, string $host, int $port, string $ip): array
    {
        $headers = [];
        $body = '';
        // Une IPv6 s'écrit entre crochets dans l'option RESOLVE de curl.
        $address = str_contains($ip, ':') ? "[$ip]" : $ip;

        $curl = curl_init($url);
        curl_setopt_array($curl, [
            // Impose l'IP déjà vérifiée : curl ne refait pas de résolution DNS (anti DNS rebinding).
            CURLOPT_RESOLVE => ["$host:$port:$address"],
            CURLOPT_FOLLOWLOCATION => false,
            CURLOPT_PROTOCOLS => CURLPROTO_HTTP | CURLPROTO_HTTPS,
            CURLOPT_CONNECTTIMEOUT => 3,
            CURLOPT_TIMEOUT => 5,
            CURLOPT_USERAGENT => 'PenseoLinkPreview/1.0',
            CURLOPT_HTTPHEADER => ['Accept: text/html,application/xhtml+xml'],
            CURLOPT_ENCODING => '', // accepte gzip ; la taille plafonnée ci-dessous est celle décompressée
            CURLOPT_HEADERFUNCTION => function ($curl, string $line) use (&$headers): int {
                if (str_contains($line, ':')) {
                    [$name, $value] = explode(':', $line, 2);
                    $headers[strtolower(trim($name))] = trim($value);
                }

                return strlen($line);
            },
            CURLOPT_WRITEFUNCTION => function ($curl, string $chunk) use (&$body): int {
                $body .= $chunk;

                // Retourner 0 interrompt le transfert : on garde le début de la page, suffisant pour le <head>.
                return strlen($body) > self::MAX_BYTES ? 0 : strlen($chunk);
            },
        ]);

        $ok = curl_exec($curl);
        $errno = curl_errno($curl);
        $status = (int) curl_getinfo($curl, CURLINFO_RESPONSE_CODE);

        // CURLE_WRITE_ERROR = notre propre interruption de transfert : ce n'est pas un échec.
        if ($ok === false && $errno !== CURLE_WRITE_ERROR) {
            throw new LinkPreviewException("Échec réseau (curl $errno).");
        }

        return ['status' => $status, 'headers' => $headers, 'body' => substr($body, 0, self::MAX_BYTES)];
    }
}