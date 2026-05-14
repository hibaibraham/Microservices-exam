# Schéma d'Architecture - StaySmart Microservices

## Vue d'ensemble

Ce document présente le schéma d'architecture complet du système StaySmart Microservices.

---

## Schéma principal

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                        │
│                    frontend-test/index.html                      │
│                                                                   │
│  - Formulaire de réservation                                     │
│  - Affichage des chambres disponibles                            │
│  - Interface utilisateur HTML/CSS/JavaScript                     │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │ REST API + GraphQL + JSON
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      API GATEWAY (Port 3000)                     │
│                      api-gateway/index.js                        │
│                                                                   │
│  Technologies:                                                    │
│  - Express.js (Serveur HTTP)                                     │
│  - Apollo Server (GraphQL)                                       │
│  - CORS (Cross-Origin Resource Sharing)                          │
│                                                                   │
│  Endpoints:                                                       │
│  - POST /bookings (REST)                                         │
│  - GET /rooms (REST)                                             │
│  - POST /users (REST)                                            │
│  - /graphql (GraphQL Playground)                                 │
└───────────┬─────────────────┬─────────────────┬─────────────────┘
            │                 │                 │
            │ gRPC            │ gRPC            │ gRPC
            │ (HTTP/2 +       │ (HTTP/2 +       │ (HTTP/2 +
            │  Protobuf)      │  Protobuf)      │  Protobuf)
            │                 │                 │
┌───────────▼──────┐ ┌────────▼─────────┐ ┌────▼──────────────┐
│  MICROSERVICE 1  │ │  MICROSERVICE 2  │ │  MICROSERVICE 3   │
│     ROOMS        │ │    BOOKINGS      │ │      USERS        │
│   Port 50051     │ │   Port 50052     │ │    Port 50053     │
│                  │ │                  │ │                   │
│ room.proto       │ │ booking.proto    │ │ user.proto        │
│                  │ │                  │ │                   │
│ Services:        │ │ Services:        │ │ Services:         │
│ - GetRoom        │ │ - CreateBooking  │ │ - GetUser         │
│ - ListRooms      │ │ - GetUserBookings│ │ - ListUsers       │
│                  │ │                  │ │ - CreateUser      │
└────────┬─────────┘ └────────┬─────────┘ └────────┬──────────┘
         │                    │                     │
         │ Lecture/Écriture   │ Lecture/Écriture    │ Lecture/Écriture
         │                    │                     │
┌────────▼─────────┐ ┌────────▼─────────┐ ┌────────▼──────────┐
│      RxDB        │ │    SQLite3       │ │    SQLite3        │
│    (NoSQL)       │ │     (SQL)        │ │     (SQL)         │
│                  │ │                  │ │                   │
│ Base en mémoire  │ │ bookings.db      │ │ users.db          │
│                  │ │                  │ │                   │
│ Collection:      │ │ Table:           │ │ Table:            │
│ - rooms          │ │ - bookings       │ │ - users           │
│                  │ │                  │ │                   │
│ Champs:          │ │ Champs:          │ │ Champs:           │
│ - id             │ │ - id             │ │ - id              │
│ - title          │ │ - userId         │ │ - name            │
│ - description    │ │ - roomId         │ │ - email           │
│ - price_per_night│ │ - startDate      │ │ - loyaltyPoints   │
│ - is_available   │ │ - endDate        │ │                   │
└────────┬─────────┘ └────────┬─────────┘ └────────┬──────────┘
         │                    │                     │
         │ Kafka Consumer     │ Kafka Producer      │ Kafka Consumer
         │ (Écoute)           │ (Publie)            │ (Écoute)
         │                    │                     │
         └────────────────────┼─────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   KAFKA BROKER     │
                    │    Port 9092       │
                    │                    │
                    │ Topic:             │
                    │ hotel-bookings-    │
                    │ topic              │
                    │                    │
                    │ Messages:          │
                    │ - BOOKING_CREATED  │
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │    ZOOKEEPER       │
                    │    Port 2181       │
                    │                    │
                    │ Coordination       │
                    │ Kafka              │
                    └────────────────────┘
```

---

## Légende

### Composants

| Symbole | Signification |
|---------|---------------|
| ┌─┐ | Composant système |
| │ │ | Connexion verticale |
| ─ | Connexion horizontale |
| ▼ | Direction du flux de données |
| ↕ | Communication bidirectionnelle |

### Types de communication

| Type | Protocole | Utilisation |
|------|-----------|-------------|
| Client ↔ API Gateway | HTTP/HTTPS + JSON | REST API, GraphQL |
| API Gateway ↔ Microservices | gRPC (HTTP/2 + Protobuf) | Communication synchrone |
| Microservices ↔ Kafka | Kafka Protocol + JSON | Communication asynchrone |
| Microservices ↔ Bases de données | Drivers natifs | Persistance des données |

---

## Flux de données : Création d'une réservation

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ 1. POST /bookings
     │    { userId, roomId, startDate, endDate }
     ↓
┌────────────┐
│ API Gateway│
└────┬───────┘
     │
     │ 2. gRPC GetRoom(roomId)
     │    Vérifier disponibilité
     ↓
┌──────────────┐
│ MS-Rooms     │
│ (RxDB)       │
└────┬─────────┘
     │
     │ 3. Retour: { is_available: true }
     ↓
┌────────────┐
│ API Gateway│
└────┬───────┘
     │
     │ 4. gRPC CreateBooking(...)
     ↓
┌──────────────┐
│ MS-Bookings  │
│ (SQLite3)    │
└────┬─────────┘
     │
     │ 5. Sauvegarde dans bookings.db
     │    INSERT INTO bookings (...)
     │
     │ 6. Publier événement Kafka
     │    Topic: hotel-bookings-topic
     │    Event: BOOKING_CREATED
     ↓
┌──────────────┐
│ Kafka Broker │
└────┬─────────┘
     │
     ├─────────────────────────────────┐
     │                                 │
     │ 7a. Consumer MS-Rooms           │ 7b. Consumer MS-Users
     ↓                                 ↓
┌──────────────┐              ┌──────────────┐
│ MS-Rooms     │              │ MS-Users     │
│              │              │              │
│ UPDATE:      │              │ UPDATE:      │
│ is_available │              │ loyaltyPoints│
│ = false      │              │ += 10        │
└──────────────┘              └──────────────┘
```

---

## Diagramme de séquence

```
Client    API-GW    MS-Rooms    MS-Bookings    Kafka    MS-Users
  |         |           |             |           |         |
  |--POST-->|           |             |           |         |
  |         |           |             |           |         |
  |         |--gRPC---->|             |           |         |
  |         |           |             |           |         |
  |         |<--Room----|             |           |         |
  |         |           |             |           |         |
  |         |--------gRPC------------>|           |         |
  |         |           |             |           |         |
  |         |           |             |--Save---->|         |
  |         |           |             |  SQLite3  |         |
  |         |           |             |           |         |
  |         |           |             |--Publish->|         |
  |         |           |             |           |         |
  |         |           |<---------Event----------|         |
  |         |           |             |           |-------->|
  |         |           |             |           |  Event  |
  |         |           |             |           |         |
  |         |           |--Update---->|           |         |
  |         |           |   RxDB      |           |         |
  |         |           |             |           |         |
  |         |           |             |           |<-Update-|
  |         |           |             |           | SQLite3 |
  |         |           |             |           |         |
  |         |<--------Response--------|           |         |
  |         |           |             |           |         |
  |<--200---|           |             |           |         |
  |  JSON   |           |             |           |         |
```

---

## Architecture en couches

```
┌─────────────────────────────────────────────────────────┐
│                   COUCHE PRÉSENTATION                    │
│                                                           │
│  - Frontend HTML/CSS/JavaScript                          │
│  - Formulaires de saisie                                 │
│  - Affichage des données                                 │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                    COUCHE API GATEWAY                    │
│                                                           │
│  - Routage des requêtes                                  │
│  - Transformation REST/GraphQL → gRPC                    │
│  - Agrégation des réponses                               │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  COUCHE MICROSERVICES                    │
│                                                           │
│  - Logique métier                                        │
│  - Validation des données                                │
│  - Communication gRPC                                    │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                   COUCHE PERSISTANCE                     │
│                                                           │
│  - RxDB (NoSQL)                                          │
│  - SQLite3 (SQL)                                         │
│  - Gestion des transactions                              │
└─────────────────────────────────────────────────────────┘
                            ↕
┌─────────────────────────────────────────────────────────┐
│                  COUCHE MESSAGERIE                       │
│                                                           │
│  - Kafka Broker                                          │
│  - Topics et partitions                                  │
│  - Zookeeper (coordination)                              │
└─────────────────────────────────────────────────────────┘
```

---

## Ports et protocoles

| Composant | Port | Protocole | Description |
|-----------|------|-----------|-------------|
| API Gateway | 3000 | HTTP/HTTPS | REST + GraphQL |
| MS-Rooms | 50051 | gRPC (HTTP/2) | Service de chambres |
| MS-Bookings | 50052 | gRPC (HTTP/2) | Service de réservations |
| MS-Users | 50053 | gRPC (HTTP/2) | Service d'utilisateurs |
| Kafka Broker | 9092 | Kafka Protocol | Message broker |
| Zookeeper | 2181 | Zookeeper Protocol | Coordination Kafka |

---

## Technologies par composant

### API Gateway
- **Runtime** : Node.js 18+
- **Framework** : Express.js 5.x
- **GraphQL** : Apollo Server 3.x
- **gRPC** : @grpc/grpc-js 1.14+

### Microservice Rooms
- **Runtime** : Node.js 18+
- **Base de données** : RxDB 17.x (NoSQL)
- **gRPC** : @grpc/grpc-js 1.14+
- **Messaging** : KafkaJS 2.2+

### Microservice Bookings
- **Runtime** : Node.js 18+
- **Base de données** : SQLite3 6.0+ (SQL)
- **gRPC** : @grpc/grpc-js 1.14+
- **Messaging** : KafkaJS 2.2+

### Microservice Users
- **Runtime** : Node.js 18+
- **Base de données** : SQLite3 6.0+ (SQL)
- **gRPC** : @grpc/grpc-js 1.14+
- **Messaging** : KafkaJS 2.2+

### Infrastructure
- **Kafka** : Confluent Platform 7.3.0
- **Zookeeper** : Confluent Platform 7.3.0
- **Docker** : 20+
- **Docker Compose** : 1.29+

---

## Conformité avec l'architecture attendue

✅ **Client** : Communique avec API Gateway via REST/GraphQL  
✅ **API Gateway** : Point d'entrée unique exposant REST et GraphQL  
✅ **Microservices** : Communication via gRPC (HTTP/2 + Protobuf)  
✅ **Microservice 1 (Rooms)** : Utilise RxDB (NoSQL)  
✅ **Microservice 2 (Bookings)** : Utilise SQLite3 (SQL)  
✅ **Microservice 3 (Users)** : Utilise SQLite3 (SQL)  
✅ **Kafka** : Communication asynchrone entre microservices  
✅ **Fichiers .proto** : Définition des contrats gRPC  

---

**Version** : 1.0  
**Date** : Mai 2026
