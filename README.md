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

### Étape 1 : Démarrer Kafka et Zookeeper

```bash
docker-compose up -d
```

Vérifier que les conteneurs sont actifs :
```bash
docker ps
```

Vous devriez voir deux conteneurs : `kafka` et `zookeeper`.

### Étape 2 : Démarrer les microservices

Ouvrir **4 terminaux différents** et exécuter dans chacun :

**Terminal 1 - Microservice Rooms :**
```bash
cd microservice-rooms
node index.js
```

**Terminal 2 - Microservice Bookings :**
```bash
cd microservice-bookings
node index.js
```

**Terminal 3 - Microservice Users :**
```bash
cd microservice-users
node index.js
```

**Terminal 4 - API Gateway :**
```bash
cd api-gateway
node index.js
```

### Étape 3 : Tester l'application

**Option 1 - GraphQL Playground :**
```
http://localhost:3000/graphql
```

**Option 2 - Frontend HTML :**
Ouvrir le fichier `frontend-test/index.html` dans un navigateur.

**Option 3 - API REST :**
```bash
curl http://localhost:3000/rooms
```

### Arrêter les services

- Dans chaque terminal : `Ctrl + C`
- Arrêter Kafka : `docker-compose down`

---

## Documentation

### Documents disponibles

1. **[ARCHITECTURE.md](docs/ARCHITECTURE.md)** - Documentation technique complète
2. **[ENDPOINTS_REST.md](docs/ENDPOINTS_REST.md)** - Description des endpoints REST
3. **[SCHEMA_GRAPHQL.md](docs/SCHEMA_GRAPHQL.md)** - Description du schéma GraphQL
4. **[TOPICS_KAFKA.md](docs/TOPICS_KAFKA.md)** - Description des topics Kafka
5. **[BASES_DONNEES.md](docs/BASES_DONNEES.md)** - Description des bases de données

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
- Rooms : 50051
- Bookings : 50052
- Users : 50053

### Problème : Port déjà utilisé

**Windows :**
```bash
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Linux/Mac :**
```bash
lsof -ti:3000 | xargs kill -9
```

---

## Licence

ISC
