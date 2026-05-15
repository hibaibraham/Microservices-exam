# Endpoints REST et GraphQL - API Gateway

## Base URL

```
http://localhost:3000
```

---

## Table des Matières

1. [Endpoints REST](#endpoints-rest)
   - [Gestion des chambres](#1-gestion-des-chambres)
   - [Gestion des réservations](#2-gestion-des-réservations)
   - [Vérification de disponibilité](#3-vérification-de-disponibilité)
   - [Gestion des utilisateurs](#4-gestion-des-utilisateurs)
2. [Endpoints GraphQL](#endpoints-graphql)
   - [Queries](#queries)
   - [Mutations](#mutations)
3. [Scénarios de test complets](#scénarios-de-test-complets)
4. [Collection Postman](#collection-postman)

---

# Endpoints REST

## 1. Gestion des chambres


### GET /rooms

Récupère la liste de toutes les chambres disponibles.

**Méthode** : `GET`

**URL** : `/rooms`

**Authentification** : Non requise

**Paramètres** : Aucun

**Réponse réussie** :

**Code** : `200 OK`

**Exemple de réponse** :
```json
{
  "rooms": [
    {
      "id": "201",
      "title": "Suite Royale",
      "description": "Vue sur mer",
      "price_per_night": 150.0,
      "is_available": true
    },
    {
      "id": "202",
      "title": "Chambre Deluxe",
      "description": "Lit King Size et Jacuzzi",
      "price_per_night": 95.0,
      "is_available": true
    }
  ]
}
```

**Exemple de requête** :
```bash
curl http://localhost:3000/rooms
```

**Erreurs possibles** :

| Code | Description |
|------|-------------|
| 500 | Erreur interne du serveur |

---

## 2. Gestion des réservations

### POST /bookings

Crée une nouvelle réservation pour une chambre.

**Méthode** : `POST`

**URL** : `/bookings`

**Authentification** : Non requise

**Headers** :
```
Content-Type: application/json
```

**Corps de la requête** :
```json
{
  "userId": "string (requis)",
  "roomId": "string (requis)",
  "startDate": "string (requis, format: YYYY-MM-DD)",
  "endDate": "string (requis, format: YYYY-MM-DD)"
}
```

**Exemple de corps** :
```json
{
  "userId": "user_123",
  "roomId": "201",
  "startDate": "2026-05-20",
  "endDate": "2026-05-25"
}
```

**Réponse réussie** :

**Code** : `200 OK`

**Exemple de réponse** :
```json
{
  "success": true,
  "id": "1",
  "status": "CONFIRMED",
  "message": "Réservation confirmée avec succès."
}
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```

**Erreurs possibles** :

| Code | Description | Exemple de réponse |
|------|-------------|-------------------|
| 400 | ID de chambre manquant | `{"success": false, "message": "ID de chambre manquant."}` |
| 400 | Chambre déjà réservée | `{"success": false, "status": "ALREADY_BOOKED", "message": "Déjà réservée : Cette chambre n'est plus disponible."}` |
| 404 | Chambre inexistante | `{"success": false, "status": "INVALID_ID", "message": "ID invalide : Cette chambre n'existe pas."}` |
| 500 | Erreur interne | `{"success": false, "message": "Erreur interne lors de la réservation."}` |

**Effets secondaires** :
- La réservation est sauvegardée dans la base de données SQLite3
- Un événement Kafka `BOOKING_CREATED` est publié
- La disponibilité de la chambre est mise à jour automatiquement (via Kafka)
- L'utilisateur reçoit +10 points de fidélité (via Kafka)

---

## 3. Vérification de disponibilité

### POST /check-availability

Vérifie si une chambre est disponible pour une période donnée sans créer de réservation.

**Méthode** : `POST`

**URL** : `/check-availability`

**Authentification** : Non requise

**Headers** :
```
Content-Type: application/json
```

**Corps de la requête** :
```json
{
  "roomId": "string (requis)",
  "startDate": "string (requis, format: YYYY-MM-DD)",
  "endDate": "string (requis, format: YYYY-MM-DD)"
}
```

**Exemple de corps** :
```json
{
  "roomId": "201",
  "startDate": "2026-05-20",
  "endDate": "2026-05-25"
}
```

**Réponse réussie (Disponible)** :

**Code** : `200 OK`

**Exemple de réponse** :
```json
{
  "available": true,
  "message": "Chambre disponible pour ces dates"
}
```

**Réponse réussie (Indisponible)** :

**Code** : `200 OK`

**Exemple de réponse** :
```json
{
  "available": false,
  "message": "Chambre déjà réservée du 2026-05-20 au 2026-05-25"
}
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```

**Erreurs possibles** :

| Code | Description | Exemple de réponse |
|------|-------------|-------------------|
| 400 | Paramètres manquants | `{"available": false, "message": "Paramètres manquants"}` |
| 500 | Erreur interne | `{"available": false, "message": "Erreur serveur"}` |

---

## 4. Gestion des utilisateurs

### GET /users/:id

Récupère les informations d'un utilisateur spécifique.

**Méthode** : `GET`

**URL** : `/users/:id`

**Authentification** : Non requise

**Paramètres d'URL** :
- `id` : Identifiant de l'utilisateur (string)

**Réponse réussie** :

**Code** : `200 OK`

**Exemple de réponse** :
```json
{
  "id": "user_123",
  "name": "Client Test Kafka",
  "email": "test@example.com",
  "loyaltyPoints": 10
}
```

**Exemple de requête** :
```bash
curl http://localhost:3000/users/user_123
```

**Erreurs possibles** :

| Code | Description |
|------|-------------|
| 404 | Utilisateur non trouvé |
| 500 | Erreur interne du serveur |

---

### POST /users

### POST /users

Crée un nouvel utilisateur.

**Méthode** : `POST`

**URL** : `/users`

**Authentification** : Non requise

**Headers** :
```
Content-Type: application/json
```

**Corps de la requête** :
```json
{
  "name": "string (requis)",
  "email": "string (requis)"
}
```

**Exemple de corps** :
```json
{
  "name": "Jean Dupont",
  "email": "jean@example.com"
}
```

**Réponse réussie** :

**Code** : `201 Created`

**Exemple de réponse** :
```json
{
  "id": "abc123xyz",
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "loyaltyPoints": 0
}
```

**Exemple de requête** :
```bash
curl -X POST http://localhost:3000/users \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jean Dupont",
    "email": "jean@example.com"
  }'
```

**Erreurs possibles** :

| Code | Description |
|------|-------------|
| 500 | Erreur interne du serveur |

---

# Endpoints GraphQL

## URL GraphQL

```
POST http://localhost:3000/graphql
```

**Headers requis** :
```
Content-Type: application/json
```

**Format de la requête** :
```json
{
  "query": "VOTRE_REQUETE_GRAPHQL_ICI"
}
```

---

## Queries

### 1. Obtenir un utilisateur

**Query** :
```graphql
query {
  user(id: "user_123") {
    id
    name
    email
    loyaltyPoints
  }
}
```

**Requête Postman/curl** :
```json
{
  "query": "query { user(id: \"user_123\") { id name email loyaltyPoints } }"
}
```

**Réponse** :
```json
{
  "data": {
    "user": {
      "id": "user_123",
      "name": "Client Test Kafka",
      "email": "test@example.com",
      "loyaltyPoints": 10
    }
  }
}
```

---

### 2. Liste de tous les utilisateurs

**Query** :
```graphql
query {
  users {
    id
    name
    email
    loyaltyPoints
  }
}
```

**Requête Postman/curl** :
```json
{
  "query": "query { users { id name email loyaltyPoints } }"
}
```

**Réponse** :
```json
{
  "data": {
    "users": [
      {
        "id": "user_123",
        "name": "Client Test Kafka",
        "email": "test@example.com",
        "loyaltyPoints": 10
      }
    ]
  }
}
```

---

### 3. Obtenir une chambre

**Query** :
```graphql
query {
  room(id: "201") {
    id
    title
    description
    price_per_night
    isAvailable
  }
}
```

**Requête Postman/curl** :
```json
{
  "query": "query { room(id: \"201\") { id title description price_per_night isAvailable } }"
}
```

**Réponse** :
```json
{
  "data": {
    "room": {
      "id": "201",
      "title": "Suite Royale",
      "description": "Vue sur mer",
      "price_per_night": 150,
      "isAvailable": true
    }
  }
}
```

---

### 4. Liste de toutes les chambres

**Query** :
```graphql
query {
  allRooms {
    id
    title
    description
    price_per_night
    isAvailable
  }
}
```

**Requête Postman/curl** :
```json
{
  "query": "query { allRooms { id title description price_per_night isAvailable } }"
}
```

**Réponse** :
```json
{
  "data": {
    "allRooms": [
      {
        "id": "201",
        "title": "Suite Royale",
        "description": "Vue sur mer",
        "price_per_night": 150,
        "isAvailable": true
      },
      {
        "id": "202",
        "title": "Chambre Deluxe",
        "description": "Lit King Size et Jacuzzi",
        "price_per_night": 95,
        "isAvailable": true
      }
    ]
  }
}
```

---

## Mutations

### 1. Créer une réservation

**Mutation** :
```graphql
mutation {
  createBooking(
    userId: "user_123",
    roomId: "201",
    startDate: "2026-05-20",
    endDate: "2026-05-25"
  ) {
    success
    message
    bookingId
  }
}
```

**Requête Postman/curl** :
```json
{
  "query": "mutation { createBooking(userId: \"user_123\", roomId: \"201\", startDate: \"2026-05-20\", endDate: \"2026-05-25\") { success message bookingId } }"
}
```

**Réponse (Succès)** :
```json
{
  "data": {
    "createBooking": {
      "success": true,
      "message": "Réservation confirmée avec succès.",
      "bookingId": "1"
    }
  }
}
```

**Réponse (Échec)** :
```json
{
  "data": {
    "createBooking": {
      "success": false,
      "message": "Erreur lors de la réservation.",
      "bookingId": "0"
    }
  }
}
```

---

## Codes de statut HTTP

| Code | Signification | Utilisation |
|------|---------------|-------------|
| 200 | OK | Requête réussie |
| 201 | Created | Ressource créée avec succès |
| 400 | Bad Request | Données invalides ou manquantes |
| 404 | Not Found | Ressource non trouvée |
| 500 | Internal Server Error | Erreur serveur |

---

## 5. Format des données

### Dates

Toutes les dates doivent être au format ISO 8601 : `YYYY-MM-DD`

**Exemples valides** :
- `2026-05-20`
- `2026-12-31`

**Exemples invalides** :
- `20/05/2026`
- `05-20-2026`
- `2026/05/20`

### Identifiants

Les identifiants (userId, roomId) sont des chaînes de caractères alphanumériques.

**Exemples** :
- `user_123`
- `201`
- `abc123xyz`

---

# Scénarios de Test Complets

## Scénario 1 : Réservation Complète (REST)

**Étape 1 : Vérifier les chambres disponibles**
```bash
curl http://localhost:3000/rooms
```

**Étape 2 : Vérifier la disponibilité pour des dates spécifiques**
```bash
curl -X POST http://localhost:3000/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```

**Étape 3 : Créer la réservation**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```

**Étape 4 : Vérifier les points de fidélité**
```bash
curl http://localhost:3000/users/user_123
```
✅ Les points doivent être incrémentés de +10

---

## Scénario 2 : Tentative de Double Réservation

**Étape 1 : Créer une première réservation**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```
✅ Réponse : `success: true`

**Étape 2 : Tenter de réserver à nouveau sur les mêmes dates**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_456",
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```
✅ Réponse : `success: false, message: "Cette chambre est déjà réservée pour cette période."`

---

## Scénario 3 : Réservations sur Dates Différentes

**Étape 1 : Réserver chambre 201 du 20 au 25 mai**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "roomId": "201",
    "startDate": "2026-05-20",
    "endDate": "2026-05-25"
  }'
```
✅ Réponse : `success: true`

**Étape 2 : Réserver la même chambre du 1 au 5 juin**
```bash
curl -X POST http://localhost:3000/bookings \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user_123",
    "roomId": "201",
    "startDate": "2026-06-01",
    "endDate": "2026-06-05"
  }'
```
✅ Réponse : `success: true` (dates différentes, pas de chevauchement)

---

## Scénario 4 : Réservation via GraphQL

**Étape 1 : Vérifier les chambres disponibles**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { allRooms { id title price_per_night isAvailable } }"}'
```

**Étape 2 : Créer une réservation**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "mutation { createBooking(userId: \"user_123\", roomId: \"201\", startDate: \"2026-05-20\", endDate: \"2026-05-25\") { success message bookingId } }"}'
```

**Étape 3 : Vérifier l'utilisateur**
```bash
curl -X POST http://localhost:3000/graphql \
  -H "Content-Type: application/json" \
  -d '{"query": "query { user(id: \"user_123\") { id name loyaltyPoints } }"}'
```

---

# Collection Postman

## Importer la Collection

Vous pouvez importer cette collection JSON dans Postman pour tester tous les endpoints facilement.

**Fichier : `StaySmart_Collection.json`**

```json
{
  "info": {
    "name": "StaySmart Microservices",
    "description": "Collection complète pour tester l'API StaySmart",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "REST - Chambres",
      "item": [
        {
          "name": "GET Liste des Chambres",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "http://localhost:3000/rooms",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["rooms"]
            }
          }
        }
      ]
    },
    {
      "name": "REST - Réservations",
      "item": [
        {
          "name": "POST Créer Réservation",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"userId\": \"user_123\",\n  \"roomId\": \"201\",\n  \"startDate\": \"2026-05-20\",\n  \"endDate\": \"2026-05-25\"\n}"
            },
            "url": {
              "raw": "http://localhost:3000/bookings",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["bookings"]
            }
          }
        },
        {
          "name": "POST Vérifier Disponibilité",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"roomId\": \"201\",\n  \"startDate\": \"2026-05-20\",\n  \"endDate\": \"2026-05-25\"\n}"
            },
            "url": {
              "raw": "http://localhost:3000/check-availability",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["check-availability"]
            }
          }
        }
      ]
    },
    {
      "name": "REST - Utilisateurs",
      "item": [
        {
          "name": "GET Utilisateur par ID",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "http://localhost:3000/users/user_123",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["users", "user_123"]
            }
          }
        },
        {
          "name": "POST Créer Utilisateur",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"Nouveau Client\",\n  \"email\": \"nouveau@example.com\"\n}"
            },
            "url": {
              "raw": "http://localhost:3000/users",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["users"]
            }
          }
        }
      ]
    },
    {
      "name": "GraphQL",
      "item": [
        {
          "name": "Query - Utilisateur",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"query { user(id: \\\"user_123\\\") { id name email loyaltyPoints } }\"\n}"
            },
            "url": {
              "raw": "http://localhost:3000/graphql",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Query - Toutes les Chambres",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"query { allRooms { id title description price_per_night isAvailable } }\"\n}"
            },
            "url": {
              "raw": "http://localhost:3000/graphql",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["graphql"]
            }
          }
        },
        {
          "name": "Mutation - Créer Réservation",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Content-Type",
                "value": "application/json"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"query\": \"mutation { createBooking(userId: \\\"user_123\\\", roomId: \\\"201\\\", startDate: \\\"2026-05-20\\\", endDate: \\\"2026-05-25\\\") { success message bookingId } }\"\n}"
            },
            "url": {
              "raw": "http://localhost:3000/graphql",
              "protocol": "http",
              "host": ["localhost"],
              "port": "3000",
              "path": ["graphql"]
            }
          }
        }
      ]
    }
  ]
}
```

---

## Limitations actuelles

-  Pas d'authentification requise (à implémenter en production)
-  Pas de rate limiting (à implémenter en production)
-  Pas de pagination pour la liste des chambres
-  Pas de filtrage ou de recherche avancée

---

# Notes techniques

## Communication interne

L'API Gateway communique avec les microservices via gRPC :

| Endpoint | Microservice | Méthode gRPC |
|----------|--------------|--------------|
| GET /rooms | MS-Rooms (50051) | ListRooms |
| GET /users/:id | MS-Users (50053) | GetUser |
| POST /bookings | MS-Rooms (50051) | GetRoom |
| POST /bookings | MS-Bookings (50052) | CreateBooking |
| POST /check-availability | MS-Bookings (50052) | CheckAvailability |
| POST /users | MS-Users (50053) | CreateUser |
| GraphQL allRooms | MS-Rooms (50051) | ListRooms |
| GraphQL user | MS-Users (50053) | GetUser |
| GraphQL users | MS-Users (50053) | ListUsers |
| GraphQL createBooking | MS-Bookings (50052) | CreateBooking |

### Gestion des erreurs

Toutes les erreurs sont retournées au format JSON :

```json
{
  "success": false,
  "message": "Description de l'erreur",
  "status": "CODE_ERREUR" // optionnel
}
```

---

**Version** : 1.0  
**Date** : Mai 2026
