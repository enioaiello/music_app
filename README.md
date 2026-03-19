# music-library

## À propos de music-library

**music-library** est une interface web frontend qui permet de visualiser et naviguer dans une bibliothèque musicale personnelle stockée dans un fichier JSON. Inspirée de l'interface d'iTunes, elle offre une vue en trois colonnes — artistes, albums, pistes — avec récupération automatique des covers et des métadonnées via des APIs gratuites.

Ce projet a été réalisé par [Claude](https://claude.ai) (Anthropic) à des fins d'apprentissage, afin d'explorer la structuration d'un frontend vanilla (HTML / CSS / JS) avec Bootstrap, la consommation d'APIs publiques sans clé, et la gestion de données JSON côté client.

## Fonctionnalités

- 🎵 Vue par artistes, albums et pistes à la manière d'iTunes
- 🔍 Recherche dynamique en temps réel (artiste, album, genre, année, titre)
- 🖼️ Récupération automatique des covers via [MusicBrainz](https://musicbrainz.org) + [Cover Art Archive](https://coverartarchive.org) (gratuit, sans clé API)
- ⏱️ Durée des pistes récupérée depuis MusicBrainz
- 📁 Bibliothèque pilotée par un simple fichier `music_library.json`
- 🎨 Thème sombre avec Bootstrap 5

## Arborescence

```
├── assets
│   ├── css
│   │   └── style.css
│   ├── data
│   │   └── music_library.json
│   ├── images
│   │   └── default_cover.svg
│   └── js
│       └── script.js
├── index.html
```

## Format du fichier JSON

```json
[
  {
    "album": "21",
    "artist": "Adele",
    "year": "2011",
    "genre": "Soft Pop",
    "titles": ["Rolling in the Deep", "Someone Like You"]
  }
]
```

## Installation

### Clonez le dépôt

```
git clone https://github.com/enioaiello/music-library.git
```

### Lancez un serveur local

Le projet nécessite un serveur HTTP local pour charger le fichier JSON (le protocole `file://` est bloqué par les navigateurs).

```bash
cd music-library
python3 -m http.server 8080
```

Puis ouvrez [http://localhost:8080](http://localhost:8080) dans votre navigateur.

## Technologies utilisées

- [Bootstrap 5](https://getbootstrap.com) — mise en page et composants UI
- [Bootstrap Icons](https://icons.getbootstrap.com) — icônes
- [MusicBrainz API](https://musicbrainz.org/doc/MusicBrainz_API) — métadonnées musicales
- [Cover Art Archive](https://coverartarchive.org) — pochettes d'albums
- JavaScript vanilla — aucune dépendance supplémentaire

## Plus de projets

Plus de projets sont disponibles sur [mon GitHub](https://github.com/enioaiello) ou sur [mon portfolio](https://enioaiello.fr).
