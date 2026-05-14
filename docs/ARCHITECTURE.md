# Documentation Technique - StaySmart Microservices

## 1. Vue d'ensemble

StaySmart est un système de réservation d'hôtel basé sur une architecture microservices. Le système permet de gérer les chambres, les réservations et les utilisateurs avec une communication synchrone (gRPC) et asynchrone (Kafka).

---

## 2. Architecture du système

### 2.1 Schéma d'architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Frontend)                        │
│                    frontend-test/index.html                      │
└───────────────────────────┬─────────────────────────────────────┘
                            │
                            │ HTTP/HTTPS
                            │ REST API + GraphQL
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      API GATEWAY (Port 3000)                     │
│                      api-gateway/index.js                        │
│                                                                   │
│  Technologies:                                                    │
│  - Express.js (Serveur HTTP)                                     │
│  - Apollo Server (GraphQL)                                       │
│  - CORS                                                           │
│                                                                   │
│  Endpoints:                                                       │
│  - POST /bookings (REST)                                         │
│  - GET /rooms (REST)                                             │
│  - POST /users (REST)                                            │
│  - /graphql (GraphQL)                                            │
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
         │                    │                     │
┌────────▼─────────┐ ┌────────▼─────────┐ ┌────────▼──────────┐
│      RxDB        │ │    SQLite3       │ │    SQLite3        │
│    (NoSQL)       │ │     (SQL)        │ │     (SQL)         │
│                  │ │                  │ │                   │
│ Base en mémoire  │ │ bookings.db      │ │ users.db          │
│                  │ │                  │ │                   │
│ Collection:      │ │ Table:           │ │ Table:            │
│ - rooms          │ │ - bookings       │ │ - users           │
└────────┬─────────┘ └────────┬─────────┘ └────────┬──────────┘
         │                    │                     │
         │ Consumer           │ Producer            │ Consumer
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
                    └─────────┬──────────┘
                              │
                    ┌─────────▼──────────┐
                    │    ZOOKEEPER       │
                    │    Port 2181       │
                    └────────────────────┘
```

### 2.2 Composants principaux

#### API Gateway (Port 3000)
- **Rôle** : Point d'entrée unique pour tous les clients
- **Technologies** : Express.js, Apollo Server
- **Protocoles** : REST, GraphQL
- **Communication** : gRPC vers les microservices

#### Microservice Rooms (Port 50051)
- **Rôle** : Gestion des chambres d'hôtel
- **Base de données** : RxDB (NoSQL en mémoire)
- **Communication** : gRPC (serveur), Kafka (consumer)
- **Responsabilités** :
  - Lister les chambres disponibles
  - Récupérer les détails d'une chambre
  - Mettre à jour la disponibilité via Kafka

#### Microservice Bookings (Port 50052)
- **Rôle** : Gestion des réservations
- **Base de données** : SQLite3 (bookings.db)
- **Communication** : gRPC (serveur), Kafka (producer)
- **Responsabilités** :
  - Créer une réservation
  - Récupérer les réservations d'un utilisateur
  - Publier des événements de réservation

#### Microservice Users (Port 50053)
- **Rôle** : Gestion des utilisateurs
- **Base de données** : SQLite3 (users.db)
- **Communication** : gRPC (serveur), Kafka (consumer)
- **Responsabilités** :
  - Créer un utilisateur
  - Récupérer les informations d'un utilisateur
  - Gérer les points de fidélité via Kafka

---

## 3. Protocoles de communication

### 3.1 Communication synchrone (gRPC)

**Protocole** : gRPC (HTTP/2 + Protocol Buffers)

**Avantages** :
- Performance élevée
- Typage fort
- Génération automatique de code
- Streaming bidirectionnel

**Utilisation** :
- API Gateway → Microservices
- Opérations nécessitant une réponse immédiate

### 3.2 Communication asynchrone (Kafka)

**Protocole** : Kafka Protocol

**Avantages** :
- Découplage des services
- Scalabilité
- Résilience
- Traçabilité des événements

**Utilisation** :
- Microservices → Microservices
- Mises à jour non critiques
- Notifications d'événements

---

## 4. Flux de données

### 4.1 Scénario : Création d'une réservation

```
1. Client envoie POST /bookings à l'API Gateway
2. API Gateway vérifie la disponibilité via gRPC (MS-Rooms)
3. API Gateway crée la réservation via gRPC (MS-Bookings)
4. MS-Bookings sauvegarde dans SQLite3
5. MS-Bookings publie un événement Kafka "BOOKING_CREATED"
6. MS-Rooms reçoit l'événement et met à jour is_available = false
7. MS-Users reçoit l'événement et ajoute +10 points de fidélité
8. API Gateway retourne la confirmation au client
```

### 4.2 Chronologie détaillée

| Étape | Composant | Action | Durée estimée |
|-------|-----------|--------|---------------|
| 1 | Client | Envoi requête HTTP | ~10ms |
| 2 | API Gateway | Appel gRPC GetRoom | ~20ms |
| 3 | MS-Rooms | Recherche RxDB | ~5ms |
| 4 | API Gateway | Appel gRPC CreateBooking | ~20ms |
| 5 | MS-Bookings | Insertion SQLite3 | ~10ms |
| 6 | MS-Bookings | Publication Kafka | ~15ms |
| 7 | Kafka | Distribution message | ~10ms |
| 8 | MS-Rooms | Mise à jour RxDB | ~5ms |
| 9 | MS-Users | Mise à jour SQLite3 | ~10ms |
| 10 | API Gateway | Réponse HTTP | ~5ms |

**Durée totale** : ~110ms (synchrone) + ~30ms (asynchrone)

---

## 5. Technologies utilisées

### 5.1 Backend

| Technologie | Version | Utilisation |
|-------------|---------|-------------|
| Node.js | 18+ | Runtime JavaScript |
| Express.js | 5.x | Serveur HTTP |
| Apollo Server | 3.x | Serveur GraphQL |
| @grpc/grpc-js | 1.14+ | Communication gRPC |
| @grpc/proto-loader | 0.8+ | Chargement Protobuf |
| KafkaJS | 2.2+ | Client Kafka |
| SQLite3 | 6.0+ | Base de données SQL |
| RxDB | 17.x | Base de données NoSQL |

### 5.2 Infrastructure

| Composant | Version | Rôle |
|-----------|---------|------|
| Kafka | 7.3.0 | Message broker |
| Zookeeper | 7.3.0 | Coordination Kafka |
| Docker | 20+ | Containerisation |
| Docker Compose | 1.29+ | Orchestration |

---

## 6. Sécurité et bonnes pratiques

### 6.1 Sécurité actuelle

- ✅ CORS activé sur l'API Gateway
- ✅ Validation des données d'entrée
- ✅ Gestion des erreurs gRPC
- ✅ Isolation des microservices

### 6.2 Améliorations recommandées

- ⚠️ Ajouter l'authentification JWT
- ⚠️ Implémenter l'autorisation basée sur les rôles
- ⚠️ Chiffrer les communications (TLS/SSL)
- ⚠️ Ajouter un rate limiting
- ⚠️ Implémenter un circuit breaker
- ⚠️ Ajouter des logs centralisés

---

## 7. Scalabilité

### 7.1 Stratégies de mise à l'échelle

**Horizontal Scaling** :
- Déployer plusieurs instances de chaque microservice
- Utiliser un load balancer (Nginx, HAProxy)
- Partitionner les topics Kafka

**Vertical Scaling** :
- Augmenter les ressources CPU/RAM
- Optimiser les requêtes de base de données
- Ajouter des index sur les tables

**Caching** :
- Implémenter Redis pour le cache
- Mettre en cache les chambres disponibles
- Mettre en cache les profils utilisateurs

### 7.2 Monitoring recommandé

- **Métriques** : Prometheus + Grafana
- **Logs** : ELK Stack (Elasticsearch, Logstash, Kibana)
- **Tracing** : Jaeger ou Zipkin
- **Alerting** : PagerDuty ou Opsgenie

---

## 8. Maintenance et déploiement

### 8.1 Environnements

| Environnement | Description | Configuration |
|---------------|-------------|---------------|
| Development | Local | SQLite3, Kafka local |
| Staging | Pré-production | PostgreSQL, Kafka cluster |
| Production | Production | PostgreSQL HA, Kafka cluster |

### 8.2 CI/CD recommandé

1. **Build** : npm install, npm test
2. **Test** : Tests unitaires, tests d'intégration
3. **Package** : Docker build
4. **Deploy** : Kubernetes ou Docker Swarm
5. **Monitor** : Prometheus, Grafana

---

## 9. Dépendances

### 9.1 API Gateway

```json
{
  "@grpc/grpc-js": "^1.14.3",
  "@grpc/proto-loader": "^0.8.1",
  "apollo-server-express": "^3.13.0",
  "cors": "^2.8.6",
  "express": "^5.2.1",
  "graphql": "^16.14.0"
}
```

### 9.2 Microservice Rooms

```json
{
  "@grpc/grpc-js": "^1.14.3",
  "@grpc/proto-loader": "^0.8.1",
  "kafkajs": "^2.2.4",
  "rxdb": "^17.2.0",
  "rxjs": "^7.8.2"
}
```

### 9.3 Microservice Bookings

```json
{
  "@grpc/grpc-js": "^1.14.3",
  "@grpc/proto-loader": "^0.8.1",
  "kafkajs": "^2.2.4",
  "sqlite3": "^6.0.1"
}
```

### 9.4 Microservice Users

```json
{
  "@grpc/grpc-js": "^1.14.3",
  "@grpc/proto-loader": "^0.8.1",
  "kafkajs": "^2.2.4",
  "sqlite3": "^6.0.1"
}
```

---

## 10. Glossaire

| Terme | Définition |
|-------|------------|
| gRPC | Framework RPC haute performance utilisant HTTP/2 |
| Protobuf | Format de sérialisation de données de Google |
| Kafka | Plateforme de streaming d'événements distribuée |
| RxDB | Base de données NoSQL réactive pour JavaScript |
| SQLite3 | Base de données SQL légère et embarquée |
| API Gateway | Point d'entrée unique pour les clients |
| Microservice | Service autonome avec une responsabilité unique |
| Consumer | Service qui consomme des messages Kafka |
| Producer | Service qui produit des messages Kafka |

---

**Version** : 1.0  
**Date** : Mai 2026  
**Auteur** : Équipe StaySmart
