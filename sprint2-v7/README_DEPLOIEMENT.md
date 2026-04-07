# DÉPLOIEMENT — aides.lykylabel.com
# LYKY LABEL FRANCE — Sprint 2
# OVH Pro cluster028

## STRUCTURE DES FICHIERS

```
aides.lykylabel.com/
├── .htaccess                    ← Redirect HTTPS + sécurité + protection /engine
├── public/
│   └── index.html               ← Questionnaire (contient critères + moteur inline)
├── engine/
│   ├── aides_criteres.js        ← Source de vérité critères (Node.js + inline HTML)
│   ├── matcher.js               ← Moteur de matching (Node.js)
│   └── tests_matcher.js         ← Suite de tests (node tests_matcher.js)
├── data/
│   └── dispositifs.json         ← Base JSON (Sprint 1 — à uploader)
├── backend/
│   ├── leads-store.php          ← Stockage leads Airtable (Sprint 3)
│   ├── pdf-generator.php        ← Génération PDF (Sprint 3)
│   ├── gmail-sender.php         ← Envoi email (Sprint 3)
│   └── email-cron.php           ← Séquence J+3/J+7 (Sprint 3)
└── client/
    ├── auth.php                 ← Auth OAuth + sessions (Sprint 5)
    ├── login.php                ← Page login (Sprint 5)
    └── index.php                ← Dashboard client (Sprint 5)
```

## ÉTAPES DE DÉPLOIEMENT SPRINT 2

### 1. Upload via FTP (FileZilla ou client OVH)
- Hôte : ftp.cluster028.hosting.ovh.net
- Dossier distant : /www/ (ou /htdocs/ selon config)
- Uploader TOUS les fichiers en conservant la structure

### 2. Vérifier que index.html est à la racine
- URL cible : https://aides.lykylabel.com
- Le fichier doit être à /www/index.html OU /www/public/index.html
  selon si le sous-domaine pointe sur /www/ ou /www/public/

### 3. Vérifier le .htaccess
- Tester http://aides.lykylabel.com → doit rediriger vers https://
- Tester https://aides.lykylabel.com/engine/aides_criteres.js → doit retourner 403

### 4. Test fonctionnel
- Remplir le questionnaire complet sur mobile ET desktop
- Vérifier que les aides s'affichent correctement
- Tester un profil B (SASU IS TPE + SPPF + album) → doit afficher CIPP, CNM, SPPF

## AVANT CHAQUE MODIFICATION DE CRITÈRES

```bash
# Toujours lancer les tests avant de toucher aides_criteres.js
cd engine/
node tests_matcher.js
# Doit afficher : 25 tests passés / 25 total ✅
# Si un test échoue : NE PAS DÉPLOYER
```

## VARIABLES D'ENVIRONNEMENT (Sprint 3+)

Créer un fichier /backend/config.php (NE PAS versionner) :

```php
<?php
define('AIRTABLE_API_KEY',     'patXXXXXXXXXXXXXX');
define('AIRTABLE_BASE_ID',     'appZmZKlRtKPyDHdp');
define('AIRTABLE_TABLE_LEADS', 'tbl9Ks5qf2gAbkkgf');
define('GMAIL_ACCESS_TOKEN',   'ya29.XXXXXX');
define('GMAIL_REFRESH_TOKEN',  '1//XXXXXX');
define('GMAIL_CLIENT_ID',      'XXXXXX.apps.googleusercontent.com');
define('GMAIL_CLIENT_SECRET',  'XXXXXX');
define('ANTHROPIC_API_KEY',    'sk-ant-XXXXXX');
```

## CHECKLIST AVANT MISE EN LIGNE

- [ ] node tests_matcher.js → 25/25 ✅
- [ ] Questionnaire testé en local (ouvrir index.html dans Chrome)
- [ ] Upload FTP complet
- [ ] Redirect HTTP→HTTPS opérationnelle
- [ ] /engine/ retourne 403 (fichiers protégés)
- [ ] Questionnaire chargé sur mobile
- [ ] Profil B complet testé → aides correctes
- [ ] CTA lead (email) → console.log visible (Sprint 3 à brancher)
