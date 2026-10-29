# interfaceML : API d'inférence OCR manuscrit

Service Docker qui charge le pipeline du notebook `english_cursive_mvp.ipynb` et l'expose via **un seul endpoint**.

```
page JPG/PNG → Kraken BLLA (segmentation en lignes) → TrOCR microsoft/trocr-small-handwritten → texte
```

## Lancer

```bash
cp exemple.env .env              # une seule fois
make build                       # 1er build ~5 min (torch CPU, kraken, poids TrOCR intégrés à l'image)
make logs                        # attendre "Application startup complete"
```

Depuis la racine du dépôt, `make start` lance aussi ce service (avec le backend et le frontend), et `make ml-logs` affiche ses logs.

Les deux modèles sont chargés une seule fois au démarrage. Le conteneur n'a pas besoin du réseau pour tourner.
L'API écoute sur le port `ML_PORT` de l'hôte (8001 par défaut, le backend l'appelle via `MODEL_BACKEND_URL`).
En dev, `./app` est monté dans le conteneur et uvicorn recharge le code (et les modèles) à chaque modification.

## Endpoint

`POST /predict` en multipart, avec un champ `file` qui contient l'image de la page.

| Paramètre (query) | Défaut | Rôle |
|---|---|---|
| `y_tolerance` | 60 | Écart vertical max (en px) pour fusionner les fragments BLLA d'une même ligne |

```bash
curl -F "file=@samples/english_page_test.jpg" localhost:8001/predict
curl -F "file=@page.png" "localhost:8001/predict?y_tolerance=40"
```

```python
import requests

r = requests.post(
    "http://localhost:8001/predict", files={"file": open("page.jpg", "rb")}
)
print(r.json()["text"])
```

Réponse :

```json
{
  "text": "imagine a vast sheet of paper on which straight lines , Triangle\nSquares , ...",
  "lines": [{"index": 1, "text": "...", "bbox": [59, 30, 1163, 127]}, ...],
  "n_fragments": 19,
  "image_size": [1280, 926],
  "models": {"segmentation": "kraken-blla (default)", "recognition": "microsoft/trocr-small-handwritten"}
}
```

`bbox` = `[left, top, right, bottom]` en pixels de l'image d'origine.
Erreurs : `400` si le fichier n'est pas une image, `422` si `file` manque ou si aucune ligne n'est détectée.
La doc interactive est sur http://localhost:8001/docs.

## Notes

- **Mémoire** : BLLA redimensionne la page à 1800 px de haut, donc la mémoire augmente avec le ratio largeur/hauteur. Le pic est d'environ 3,4 Go pour une page de ratio 1,4, testé dans une VM Docker de 4 Go. Pour que ça passe :
  - oneDNN est désactivé (`MKLDNN=0`) ; avec oneDNN, le conteneur est tué (OOM) ;
  - une image plus large que 1,4:1 (une bande d'une seule ligne, par exemple) est complétée par du blanc en bas avant BLLA (`MAX_ASPECT`). Les bbox restent dans l'image d'origine.

  Pour plus de marge, augmentez la mémoire dans Docker Desktop → Settings → Resources.
- **Temps** : environ 35 s par page complète et environ 20 s par ligne isolée, mesurés via l'API sur CPU dans Docker (Mac). Les requêtes passent l'une après l'autre, avec un seul worker.
- **Versions** : kraken 5.3.0 impose torch 2.4, et transformers refuse les `.bin` avec torch < 2.6. On utilise donc la variante safetensors du modèle (PR #7 du dépôt HF, épinglée par commit dans le `Dockerfile`).
- Variables d'env (voir `exemple.env`) : `ML_PORT` (`8001`), `DEVICE` (`cpu` par défaut), `MKLDNN` (`0`/`1`), `MAX_ASPECT` (`1.4`), `TROCR_MODEL` / `TROCR_REVISION` (build args).

## Qualité du code

Mêmes outils que le backend (ruff + pytest), aussi lancés par la CI (`.github/workflows/ml-backend.yml`) :

```bash
pip install -r requirements-dev.txt
make format   # formate et corrige
make check    # format-check + lint + tests
```

Les tests remplacent le pipeline par un faux : ils ne chargent pas les modèles.
