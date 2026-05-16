# StaySmart Microservices - Système de Réservation d'Hôtel

Système de réservation d'hôtel basé sur une architecture microservices avec gRPC, Kafka et bases de données hybrides (SQL/NoSQL).

## Table des matières

1. [Architecture](#architecture)
2. [Prérequis](#prérequis)
3. [Installation](#installation)
4. [Exécution](#exécution)
5. [Documentation](#documentation)

---

## Architecture

Le projet suit une architecture microservices conforme au schéma fourni :

```
Client (Frontend)
    ↕ REST/GraphQL
API Gateway (Port 3000)
    ↕ gRPC + HTTP/2 + Protobuf
┌─────────────────┬─────────────────┬─────────────────┐
│  Microservice 1 │  Microservice 2 │  Microservice 3 │
│   (Rooms)       │   (Bookings)    │   (Users)       │
│   Port 50051    │   Port 50052    │   Port 50053    │
└─────────────────┴─────────────────┴─────────────────┘
         │                │                │
         ↓                ↓                ↓
    RxDB (NoSQL)     SQLite3 (SQL)    SQLite3 (SQL)
         ↕                ↕                ↕
         └────────── Kafka Broker ─────────┘
              (Topic: hotel-bookings-topic)
```

### Composants

- **API Gateway** : Point d'entrée unique exposant REST et GraphQL
- **Microservice Rooms** : Gestion des chambres avec RxDB (NoSQL)
- **Microservice Bookings** : Gestion des réservations avec SQLite3
- **Microservice Users** : Gestion des utilisateurs avec SQLite3
- **Kafka** : Communication asynchrone entre microservices

Voir [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) pour plus de détails.

---

## Prérequis

- **Node.js** version 18 ou supérieure
- **Docker** et **Docker Compose** (pour Kafka et Zookeeper)
- **npm** (inclus avec Node.js)

### Vérifier les installations

```bash
node --version    # Doit afficher v18.x.x ou supérieur
docker --version  # Doit afficher Docker version 20.x.x ou supérieur
docker-compose --version
```

---

## Installation

### 1. Cloner le projet

```bash
git clone <url-du-repo>
cd staysmart-microservices
```

### 2. Installer les dépendances

```bash
# API Gateway
cd api-gateway
npm install
cd ..

# Microservice Rooms
cd microservice-rooms
npm install
cd ..

# Microservice Bookings
cd microservice-bookings
npm install
cd ..

# Microservice Users
cd microservice-users
npm install
cd ..
```

---

## Exécution

### Méthode Manuelle

#### Étape 1 : Démarrer Kafka et Zookeeper

```bash
docker-compose up -d
```

Vérifier que les conteneurs sont actifs :
```bash
docker ps
```

Vous devriez voir deux conteneurs : `kafka` et `zookeeper`.

#### Étape 2 : Démarrer les microservices

Ouvrir **4 terminaux différents** et exécuter dans chacun :

**Terminal 1 - Microservice Rooms :**
```bash
cd microservice-rooms
node index.js
```
✅ Vous devriez voir : " Microservice Rooms (gRPC) démarré sur le port 50051"

**Terminal 2 - Microservice Bookings :**
```bash
cd microservice-bookings
node index.js
```
✅ Vous devriez voir : " Microservice Bookings (gRPC) démarré sur le port 50052"

**Terminal 3 - Microservice Users :**
```bash
cd microservice-users
node index.js
```
✅ Vous devriez voir : " Microservice Users (gRPC) démarré sur le port 50053"

**Terminal 4 - API Gateway :**
```bash
cd api-gateway
node index.js
```
✅ Vous devriez voir : " API Gateway en ligne (Apollo + REST) !"

### Étape 3 : Tester l'application

**Option 1 - Frontend HTML (Recommandé) :**
Ouvrir le fichier `frontend-test/index.html` dans un navigateur.

**Fonctionnalités :**
-  Liste des chambres disponibles en temps réel
-  Sélection visuelle des chambres
-  Réservation avec dates d'arrivée et de départ
-  Vérification automatique de disponibilité
-  Affichage des points de fidélité (+10 par réservation)
-  Actualisation automatique après réservation

**Note importante :** Les chambres restent toujours visibles dans l'interface. La disponibilité est vérifiée côté serveur en fonction des dates de réservation. Une même chambre peut être réservée plusieurs fois sur des périodes différentes (sans chevauchement).

**Option 2 - GraphQL Playground :**
```
http://localhost:3000/graphql
```

**Option 3 - API REST :**
```bash
# Liste des chambres
curl http://localhost:3000/rooms

# Vérifier disponibilité
curl -X POST http://localhost:3000/check-availability \
  -H "Content-Type: application/json" \
  -d '{"roomId": "201", "startDate": "2026-05-20", "endDate": "2026-05-25"}'

# Créer une réservation
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{"userId": "user_123", "roomId": "201", "startDate": "2026-05-20", "endDate": "2026-05-25"}'
```

**Option 4 - Postman :**
Voir [ENDPOINTS_REST.md](docs/ENDPOINTS_REST.md) pour la collection Postman complète importable.

### Arrêter les services

- Dans chaque terminal : `Ctrl + C`
- Arrêter Kafka : `docker-compose down`

---

## Documentation

### Documents disponibles

1. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Documentation technique complète de l'architecture
2. **[SCHEMA_ARCHITECTURE.md](docs/SCHEMA_ARCHITECTURE.md)** - Diagrammes et schémas de l'architecture
3. **[ENDPOINTS_REST.md](docs/ENDPOINTS_REST.md)** - Tous les endpoints REST et GraphQL avec exemples
4. **[SCHEMA_GRAPHQL.md](docs/SCHEMA_GRAPHQL.md)** - Schéma GraphQL détaillé
5. **[TOPICS_KAFKA.md](docs/TOPICS_KAFKA.md)** - Topics Kafka et événements
6. **[BASES_DONNEES.md](docs/BASES_DONNEES.md)** - Schémas des bases de données
7. **[FICHIERS_PROTO.md](docs/FICHIERS_PROTO.md)** - Documentation des fichiers Protocol Buffers
8. **[INSTALLATION_EXECUTION.md](docs/INSTALLATION_EXECUTION.md)** - Guide d'installation et d'exécution détaillé

### Endpoints Disponibles

**REST :**
- `GET /rooms` - Liste des chambres
- `GET /users/:id` - Obtenir un utilisateur
- `POST /bookings` - Créer une réservation
- `POST /check-availability` - Vérifier la disponibilité d'une chambre
- `POST /users` - Créer un utilisateur

**GraphQL :**
- Queries : `user`, `users`, `room`, `allRooms`
- Mutations : `createBooking`

Voir [ENDPOINTS_REST.md](docs/ENDPOINTS_REST.md) pour les détails complets et exemples.

### Fichiers Protobuf

Les définitions des services gRPC se trouvent dans le dossier `protos/` :

- `protos/user.proto` - Service de gestion des utilisateurs
- `protos/room.proto` - Service de gestion des chambres
- `protos/booking.proto` - Service de gestion des réservations

---

## Structure du projet

```
staysmart-microservices/
├── api-gateway/              # API Gateway (REST + GraphQL)
│   ├── index.js
│   └── package.json
├── microservice-rooms/       # Microservice Rooms (RxDB)
│   ├── index.js
│   └── package.json
├── microservice-bookings/    # Microservice Bookings (SQLite3)
│   ├── index.js
│   ├── bookings.db
│   └── package.json
├── microservice-users/       # Microservice Users (SQLite3)
│   ├── index.js
│   ├── users.db
│   └── package.json
├── protos/                   # Définitions Protocol Buffers
│   ├── room.proto
│   ├── booking.proto
│   └── user.proto
├── docs/                     # Documentation technique
├── frontend-test/            # Interface de test HTML
├── docker-compose.yml        # Configuration Kafka/Zookeeper
└── README.md                 # Ce fichier
```

---

## Technologies utilisées

- **Node.js** - Runtime JavaScript
- **gRPC** - Communication inter-microservices
- **Protocol Buffers** - Sérialisation des données
- **Kafka** - Message broker pour événements asynchrones
- **GraphQL** - API flexible pour le client
- **Express** - Serveur HTTP pour l'API Gateway
- **SQLite3** - Base de données SQL légère
- **RxDB** - Base de données NoSQL réactive

---

## Dépannage

### Problème : Kafka ne démarre pas

```bash
docker-compose down -v
docker-compose up -d
```

### Problème : Erreur de connexion gRPC

Vérifier que tous les microservices sont démarrés sur les bons ports :
- MS-Rooms : 50051
- MS-Bookings : 50052
- MS-Users : 50053

### Problème : Port déjà utilisé

**Windows :**
```cmd
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Linux/Mac :**
```bash
lsof -ti:3000 | xargs kill -9
```

### Problème : Erreur 500 sur les endpoints REST

**Solution :** Vérifiez que l'API Gateway a bien été redémarré après les modifications. Le middleware `express.json()` doit être configuré correctement.

### Problème : GraphQL retourne "stream is not readable"

**Solution :** Redémarrez l'API Gateway. Apollo Server et Express doivent être configurés dans le bon ordre.

### Problème : Les réservations ne vérifient pas les chevauchements de dates

**Solution :** Vérifiez que MS-Bookings utilise bien la logique de vérification des chevauchements dans la fonction `createBooking`. Consultez [BASES_DONNEES.md](docs/BASES_DONNEES.md) pour la logique SQL.

---

## Fonctionnalités Clés

###  Gestion des Réservations
- Vérification automatique des chevauchements de dates
- Une chambre peut être réservée sur plusieurs périodes non-chevauchantes
- Validation côté serveur avant confirmation

###  Système de Points de Fidélité
- +10 points automatiques par réservation confirmée
- Mise à jour asynchrone via Kafka
- Persistance dans SQLite3

###  Communication Asynchrone
- Événements Kafka pour les réservations
- MS-Users écoute les événements `BOOKING_CREATED`
- Découplage complet entre microservices

###  API Hybride
- REST pour les opérations CRUD simples
- GraphQL pour les requêtes complexes et flexibles
- gRPC pour la communication inter-microservices

---

## Tests

Pour tester l'application complètement :

1. **Démarrer tous les services** (voir section Exécution)
2. **Ouvrir le frontend** : `frontend-test/index.html`
3. **Tester les scénarios** :
   -  Réserver une chambre disponible
   -  Tenter de réserver une chambre déjà réservée (même période)
   -  Réserver la même chambre sur une période différente
   -  Vérifier l'incrémentation des points de fidélité

Voir [ENDPOINTS_REST.md](docs/ENDPOINTS_REST.md) pour les scénarios de test détaillés avec Postman.

---


