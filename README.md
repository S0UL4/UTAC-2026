# 🚗 Projet IHM & IA - Véhicule Citroën Ami (UTAC x ESIGELEC)

![Badge Statut](https://img.shields.io/badge/Statut-terminé-vert)
![Badge ESIGELEC](https://img.shields.io/badge/École-ESIGELEC-red)
![Badge Partenaire](https://img.shields.io/badge/Partenaire-UTAC-black)

## 📖 Présentation du Projet

Ce projet est réalisé par des étudiants de l'**ESIGELEC** dans le cadre du projet S8 en partenariat avec l'**UTAC**. L'objectif principal est de concevoir et développer un système complet alliant **Intelligence Artificielle (IA)** et **Interface Homme-Machine (IHM)** pour la supervision, l'analyse et le contrôle d'un véhicule instrumenté (Citroën Ami).

L'interface permet aux opérateurs (en bord de piste ou à distance) de visualiser les données des capteurs en temps réel, de suivre la position du véhicule sur une carte dynamique via l'IHM superviseur.

## ✨ Fonctionnalités Principales

* **🌍 Cartographie Dynamique :** Suivi GPS en temps réel du véhicule sur une carte intégrée via un panel personnalisée **MapLibre** pour Foxglove.
* **📊 Télémétrie en Temps Réel :** Affichage des données capteurs (vitesse, état de la batterie, retour caméra et lidar) via les flux ROS2.
* **🧠 IA :** * Détection de l'inattention et freinage automatique après 3 secondes d'inattention.
* **🎛️ IHM Modulaire :** Interface de supervision basée sur **Foxglove Studio**, permettant des layouts personnalisables.

## 🛠️ Stack Technique

### IHM (Interface Homme-Machine)
* **[Foxglove Studio](https://foxglove.dev/)** : Plateforme de visualisation robotique.
* **React & TypeScript** : Pour le développement des panels personnalisées.
* **MapLibre GL JS** : Moteur de rendu cartographique.

### IA & Backend Embarqué
* **ROS2** : Middleware pour la communication inter-processus et la gestion des nœuds capteurs/actionneurs.
* **Python** : Langage principal pour le backend et l'IA.
* **MediaPiPe & OpenCV** : pour la vision par ordinateur.

## 🚀 Installation & Lancement

### 1. Prérequis
* **Node.js** (v18+)
* **Foxglove Studio** (Application de bureau recommandée)
* **ROS/ROS2** (installé sur le véhicule ou le PC de simulation)
Clonez le dépôt gihtub sur https://github.com/S0UL4/UTAC-2026 et naviguez dans le dossier /ami_ws/software/ros2 :

### 2. Lancement de la voiture

source install/setup.bash
ros2 launch ami ami.launch.xml

### 3. Lancement du foxglove bridge
source install/setup.bash
ros2 launch foxglove_bridge foxglove_bridge_launch.xml

### 4. Lancement du noeud camera_publisher
cd /home/user/Desktop/s8_ws/src/my_package
colcon build --symlink-install
source install/setup.bash
ros2 run my_package camera_publisher

### 5. Lancement du noeud Arbitre_frein
cd /home/user/Desktop/s8_ws/src/my_package
source install/setup.bash
ros2 run my_package Arbitre_frein




