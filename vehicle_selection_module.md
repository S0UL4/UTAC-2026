
# Module de supervision – Sélection d’un véhicule et affichage d’informations supplémentaires

## 1. Objectif

L’objectif de ce module est de permettre à un opérateur de supervision de visualiser plusieurs véhicules sur une carte, de sélectionner un véhicule, puis d’afficher des informations complémentaires dans un panneau latéral.

Ce module s’intègre dans une interface de supervision de flotte.

---

## 2. Fonctionnalités réalisées

Les fonctionnalités actuellement implémentées sont les suivantes :

- affichage d’une carte centrée sur la zone ESIGELEC à Rouen ;
- affichage de plusieurs véhicules sur la carte ;
- sélection d’un véhicule par clic ;
- mise en évidence visuelle du véhicule sélectionné ;
- affichage des informations détaillées du véhicule dans un panneau latéral.

---

## 3. Informations affichées

Lorsqu’un véhicule est sélectionné, les informations suivantes sont affichées :

- identifiant du véhicule ;
- statut ;
- niveau de batterie ;
- destination ;
- vitesse ;
- longitude ;
- latitude.

---

## 4. Outils et technologies utilisés

Ce prototype a été développé avec les outils suivants :

- **VS Code** pour le développement ;
- **JavaScript** pour la logique de l’interface ;
- **MapLibre GL JS** pour l’affichage cartographique ;
- **OpenStreetMap** comme fond de carte ;
- **HTML / CSS** pour la structure et la mise en forme de l’interface ;
- **Node.js** et **Vite** pour l’exécution locale du projet.

---

## 5. Structure du projet

Le projet est organisé de la manière suivante :

- `index.html` : structure principale de la page ;
- `style.css` : mise en page de l’interface et style des marqueurs ;
- `main.js` : initialisation de la carte, affichage des véhicules et gestion de la sélection ;
- `package.json` : configuration du projet et dépendances.

---

## 6. Lancement du projet

### Prérequis
- Node.js installé sur la machine ;
- npm disponible dans le terminal.

### Commandes à exécuter

```bash
npm install
npm run dev

```

---

## 7. Principe de fonctionnement

Le système utilise une liste de véhicules définie dans le fichier main.js.

Chaque véhicule possède :

- un identifiant ;
- une position géographique ;
- un statut ;
- un niveau de batterie ;
- une destination ;
- une vitesse.

Pour chaque véhicule, un marqueur est affiché sur la carte.

Quand l’utilisateur clique sur un marqueur :

- le véhicule devient le véhicule sélectionné ;
- son marqueur change d’apparence ;
- les informations détaillées sont affichées dans le panneau latéral.

---

## 8. Limites actuelles

À ce stade, ce module reste un prototype fonctionnel.

Les limites actuelles sont les suivantes :

les données des véhicules sont statiques ;
- il n’y a pas encore de connexion à une source de données temps réel ;
- il n’y a pas encore de commandes de contrôle du véhicule ;
- la précision dépend du fond de carte et des coordonnées utilisées.

---

## 9. Améliorations futures

Les améliorations envisagées sont :

- mise à jour en temps réel de la position ;
- intégration de données capteurs ;
- ajout de commandes de supervision ;
- amélioration de l’interface utilisateur ;
- connexion à un système externe de gestion de flotte.

---

## 10. Conclusion

Ce module constitue une première base pour une interface de supervision de flotte.
Il permet déjà de sélectionner un véhicule sur une carte et d’afficher des informations supplémentaires utiles à l’opérateur.

---

## 11. Fonctionnalités supplémentaires réalisées

En plus de la sélection d’un véhicule et de l’affichage des informations dans un panneau latéral, les fonctionnalités suivantes ont été ajoutées :

- **centrage automatique de la carte** sur le véhicule sélectionné ;
- **mise en couleur du statut** dans le panneau latéral pour rendre l’état du véhicule plus lisible ;
- **affichage de la trajectoire** du véhicule sélectionné sur la carte.

### Détail du comportement

Lorsqu’un utilisateur clique sur un véhicule :

1. le véhicule est sélectionné ;
2. son marqueur est mis en évidence ;
3. la carte se recentre automatiquement sur sa position ;
4. un panneau latéral affiche ses informations détaillées ;
5. son statut apparaît sous forme d’un badge coloré ;
6. sa trajectoire s’affiche sur la carte.

Le changement de sélection met à jour automatiquement la trajectoire visible et les informations affichées.

---

## 12. Intégration future avec un flux de données Foxglove

Le prototype actuel utilise des données statiques définies directement dans le fichier `main.js`.  
Dans une version connectée au système réel, ces données pourront être remplacées par un flux de données temps réel provenant de Foxglove.

Foxglove permet de visualiser des données en direct via une connexion **Foxglove WebSocket**.  
Pour un système ROS 1 ou ROS 2, il est recommandé d’utiliser **Foxglove Bridge**, qui expose les topics ROS via WebSocket.

### Étapes simples d’intégration

#### 1. Exécuter la source de données
Deux approches sont possibles :

- **ROS + Foxglove Bridge** : lancer `foxglove_bridge`, qui expose les topics ROS en WebSocket ;
- **Serveur WebSocket personnalisé** : publier directement les données du véhicule via un serveur compatible Foxglove WebSocket.

#### 2. Ouvrir la connexion dans Foxglove
Dans Foxglove, il faut choisir **Open connection**, puis **Foxglove WebSocket**, et entrer l’URL du serveur.

#### 3. Récupérer les données utiles
Le système réel devra fournir au minimum les champs suivants :

- identifiant du véhicule ;
- position (`longitude`, `latitude`) ;
- statut ;
- batterie ;
- vitesse ;
- destination éventuelle ;
- historique de positions ou trajectoire.

#### 4. Remplacer les données statiques du prototype
La structure actuelle :

```js
const vehicles = [...]

---

## 5. Mettre à jour l’interface en temps réel

À chaque nouveau message reçu :

- mettre à jour la position du marqueur ;
- mettre à jour les informations du panneau latéral ;
- mettre à jour la couleur du statut ;
- reconstruire ou compléter la trajectoire affichée.
- Principe d’évolution technique

Le code actuel peut être conservé comme base d’interface.
La principale évolution concernera la source des données : les données statiques seront remplacées par des données temps réel issues du véhicule ou du système de supervision via Foxglove WebSocket.

---

## Remarque

Si le système utilise ROS 1 ou ROS 2, la documentation Foxglove recommande l’utilisation de Foxglove Bridge pour une expérience plus stable que d’autres options de connexion en direct.

---
