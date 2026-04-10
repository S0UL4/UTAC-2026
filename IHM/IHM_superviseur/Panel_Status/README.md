<<<<<<< HEAD
# 🚗 Projet IHM & IA - Véhicule Citroën Ami (UTAC x ESIGELEC)

![Badge Statut](https://img.shields.io/badge/Statut-En_développement-blue)
![Badge ESIGELEC](https://img.shields.io/badge/École-ESIGELEC-red)
![Badge Partenaire](https://img.shields.io/badge/Partenaire-UTAC-black)

## 📖 Présentation du Projet

Ce projet est réalisé par des étudiants de l'**ESIGELEC** en partenariat avec l'**UTAC**. L'objectif principal est de concevoir et développer un système complet alliant **Intelligence Artificielle (IA)** et **Interface Homme-Machine (IHM)** pour la supervision, l'analyse et le contrôle d'un véhicule instrumenté (Citroën Ami).

L'interface permet aux opérateurs (en bord de piste ou à distance) de visualiser les données des capteurs en temps réel, de suivre la position du véhicule sur une carte dynamique, et d'exploiter les inférences des modèles d'IA embarqués.

## ✨ Fonctionnalités Principales

* **🌍 Cartographie Dynamique :** Suivi GPS en temps réel du véhicule (et du poste de contrôle) sur une carte intégrée via une extension personnalisée **MapLibre** pour Foxglove.
* **📊 Télémétrie en Temps Réel :** Affichage des données capteurs (vitesse, angle de braquage, état de la batterie) via les flux ROS/ROS2.
* **🧠 Intégration IA :** * Détection d'obstacles et de panneaux (Computer Vision).
  * Analyse prédictive de trajectoire.
  * *[À compléter : ajoutez ici vos modèles d'IA spécifiques]*
* **🎛️ IHM Modulaire :** Interface de supervision basée sur **Foxglove Studio**, permettant des layouts personnalisables selon le profil de l'utilisateur (Ingénieur IA, Opérateur UTAC, etc.).

## 🛠️ Stack Technique

### IHM (Interface Homme-Machine)
* **[Foxglove Studio](https://foxglove.dev/)** : Plateforme de visualisation robotique.
* **React & TypeScript** : Pour le développement des extensions personnalisées (Custom Panels).
* **MapLibre GL JS** : Moteur de rendu cartographique.

### IA & Backend Embarqué
* **ROS / ROS2** : Middleware pour la communication inter-processus et la gestion des nœuds capteurs/actionneurs.
* **Python** : Langage principal pour le backend et l'IA.
* **PyTorch / TensorFlow / OpenCV** : *[À adapter selon les frameworks IA que vous utilisez]* pour la vision par ordinateur et les réseaux de neurones.

## 🚀 Installation & Lancement

### 1. Prérequis
* **Node.js** (v18+)
* **Foxglove Studio** (Application de bureau recommandée)
* **ROS/ROS2** (installé sur le véhicule ou le PC de simulation)

### 2. Lancement de l'extension IHM (Cartographie)
Clonez le dépôt et naviguez dans le dossier de l'extension de l'IHM :

```bash
git clone [https://github.com/votre-organisation/projet-ami-utac.git](https://github.com/votre-organisation/projet-ami-utac.git)
cd projet-ami-utac/ihm-extensions/map-tracker
=======
# 🚗 Foxglove – Statut Véhicule

Extension (panel) Foxglove Studio qui affiche en temps réel si un véhicule autonome est :

| État | Couleur | Déclencheur |
|------|---------|-------------|
| **LIBRE** | 🟢 Vert | Véhicule disponible, pas de passager |
| **OCCUPÉ** | 🔴 Rouge | Passager à bord, course en cours |
| **EN DÉPLACEMENT** | 🟡 Jaune | Véhicule en mouvement (vitesse > seuil) |
| **INCONNU** | ⚫ Gris | Aucune donnée reçue |

---

## Structure du projet

```
foxglove-vehicle-status/
├── src/
│   ├── index.ts                 # Point d'entrée, enregistre le panel
│   └── VehicleStatusPanel.tsx   # Composant React principal
├── package.json
└── tsconfig.json
```

---

## Installation & Build

### Prérequis
- Node.js ≥ 18
- npm ≥ 9

```bash
# 1. Installer les dépendances
npm install

# 2. Compiler TypeScript → JavaScript
npm run build

# 3. (optionnel) Créer le .foxe pour l'import Foxglove
npm run package
```

Après `npm run build`, le fichier `dist/index.js` est généré.

---

## Charger l'extension dans Foxglove Studio

### Option A – Extension locale (développement)
1. Ouvrir **Foxglove Studio**
2. Menu → **Extensions** → **Install from file…**
3. Sélectionner le dossier `foxglove-vehicle-status/` ou le fichier `.foxe`

### Option B – Via Foxglove Extension Registry
Publier avec `foxglove-extension package` puis importer le `.foxe`.

---

## Topics ROS supportés

Le panel s'abonne à `/vehicle/status` par défaut (modifiable dans l'UI).

### Format 1 – `std_msgs/String`
```
data: "free"       # ou "libre", "available"
data: "occupied"   # ou "occupé", "busy"
data: "moving"     # ou "en déplacement", "driving"
```

### Format 2 – Message personnalisé avec champ `state`
```json
{ "state": "occupied" }
```

### Format 3 – Booléens
```json
{ "is_occupied": true, "is_moving": false }
```

### Format 4 – Avec vitesse (dérivation automatique)
```json
{ "speed": 2.5, "is_occupied": true }
```
→ Si `speed > 0.1 m/s` → **EN DÉPLACEMENT**

---

## Exemple ROS 2 (publication de test)

```bash
# Véhicule libre
ros2 topic pub /vehicle/status std_msgs/String "data: 'free'" -r 1

# Véhicule occupé
ros2 topic pub /vehicle/status std_msgs/String "data: 'occupied'" -r 1

# En déplacement
ros2 topic pub /vehicle/status std_msgs/String "data: 'moving'" -r 1
```

---

## Personnalisation

Dans le panel, vous pouvez :
- **Changer le topic** via le champ en bas du panel → Entrée ou bouton "Appliquer"
- Le **seuil de vitesse** est configurable dans `config.movingThresholdMs` (défaut : 0.1 m/s)

---

## Métriques affichées

- **Messages** : nombre de messages reçus depuis l'ouverture
- **Dernier msg** : temps écoulé depuis le dernier message (rouge si > 5 s)
- **Vitesse** : affiché si le message contient un champ `speed`
- **Occupé** : affiché si le message contient un champ `is_occupied`
>>>>>>> 25f9be6 (feat: Creation of the status panel)
