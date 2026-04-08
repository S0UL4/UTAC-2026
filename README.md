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
