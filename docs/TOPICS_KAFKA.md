# Topics Kafka - StaySmart Microservices

## Configuration Kafka

**Broker** : `localhost:9092`  
**Zookeeper** : `localhost:2181`

---

## 1. Topic : hotel-bookings-topic

### Description

Topic principal pour la communication asynchrone entre les microservices. Utilisé pour diffuser les événements de réservation.

### Configuration

| Paramètre | Valeur |
|-----------|--------|
| Nom | `hotel-bookings-topic` |
| Partitions | 1 |
| Facteur de réplication | 1 |
| Retention | 7 jours (par défaut) |

### Producer

**Microservice** : Bookings (Port 50052)

**Rôle** : Publie un événement chaque fois qu'une réservation est créée

**Configuration** :
```javascript
const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: ['localhost:9092']
});
const producer = kafka.producer();
```

### Consumers

#### Consumer 1 : Microservice Rooms

**Configuration** :
```javascript
const kafka = new Kafka({
  clientId: 'room-service',
  brokers: ['localhost:9092']
});
const consumer = kafka.consumer({ groupId: 'room-group' });
```

**Rôle** : Met à jour la disponibilité des chambres

**Action** : Lorsqu'un événement `BOOKING_CREATED` est reçu, met `is_available = false` pour la chambre concernée

#### Consumer 2 : Microservice Users

**Configuration** :
```javascript
const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['localhost:9092']
});
const consumer = kafka.consumer({ groupId: 'user-group' });
```

**Rôle** : Gère les points de fidélité

**Action** : Lorsqu'un événement `BOOKING_CREATED` est reçu, ajoute +10 points de fidélité à l'utilisateur

---

## 2. Format des messages

### Structure générale

Tous les messages sont au format JSON sérialisé en chaîne de caractères.

```json
{
  "event": "string",
  "bookingId": "number|string",
  "userId": "string",
  "roomId": "string",
  "startDate": "string",
  "endDate": "string",
  "timestamp": "string (ISO 8601)"
}
```

### Événement : BOOKING_CREATED

Publié lorsqu'une nouvelle réservation est créée avec succès.

**Champs** :

| Champ | Type | Description | Requis |
|-------|------|-------------|--------|
| event | string | Type d'événement (toujours "BOOKING_CREATED") | Oui |
| bookingId | number/string | Identifiant unique de la réservation | Oui |
| userId | string | Identifiant de l'utilisateur | Oui |
| roomId | string | Identifiant de la chambre réservée | Oui |
| startDate | string | Date de début (YYYY-MM-DD) | Oui |
| endDate | string | Date de fin (YYYY-MM-DD) | Oui |
| timestamp | string | Horodatage de l'événement (ISO 8601) | Oui |

**Exemple de message** :
```json
{
  "event": "BOOKING_CREATED",
  "bookingId": 1,
  "userId": "user_123",
  "roomId": "201",
  "startDate": "2026-05-20",
  "endDate": "2026-05-25",
  "timestamp": "2026-05-14T10:30:00.000Z"
}
```

---

## 3. Flux de données

### Scénario : Création d'une réservation

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Microservice Bookings crée une réservation              │
│    - Sauvegarde dans SQLite3                                │
│    - Génère bookingId = 1                                   │
└────────────────────────┬────────────────────────────────────┘
                         │
                         │ producer.send()
                         ↓
┌─────────────────────────────────────────────────────────────┐
│ 2. Kafka Broker reçoit le message                          │
│    - Topic: hotel-bookings-topic                            │
│    - Partition: 0                                           │
│    - Offset: 5 (exemple)                                    │
└────────────┬───────────────────────────┬────────────────────┘
             │                           │
             │ Distribution              │ Distribution
             ↓                           ↓
┌────────────────────────┐    ┌────────────────────────────┐
│ 3a. MS-Rooms (Consumer)│    │ 3b. MS-Users (Consumer)    │
│                        │    │                            │
│ Reçoit l'événement     │    │ Reçoit l'événement         │
│ BOOKING_CREATED        │    │ BOOKING_CREATED            │
│                        │    │                            │
│ Action:                │    │ Action:                    │
│ UPDATE rooms           │    │ UPDATE users               │
│ SET is_available=false │    │ SET loyaltyPoints+=10      │
│ WHERE id='201'         │    │ WHERE id='user_123'        │
└────────────────────────┘    └────────────────────────────┘
```

---

## 4. Gestion des erreurs

### Erreur de connexion

Si un consumer ne peut pas se connecter à Kafka :

```javascript
try {
  await consumer.connect();
  console.log('✅ Consommateur Kafka connecté');
} catch (error) {
  console.error('❌ Erreur de connexion Kafka:', error);
}
```

### Erreur de traitement

Si un consumer échoue à traiter un message :

```javascript
await consumer.run({
  eachMessage: async ({ message }) => {
    try {
      const eventData = JSON.parse(message.value.toString());
      // Traitement...
    } catch (error) {
      console.error('❌ Erreur de traitement:', error);
      // Le message n'est pas re-traité (at-most-once delivery)
    }
  }
});
```

### Stratégie de retry

**Actuelle** : Aucune stratégie de retry (at-most-once delivery)

**Recommandée pour la production** :
- Implémenter un Dead Letter Queue (DLQ)
- Ajouter un mécanisme de retry avec backoff exponentiel
- Logger les erreurs dans un système centralisé

---

## 5. Monitoring

### Commandes utiles

**Lister les topics** :
```bash
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092
```

**Voir les messages d'un topic** :
```bash
docker exec -it kafka kafka-console-consumer \
  --topic hotel-bookings-topic \
  --from-beginning \
  --bootstrap-server localhost:9092
```

**Publier un message de test** :
```bash
docker exec -it kafka kafka-console-producer \
  --topic hotel-bookings-topic \
  --bootstrap-server localhost:9092
```

Puis saisir :
```json
{"event":"BOOKING_CREATED","bookingId":999,"userId":"test","roomId":"201","startDate":"2026-05-20","endDate":"2026-05-25","timestamp":"2026-05-14T10:00:00.000Z"}
```

**Voir les consumer groups** :
```bash
docker exec -it kafka kafka-consumer-groups \
  --list \
  --bootstrap-server localhost:9092
```

**Voir les offsets d'un consumer group** :
```bash
docker exec -it kafka kafka-consumer-groups \
  --describe \
  --group room-group \
  --bootstrap-server localhost:9092
```

---

## 6. Métriques importantes

### Latence

| Étape | Durée estimée |
|-------|---------------|
| Publication du message | ~15ms |
| Distribution par Kafka | ~10ms |
| Réception par consumer | ~5ms |
| Traitement du message | ~10ms |
| **Total** | **~40ms** |

### Throughput

- **Messages par seconde** : ~1000 (configuration actuelle)
- **Taille moyenne d'un message** : ~200 bytes

---

## 7. Garanties de livraison

### Configuration actuelle

**Producer** :
- `acks` : 1 (par défaut)
- Garantie : At-least-once delivery

**Consumer** :
- `autoCommit` : true (par défaut)
- Garantie : At-most-once delivery

### Recommandations pour la production

**Pour garantir exactly-once delivery** :
1. Activer les transactions Kafka
2. Implémenter l'idempotence côté consumer
3. Utiliser des identifiants uniques pour déduplication

---

## 8. Scalabilité

### Augmenter le nombre de partitions

```bash
docker exec -it kafka kafka-topics --alter \
  --topic hotel-bookings-topic \
  --partitions 3 \
  --bootstrap-server localhost:9092
```

**Avantages** :
- Parallélisation du traitement
- Meilleure distribution de la charge

**Considérations** :
- Nombre de partitions ≤ nombre de consumers dans un groupe
- Les messages d'une même partition sont traités dans l'ordre

### Augmenter le facteur de réplication

**Production** : Utiliser un facteur de réplication de 3

```bash
docker exec -it kafka kafka-topics --create \
  --topic hotel-bookings-topic \
  --partitions 3 \
  --replication-factor 3 \
  --bootstrap-server localhost:9092
```

**Avantages** :
- Haute disponibilité
- Tolérance aux pannes

---

## 9. Sécurité

### Configuration actuelle

⚠️ **Aucune sécurité** : Kafka est accessible sans authentification

### Recommandations pour la production

1. **Authentification** : Activer SASL/SCRAM ou mTLS
2. **Chiffrement** : Activer SSL/TLS pour les communications
3. **Autorisation** : Configurer les ACLs Kafka
4. **Isolation réseau** : Utiliser un réseau privé

---

## 10. Événements futurs (à implémenter)

### BOOKING_CANCELLED

Publié lorsqu'une réservation est annulée.

```json
{
  "event": "BOOKING_CANCELLED",
  "bookingId": 1,
  "userId": "user_123",
  "roomId": "201",
  "timestamp": "2026-05-15T14:00:00.000Z"
}
```

**Actions** :
- MS-Rooms : Remettre `is_available = true`
- MS-Users : Retirer les points de fidélité

### USER_CREATED

Publié lorsqu'un nouvel utilisateur est créé.

```json
{
  "event": "USER_CREATED",
  "userId": "abc123",
  "name": "Jean Dupont",
  "email": "jean@example.com",
  "timestamp": "2026-05-14T09:00:00.000Z"
}
```

### ROOM_UPDATED

Publié lorsqu'une chambre est modifiée.

```json
{
  "event": "ROOM_UPDATED",
  "roomId": "201",
  "price_per_night": 160.0,
  "timestamp": "2026-05-14T11:00:00.000Z"
}
```

---

**Version** : 1.0  
**Date** : Mai 2026
