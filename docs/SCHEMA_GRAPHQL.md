# Schéma GraphQL - API Gateway

## URL GraphQL Playground

```
http://localhost:3000/graphql
```

---

## 1. Types

### User

Représente un utilisateur du système.

```graphql
type User {
  id: String!
  name: String!
  email: String!
  loyaltyPoints: Int
}
```

**Champs** :
- `id` : Identifiant unique de l'utilisateur (requis)
- `name` : Nom complet de l'utilisateur (requis)
- `email` : Adresse email de l'utilisateur (requis)
- `loyaltyPoints` : Points de fidélité accumulés (optionnel, par défaut 0)

---

### Room

Représente une chambre d'hôtel.

```graphql
type Room {
  id: String!
  title: String!
  description: String!
  price_per_night: Float!
  isAvailable: Boolean
}
```

**Champs** :
- `id` : Identifiant unique de la chambre (requis)
- `title` : Nom de la chambre (requis)
- `description` : Description détaillée de la chambre (requis)
- `price_per_night` : Prix par nuit en euros (requis)
- `isAvailable` : Disponibilité de la chambre (optionnel, par défaut true)

---

### BookingResponse

Représente la réponse après une tentative de réservation.

```graphql
type BookingResponse {
  success: Boolean!
  message: String!
  bookingId: String
}
```

**Champs** :
- `success` : Indique si la réservation a réussi (requis)
- `message` : Message descriptif du résultat (requis)
- `bookingId` : Identifiant de la réservation créée (optionnel, présent si success = true)

---

## 2. Queries

### user

Récupère les informations d'un utilisateur spécifique.

```graphql
user(id: String!): User
```

**Arguments** :
- `id` : Identifiant de l'utilisateur (requis)

**Retour** : Objet `User` ou `null` si non trouvé

**Exemple** :
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

### users

Récupère la liste de tous les utilisateurs.

```graphql
users: [User]
```

**Arguments** : Aucun

**Retour** : Liste d'objets `User`

**Exemple** :
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

**Réponse** :
```json
{
  "data": {
    "users": [
      {
        "id": "1",
        "name": "Hiba Ibrahim",
        "email": "hiba@example.com",
        "loyaltyPoints": 0
      },
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

### room

Récupère les informations d'une chambre spécifique.

```graphql
room(id: String!): Room
```

**Arguments** :
- `id` : Identifiant de la chambre (requis)

**Retour** : Objet `Room` ou `null` si non trouvé

**Exemple** :
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

**Réponse** :
```json
{
  "data": {
    "room": {
      "id": "201",
      "title": "Suite Royale",
      "description": "Vue sur mer",
      "price_per_night": 150.0,
      "isAvailable": true
    }
  }
}
```

---

### allRooms

Récupère la liste de toutes les chambres.

```graphql
allRooms: [Room]
```

**Arguments** : Aucun

**Retour** : Liste d'objets `Room`

**Exemple** :
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

**Réponse** :
```json
{
  "data": {
    "allRooms": [
      {
        "id": "201",
        "title": "Suite Royale",
        "description": "Vue sur mer",
        "price_per_night": 150.0,
        "isAvailable": true
      },
      {
        "id": "202",
        "title": "Chambre Deluxe",
        "description": "Lit King Size et Jacuzzi",
        "price_per_night": 95.0,
        "isAvailable": true
      }
    ]
  }
}
```

---

## 3. Mutations

### createBooking

Crée une nouvelle réservation pour une chambre.

```graphql
createBooking(
  userId: String!
  roomId: String!
  startDate: String!
  endDate: String!
): BookingResponse
```

**Arguments** :
- `userId` : Identifiant de l'utilisateur (requis)
- `roomId` : Identifiant de la chambre (requis)
- `startDate` : Date de début au format YYYY-MM-DD (requis)
- `endDate` : Date de fin au format YYYY-MM-DD (requis)

**Retour** : Objet `BookingResponse`

**Exemple** :
```graphql
mutation {
  createBooking(
    userId: "user_123"
    roomId: "201"
    startDate: "2026-05-20"
    endDate: "2026-05-25"
  ) {
    success
    message
    bookingId
  }
}
```

**Réponse réussie** :
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

**Réponse échouée** :
```json
{
  "data": {
    "createBooking": {
      "success": false,
      "message": "Erreur lors de la réservation.",
      "bookingId": null
    }
  }
}
```

**Effets secondaires** :
- La réservation est sauvegardée dans la base de données
- Un événement Kafka `BOOKING_CREATED` est publié
- La disponibilité de la chambre est mise à jour (via Kafka)
- L'utilisateur reçoit +10 points de fidélité (via Kafka)

---

## 4. Schéma complet

```graphql
type User {
  id: String!
  name: String!
  email: String!
  loyaltyPoints: Int
}

type Room {
  id: String!
  title: String!
  description: String!
  price_per_night: Float!
  isAvailable: Boolean
}

type BookingResponse {
  success: Boolean!
  message: String!
  bookingId: String
}

type Query {
  user(id: String!): User
  room(id: String!): Room
  allRooms: [Room]
  users: [User]
}

type Mutation {
  createBooking(
    userId: String!
    roomId: String!
    startDate: String!
    endDate: String!
  ): BookingResponse
}
```

---

## 5. Exemples d'utilisation

### Exemple 1 : Récupérer toutes les chambres disponibles

**Requête** :
```graphql
query GetAvailableRooms {
  allRooms {
    id
    title
    price_per_night
    isAvailable
  }
}
```

**Utilisation** : Afficher la liste des chambres sur la page d'accueil

---

### Exemple 2 : Vérifier les points de fidélité d'un utilisateur

**Requête** :
```graphql
query GetUserLoyalty {
  user(id: "user_123") {
    name
    loyaltyPoints
  }
}
```

**Utilisation** : Afficher le solde de points dans le profil utilisateur

---

### Exemple 3 : Réserver une chambre

**Requête** :
```graphql
mutation BookRoom {
  createBooking(
    userId: "user_123"
    roomId: "201"
    startDate: "2026-05-20"
    endDate: "2026-05-25"
  ) {
    success
    message
    bookingId
  }
}
```

**Utilisation** : Formulaire de réservation

---

### Exemple 4 : Requête combinée

**Requête** :
```graphql
query GetDashboardData {
  user(id: "user_123") {
    name
    email
    loyaltyPoints
  }
  allRooms {
    id
    title
    price_per_night
    isAvailable
  }
}
```

**Utilisation** : Charger toutes les données nécessaires pour le tableau de bord en une seule requête

---

## 6. Gestion des erreurs

### Erreur de validation

```json
{
  "errors": [
    {
      "message": "Variable \"$userId\" of required type \"String!\" was not provided.",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ]
    }
  ]
}
```

### Erreur serveur

```json
{
  "errors": [
    {
      "message": "14 UNAVAILABLE: No connection established",
      "locations": [
        {
          "line": 2,
          "column": 3
        }
      ],
      "path": [
        "user"
      ]
    }
  ],
  "data": {
    "user": null
  }
}
```

---

## 7. Communication interne

Le serveur GraphQL communique avec les microservices via gRPC :

| Query/Mutation | Microservice | Méthode gRPC |
|----------------|--------------|--------------|
| user | MS-Users (50053) | GetUser |
| users | MS-Users (50053) | ListUsers |
| room | MS-Rooms (50051) | GetRoom |
| allRooms | MS-Rooms (50051) | ListRooms |
| createBooking | MS-Rooms (50051) | GetRoom |
| createBooking | MS-Bookings (50052) | CreateBooking |

---

## 8. Avantages de GraphQL

- ✅ **Requêtes flexibles** : Le client demande exactement les données dont il a besoin
- ✅ **Une seule requête** : Récupérer des données de plusieurs sources en une fois
- ✅ **Typage fort** : Validation automatique des requêtes
- ✅ **Documentation intégrée** : GraphQL Playground génère automatiquement la documentation
- ✅ **Introspection** : Le schéma peut être interrogé pour découvrir les types disponibles

---

## 9. Tester avec GraphQL Playground

1. Démarrer l'API Gateway : `cd api-gateway && node index.js`
2. Ouvrir le navigateur : `http://localhost:3000/graphql`
3. Utiliser l'interface pour :
   - Explorer le schéma (onglet "Docs")
   - Écrire des requêtes (panneau de gauche)
   - Voir les résultats (panneau de droite)
   - Tester les mutations

---

## 10. Limitations actuelles

- ⚠️ Pas de pagination pour les listes
- ⚠️ Pas de filtrage ou de tri
- ⚠️ Pas de subscriptions (temps réel)
- ⚠️ Pas d'authentification

---

**Version** : 1.0  
**Date** : Mai 2026
