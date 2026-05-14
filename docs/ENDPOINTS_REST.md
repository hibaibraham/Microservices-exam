# Endpoints REST - API Gateway

## Base URL

```
http://localhost:3000
```

---

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

## 3. Gestion des utilisateurs

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

## 4. Codes de statut HTTP

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

## 6. Exemples d'utilisation

### Scénario complet : Réserver une chambre

**Étape 1 : Vérifier les chambres disponibles**
```bash
curl http://localhost:3000/rooms
```

**Étape 2 : Créer une réservation**
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

**Étape 3 : Vérifier que la chambre n'est plus disponible**
```bash
curl http://localhost:3000/rooms
```

---

## 7. Limitations actuelles

- ✅ Pas d'authentification requise (à implémenter en production)
- ✅ Pas de rate limiting (à implémenter en production)
- ✅ Pas de pagination pour la liste des chambres
- ✅ Pas de filtrage ou de recherche avancée

---

## 8. Notes techniques

### Communication interne

L'API Gateway communique avec les microservices via gRPC :

| Endpoint REST | Microservice | Méthode gRPC |
|---------------|--------------|--------------|
| GET /rooms | MS-Rooms (50051) | ListRooms |
| POST /bookings | MS-Rooms (50051) | GetRoom |
| POST /bookings | MS-Bookings (50052) | CreateBooking |
| POST /users | MS-Users (50053) | CreateUser |

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
