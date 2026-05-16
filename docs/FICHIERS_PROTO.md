# Fichiers Protocol Buffers (.proto)

## Introduction

Les fichiers `.proto` définissent les contrats de communication gRPC entre l'API Gateway et les microservices. Ils utilisent le langage Protocol Buffers de Google pour décrire les services, les méthodes et les messages.

---

## 1. user.proto

### Emplacement

```
protos/user.proto
```

### Description

Définit le service de gestion des utilisateurs.

### Contenu complet

```protobuf
syntax = "proto3";

package user;

service UserService {
  rpc GetUser (UserRequest) returns (UserResponse);
  
  rpc ListUsers (Empty) returns (UserList);
  
  rpc CreateUser (CreateUserRequest) returns (UserResponse);
}

message Empty {}

message UserRequest {
  string id = 1;
}

message CreateUserRequest {
  string name = 1;
  string email = 2;
}

message UserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
}

message UserList {
  repeated UserResponse users = 1;
}
```

### Service : UserService

| Méthode | Requête | Réponse | Description |
|---------|---------|---------|-------------|
| GetUser | UserRequest | UserResponse | Récupère un utilisateur par son ID |
| ListUsers | Empty | UserList | Récupère la liste de tous les utilisateurs |
| CreateUser | CreateUserRequest | UserResponse | Crée un nouvel utilisateur |

### Messages

#### Empty
Message vide utilisé pour les requêtes sans paramètres.

#### UserRequest
Requête pour récupérer un utilisateur.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| id | string | 1 | Identifiant de l'utilisateur |

#### CreateUserRequest
Requête pour créer un utilisateur.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| name | string | 1 | Nom de l'utilisateur |
| email | string | 2 | Email de l'utilisateur |

#### UserResponse
Réponse contenant les informations d'un utilisateur.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| id | string | 1 | Identifiant de l'utilisateur |
| name | string | 2 | Nom de l'utilisateur |
| email | string | 3 | Email de l'utilisateur |

#### UserList
Liste d'utilisateurs.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| users | repeated UserResponse | 1 | Liste des utilisateurs |

### Utilisation

**Serveur (Microservice Users)** :
```javascript
const protoLoader = require('@grpc/proto-loader');
const grpc = require('@grpc/grpc-js');

const packageDefinition = protoLoader.loadSync('protos/user.proto', {});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

const server = new grpc.Server();
server.addService(userProto.UserService.service, {
  getUser: (call, callback) => { /* ... */ },
  listUsers: (call, callback) => { /* ... */ },
  createUser: (call, callback) => { /* ... */ }
});
```

**Client (API Gateway)** :
```javascript
const userClient = new userProto.UserService(
  'localhost:50053',
  grpc.credentials.createInsecure()
);

userClient.getUser({ id: 'user_123' }, (err, response) => {
  console.log(response);
});
```

---

## 2. room.proto

### Emplacement

```
protos/room.proto
```

### Description

Définit le service de gestion des chambres.

### Contenu complet

```protobuf
syntax = "proto3";

package room;

service RoomService {
  rpc GetRoom (RoomRequest) returns (RoomResponse) {}
  rpc ListRooms (Empty) returns (RoomListResponse) {}
}

message RoomRequest {
  string id = 1;
}

message Empty {}

message RoomResponse {
  string id = 1;
  string title = 2;
  string description = 3;
  float price_per_night = 4;
  bool is_available = 5; 
}

message RoomListResponse {
  repeated RoomResponse rooms = 1;
}
```

### Service : RoomService

| Méthode | Requête | Réponse | Description |
|---------|---------|---------|-------------|
| GetRoom | RoomRequest | RoomResponse | Récupère une chambre par son ID |
| ListRooms | Empty | RoomListResponse | Récupère la liste de toutes les chambres |

### Messages

#### RoomRequest
Requête pour récupérer une chambre.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| id | string | 1 | Identifiant de la chambre |

#### Empty
Message vide utilisé pour les requêtes sans paramètres.

#### RoomResponse
Réponse contenant les informations d'une chambre.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| id | string | 1 | Identifiant de la chambre |
| title | string | 2 | Nom de la chambre |
| description | string | 3 | Description de la chambre |
| price_per_night | float | 4 | Prix par nuit en euros |
| is_available | bool | 5 | Disponibilité de la chambre |

#### RoomListResponse
Liste de chambres.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| rooms | repeated RoomResponse | 1 | Liste des chambres |

### Utilisation

**Serveur (Microservice Rooms)** :
```javascript
const packageDefinition = protoLoader.loadSync('protos/room.proto', { 
  keepCase: true 
});
const roomProto = grpc.loadPackageDefinition(packageDefinition).room;

const server = new grpc.Server();
server.addService(roomProto.RoomService.service, {
  getRoom: async (call, callback) => { /* ... */ },
  listRooms: async (call, callback) => { /* ... */ }
});
```

**Client (API Gateway)** :
```javascript
const roomClient = new roomProto.RoomService(
  'localhost:50051',
  grpc.credentials.createInsecure()
);

roomClient.listRooms({}, (err, response) => {
  console.log(response.rooms);
});
```

---

## 3. booking.proto

### Emplacement

```
protos/booking.proto
```

### Description

Définit le service de gestion des réservations.

### Contenu complet

```protobuf
syntax = "proto3";

package booking;

service BookingService {
  rpc CreateBooking (BookingRequest) returns (BookingResponse);
  rpc GetUserBookings (UserBookingsRequest) returns (BookingList);
}

message BookingRequest {
  string userId = 1;
  string roomId = 2;
  string start_date = 3;
  string end_date = 4;
}

message BookingResponse {
  string id = 1;
  string status = 2;
}

message UserBookingsRequest {
  string userId = 1;
}

message BookingList {
  repeated BookingResponse bookings = 1;
}
```

### Service : BookingService

| Méthode | Requête | Réponse | Description |
|---------|---------|---------|-------------|
| CreateBooking | BookingRequest | BookingResponse | Crée une nouvelle réservation |
| GetUserBookings | UserBookingsRequest | BookingList | Récupère les réservations d'un utilisateur |

### Messages

#### BookingRequest
Requête pour créer une réservation.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| userId | string | 1 | Identifiant de l'utilisateur |
| roomId | string | 2 | Identifiant de la chambre |
| start_date | string | 3 | Date de début (YYYY-MM-DD) |
| end_date | string | 4 | Date de fin (YYYY-MM-DD) |

#### BookingResponse
Réponse après création d'une réservation.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| id | string | 1 | Identifiant de la réservation |
| status | string | 2 | Statut de la réservation (CONFIRMED, FAILED) |

#### UserBookingsRequest
Requête pour récupérer les réservations d'un utilisateur.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| userId | string | 1 | Identifiant de l'utilisateur |

#### BookingList
Liste de réservations.

| Champ | Type | Position | Description |
|-------|------|----------|-------------|
| bookings | repeated BookingResponse | 1 | Liste des réservations |

### Utilisation

**Serveur (Microservice Bookings)** :
```javascript
const packageDefinition = protoLoader.loadSync('protos/booking.proto', {
  keepCase: true,
  longs: String,
  enums: String,
  defaults: true,
  oneofs: true
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;

const server = new grpc.Server();
server.addService(bookingProto.BookingService.service, {
  CreateBooking: createBooking,
  GetUserBookings: getUserBookings
});
```

**Client (API Gateway)** :
```javascript
const bookingClient = new bookingProto.BookingService(
  'localhost:50052',
  grpc.credentials.createInsecure()
);

bookingClient.createBooking({
  userId: 'user_123',
  roomId: '201',
  start_date: '2026-05-20',
  end_date: '2026-05-25'
}, (err, response) => {
  console.log(response.status);
});
```

---

## 4. Conventions de nommage

### Packages

- Utiliser des noms en minuscules
- Exemples : `user`, `room`, `booking`

### Services

- Utiliser PascalCase avec le suffixe "Service"
- Exemples : `UserService`, `RoomService`, `BookingService`

### Méthodes RPC

- Utiliser PascalCase
- Commencer par un verbe d'action
- Exemples : `GetUser`, `CreateBooking`, `ListRooms`

### Messages

- Utiliser PascalCase
- Suffixes courants : `Request`, `Response`, `List`
- Exemples : `UserRequest`, `BookingResponse`, `RoomList`

### Champs

- Utiliser snake_case (recommandé) ou camelCase
- Exemples : `user_id`, `start_date`, `price_per_night`

---

## 5. Types de données Protocol Buffers

| Type Proto | Type JavaScript | Description |
|------------|-----------------|-------------|
| string | string | Chaîne de caractères UTF-8 |
| int32 | number | Entier 32 bits signé |
| int64 | string | Entier 64 bits signé (converti en string) |
| float | number | Nombre à virgule flottante 32 bits |
| double | number | Nombre à virgule flottante 64 bits |
| bool | boolean | Booléen (true/false) |
| bytes | Buffer | Données binaires |
| repeated | Array | Liste d'éléments |

---

## 6. Options de chargement

### keepCase

Préserve la casse des noms de champs.

```javascript
// Sans keepCase
{ userId: 'user_123' }  // devient { userid: 'user_123' }

// Avec keepCase: true
{ userId: 'user_123' }  // reste { userId: 'user_123' }
```

### longs

Convertit les entiers 64 bits en chaînes.

```javascript
protoLoader.loadSync('file.proto', { longs: String });
```

### defaults

Définit les valeurs par défaut pour les champs manquants.

```javascript
protoLoader.loadSync('file.proto', { defaults: true });
```

---

## 7. Génération de code

### Compiler les fichiers .proto

```bash
# Installer le compilateur
npm install -g protoc

# Générer le code JavaScript
protoc --js_out=import_style=commonjs,binary:. protos/*.proto

# Générer le code TypeScript
protoc --plugin=protoc-gen-ts=./node_modules/.bin/protoc-gen-ts \
       --ts_out=. protos/*.proto
```

### Utilisation avec @grpc/proto-loader

Pas besoin de compilation préalable, chargement dynamique :

```javascript
const protoLoader = require('@grpc/proto-loader');
const packageDefinition = protoLoader.loadSync('protos/user.proto', {});
```

---

## 8. Bonnes pratiques

### Versioning

Ajouter un numéro de version au package :

```protobuf
syntax = "proto3";

package user.v1;

service UserService {
  // ...
}
```

### Rétrocompatibilité

-  Ajouter de nouveaux champs (avec de nouveaux numéros)
-  Ajouter de nouvelles méthodes RPC
-  Ne jamais supprimer ou renommer des champs existants
-  Ne jamais changer le type d'un champ

### Documentation

Ajouter des commentaires :

```protobuf
// Service de gestion des utilisateurs
service UserService {
  // Récupère un utilisateur par son identifiant
  rpc GetUser (UserRequest) returns (UserResponse);
}

message UserRequest {
  // Identifiant unique de l'utilisateur
  string id = 1;
}
```

---

## 9. Validation

### Exemple de validation côté serveur

```javascript
const validateBookingRequest = (request) => {
  if (!request.userId) {
    throw new Error('userId is required');
  }
  if (!request.roomId) {
    throw new Error('roomId is required');
  }
  if (!request.start_date || !request.end_date) {
    throw new Error('start_date and end_date are required');
  }
  // Valider le format des dates
  const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
  if (!dateRegex.test(request.start_date)) {
    throw new Error('Invalid start_date format (expected YYYY-MM-DD)');
  }
};
```

---

## 10. Évolutions futures

### Ajout de nouveaux champs

```protobuf
message UserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
  int32 loyaltyPoints = 4; 
  string phone = 5;          
}
```

### Ajout de nouvelles méthodes

```protobuf
service BookingService {
  rpc CreateBooking (BookingRequest) returns (BookingResponse);
  rpc GetUserBookings (UserBookingsRequest) returns (BookingList);
  rpc CancelBooking (CancelRequest) returns (CancelResponse); 
```

### Dépréciation

```protobuf
message UserResponse {
  string id = 1;
  string name = 2;
  string email = 3;
  string username = 4 [deprecated = true];  // ⚠️ Déprécié
}
```

---

**Version** : 1.0  
**Date** : Mai 2026
