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


## 🖼️ Visualisation des IHM

<img width="2497" height="1327" alt="Screenshot from 2026-05-26 14-39-16" src="https://github.com/user-attachments/assets/aa6c5e88-7dfa-46ce-b8e7-54d2ca19ea5e" />
<img width="2497" height="1327" alt="Screenshot from 2026-05-26 14-37-56" src="https://github.com/user-attachments/assets/871b2b34-b801-4e6e-87ff-fa040d3db96b" />


## 😪 Visualisation de la detection d'attention

<img width="1182" height="876" alt="ad1b3a5f-86ce-4124-b9ba-4b682ecbdac2" src="https://github.com/user-attachments/assets/d7c015ef-1d26-4bff-a96e-a459512b1b67" />
<img width="1182" height="876" alt="e59a2092-1598-4b44-871f-c45e37484b76" src="https://github.com/user-attachments/assets/339ffedc-a177-417d-b140-209f4a8df9cd" />
<img width="1182" height="876" alt="f746fc86-479f-4c7b-b7ec-ad69ccca1f8c" src="https://github.com/user-attachments/assets/db40c16c-afa0-4bb2-9d5a-bd6d917dbc62" />
<img width="1182" height="876" alt="973f5401-eaad-426a-858b-137b0d61adb5" src="https://github.com/user-attachments/assets/8a8633c6-89a6-4881-b4a4-0e29b4ca8c94" />
<img width="1182" height="876" alt="7e380d5c-d742-4688-b938-62f8f2630901 (1)" src="https://github.com/user-attachments/assets/84710e1b-e5d3-48d7-87ce-2ad1f22cb518" />




