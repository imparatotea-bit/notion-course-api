# Notion Course Creator API

API pour créer des cours dans Notion depuis ChatGPT.

## Déploiement

```bash
# Railway
railway login && railway init && railway up

# Ou Docker
docker build -t notion-api . && docker run -p 3000:3000 notion-api
```

## CustomGPT

1. ChatGPT → Create GPT → Actions
2. Coller `openapi.yaml` (remplacer l'URL)
3. Auth: None

## Endpoint principal

```
POST /api/create-course
```

Voir `/api/block-types` pour les types de blocs disponibles.
