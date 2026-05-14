# Bases de données - StaySmart Microservices

## Vue d'ensemble

Le projet utilise une architecture de bases de données hybride :
- **1 base NoSQL** (RxDB) pour le Microservice Rooms
- **2 bases SQL** (SQLite3) pour les Microservices Bookings et Users

---

## 1. Microservice Rooms - RxDB (NoSQL)

### Type de base de données

**RxDB** : Base de données NoSQL réactive en mémoire

### Caractéristiques

- **Type** : Document-oriented (NoSQL)
- **Stockage** : En mémoire (données perdues au redémarrage)
- **Réactivité** : Observables RxJS pour les changements en temps réel
- **Performance** : Très rapide (pas d'I/O disque)

### Collection : rooms

**Schéma** :
```javascript
{
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: { 
      type: 'string', 
      maxLength: 100 
    },
    title: { 
      type: 'string' 
    },
    description: { 
      type: 'string' 
    },
    price_per_night: { 
      type: 'number' 
    },
    is_available: { 
      type: 'boolean' 
    }
  },
  required: ['id', 'title', 'price_per_night']
}
```

**Champs** :

| Champ | Type | Description | Requis | Par défaut |
|-------|------|-------------|--------|------------|
| id | string | Identifiant unique de la chambre | Oui | - |
| title | string | Nom de la chambre | Oui | - |
| description | string | Description détaillée | Non | "" |
| price_per_night | number | Prix par nuit en euros | Oui | - |
| is_available | boolean | Disponibilité de la chambre | Non | true |

**Données initiales** :
```javascript
await db.rooms.insert({ 
  id: '201', 
  title: 'Suite Royale', 
  description: 'Vue sur mer', 
  price_per_night: 150.0,
  is_available: true
});

await db.rooms.insert({
  id: '202',
  title: 'Chambre Deluxe',
  description: 'Lit King Size et Jacuzzi',
  price_per_night: 95.0,
  is_available: true
});
```

### Opérations

**Lecture** :
```javascript
// Récupérer une chambre
const room = await db.rooms.findOne('201').exec();

// Récupérer toutes les chambres
const allRooms = await db.rooms.find().exec();
```

**Mise à jour** :
```javascript
// Mettre à jour la disponibilité
const room = await db.rooms.findOne('201').exec();
await room.incrementalPatch({ is_available: false });
```

**Insertion** :
```javascript
await db.rooms.insert({
  id: '203',
  title: 'Chambre Standard',
  description: 'Confortable et économique',
  price_per_night: 75.0,
  is_available: true
});
```

### Avantages

- ✅ Très rapide (en mémoire)
- ✅ Réactivité en temps réel
- ✅ Pas de configuration complexe
- ✅ Idéal pour les données volatiles

### Inconvénients

- ⚠️ Données perdues au redémarrage
- ⚠️ Limité par la RAM disponible
- ⚠️ Pas de persistance

### Recommandations pour la production

Remplacer RxDB par une base NoSQL persistante :
- **MongoDB** : Document-oriented, scalable
- **Redis** : Key-value store, très rapide
- **Cassandra** : Haute disponibilité, scalabilité horizontale

---

## 2. Microservice Bookings - SQLite3 (SQL)

### Type de base de données

**SQLite3** : Base de données SQL relationnelle embarquée

### Caractéristiques

- **Type** : Relationnelle (SQL)
- **Stockage** : Fichier `bookings.db`
- **Transactions** : Support ACID complet
- **Performance** : Rapide pour les petites/moyennes charges

### Table : bookings

**Schéma SQL** :
```sql
CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  roomId TEXT,
  startDate TEXT,
  endDate TEXT
);
```

**Champs** :

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | INTEGER | Identifiant unique (auto-incrémenté) | PRIMARY KEY, AUTOINCREMENT |
| userId | TEXT | Identifiant de l'utilisateur | - |
| roomId | TEXT | Identifiant de la chambre | - |
| startDate | TEXT | Date de début (YYYY-MM-DD) | - |
| endDate | TEXT | Date de fin (YYYY-MM-DD) | - |

**Exemple de données** :

| id | userId | roomId | startDate | endDate |
|----|--------|--------|-----------|---------|
| 1 | user_123 | 201 | 2026-05-20 | 2026-05-25 |
| 2 | user_456 | 202 | 2026-06-01 | 2026-06-05 |

### Opérations

**Insertion** :
```javascript
const sql = `INSERT INTO bookings (userId, roomId, startDate, endDate) 
             VALUES (?, ?, ?, ?)`;
db.run(sql, [userId, roomId, startDate, endDate], function(err) {
  const bookingId = this.lastID;
});
```

**Lecture** :
```javascript
// Vérifier si une chambre est déjà réservée
const sql = `SELECT * FROM bookings WHERE roomId = ?`;
db.get(sql, [roomId], (err, row) => {
  if (row) {
    // Chambre déjà réservée
  }
});
```

**Récupérer les réservations d'un utilisateur** :
```javascript
const sql = `SELECT * FROM bookings WHERE userId = ?`;
db.all(sql, [userId], (err, rows) => {
  // rows contient toutes les réservations
});
```

### Index recommandés

```sql
-- Index sur roomId pour vérifier rapidement la disponibilité
CREATE INDEX idx_bookings_roomId ON bookings(roomId);

-- Index sur userId pour récupérer les réservations d'un utilisateur
CREATE INDEX idx_bookings_userId ON bookings(userId);

-- Index composite pour les recherches par date
CREATE INDEX idx_bookings_dates ON bookings(startDate, endDate);
```

### Avantages

- ✅ Persistance des données
- ✅ Transactions ACID
- ✅ Pas de serveur à gérer
- ✅ Facile à déployer

### Inconvénients

- ⚠️ Pas de scalabilité horizontale
- ⚠️ Limité à un seul processus en écriture
- ⚠️ Pas adapté aux très grandes charges

### Recommandations pour la production

Migrer vers une base de données SQL distribuée :
- **PostgreSQL** : Robuste, features avancées
- **MySQL** : Populaire, bien supporté
- **CockroachDB** : Distribuée, compatible PostgreSQL

---

## 3. Microservice Users - SQLite3 (SQL)

### Type de base de données

**SQLite3** : Base de données SQL relationnelle embarquée

### Caractéristiques

Identiques au Microservice Bookings

### Table : users

**Schéma SQL** :
```sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT,
  email TEXT,
  loyaltyPoints INTEGER DEFAULT 0
);
```

**Champs** :

| Champ | Type | Description | Contraintes |
|-------|------|-------------|-------------|
| id | TEXT | Identifiant unique de l'utilisateur | PRIMARY KEY |
| name | TEXT | Nom complet de l'utilisateur | - |
| email | TEXT | Adresse email | - |
| loyaltyPoints | INTEGER | Points de fidélité accumulés | DEFAULT 0 |

**Données initiales** :
```sql
INSERT OR IGNORE INTO users (id, name, email, loyaltyPoints) 
VALUES ('1', 'Hiba Ibrahim', 'hiba@example.com', 0);

INSERT OR IGNORE INTO users (id, name, email, loyaltyPoints) 
VALUES ('user_123', 'Client Test Kafka', 'test@example.com', 0);
```

**Exemple de données** :

| id | name | email | loyaltyPoints |
|----|------|-------|---------------|
| 1 | Hiba Ibrahim | hiba@example.com | 0 |
| user_123 | Client Test Kafka | test@example.com | 10 |

### Opérations

**Insertion** :
```javascript
const sql = `INSERT INTO users (id, name, email, loyaltyPoints) 
             VALUES (?, ?, ?, 0)`;
db.run(sql, [id, name, email]);
```

**Lecture** :
```javascript
// Récupérer un utilisateur
const sql = `SELECT * FROM users WHERE id = ?`;
db.get(sql, [userId], (err, row) => {
  // row contient l'utilisateur
});

// Récupérer tous les utilisateurs
const sql = `SELECT * FROM users`;
db.all(sql, [], (err, rows) => {
  // rows contient tous les utilisateurs
});
```

**Mise à jour des points de fidélité** :
```javascript
const sql = `UPDATE users 
             SET loyaltyPoints = loyaltyPoints + 10 
             WHERE id = ?`;
db.run(sql, [userId]);
```

### Index recommandés

```sql
-- Index sur email pour éviter les doublons
CREATE UNIQUE INDEX idx_users_email ON users(email);

-- Index sur loyaltyPoints pour les classements
CREATE INDEX idx_users_loyalty ON users(loyaltyPoints DESC);
```

### Contraintes recommandées

```sql
-- Email unique
ALTER TABLE users ADD CONSTRAINT unique_email UNIQUE (email);

-- Points de fidélité non négatifs
ALTER TABLE users ADD CONSTRAINT check_loyalty 
CHECK (loyaltyPoints >= 0);
```

### Avantages

Identiques au Microservice Bookings

### Inconvénients

Identiques au Microservice Bookings

### Recommandations pour la production

Identiques au Microservice Bookings

---

## 4. Comparaison des bases de données

| Critère | RxDB (Rooms) | SQLite3 (Bookings) | SQLite3 (Users) |
|---------|--------------|-------------------|-----------------|
| Type | NoSQL | SQL | SQL |
| Persistance | ❌ Non | ✅ Oui | ✅ Oui |
| Transactions | ❌ Non | ✅ Oui | ✅ Oui |
| Performance lecture | ⚡ Très rapide | 🚀 Rapide | 🚀 Rapide |
| Performance écriture | ⚡ Très rapide | 🚀 Rapide | 🚀 Rapide |
| Scalabilité | ⚠️ Limitée (RAM) | ⚠️ Limitée | ⚠️ Limitée |
| Complexité | 🟢 Simple | 🟢 Simple | 🟢 Simple |
| Production-ready | ⚠️ Non | ⚠️ Non | ⚠️ Non |

---

## 5. Stratégie de sauvegarde

### Développement

Aucune sauvegarde nécessaire (données de test)

### Production

**SQLite3** :
```bash
# Sauvegarde quotidienne
sqlite3 bookings.db ".backup bookings_backup_$(date +%Y%m%d).db"
sqlite3 users.db ".backup users_backup_$(date +%Y%m%d).db"
```

**RxDB** :
Si migration vers MongoDB :
```bash
# Sauvegarde avec mongodump
mongodump --db rooms --out /backup/$(date +%Y%m%d)
```

---

## 6. Migration vers la production

### Étape 1 : Remplacer RxDB par MongoDB

**Avant** :
```javascript
const { createRxDatabase } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');
```

**Après** :
```javascript
const { MongoClient } = require('mongodb');
const client = new MongoClient('mongodb://localhost:27017');
const db = client.db('staysmart');
const rooms = db.collection('rooms');
```

### Étape 2 : Remplacer SQLite3 par PostgreSQL

**Avant** :
```javascript
const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./bookings.db');
```

**Après** :
```javascript
const { Pool } = require('pg');
const pool = new Pool({
  host: 'localhost',
  database: 'staysmart',
  user: 'postgres',
  password: 'password'
});
```

### Étape 3 : Adapter les requêtes

**SQLite3** :
```javascript
db.run("INSERT INTO users VALUES (?, ?, ?)", [id, name, email]);
```

**PostgreSQL** :
```javascript
await pool.query("INSERT INTO users VALUES ($1, $2, $3)", [id, name, email]);
```

---

## 7. Monitoring et maintenance

### Commandes utiles

**SQLite3** :
```bash
# Ouvrir une base de données
sqlite3 bookings.db

# Lister les tables
.tables

# Voir la structure d'une table
.schema bookings

# Exécuter une requête
SELECT * FROM bookings;

# Quitter
.quit
```

**Vérifier la taille des bases** :
```bash
# Windows
dir bookings.db
dir users.db

# Linux/Mac
ls -lh bookings.db users.db
```

### Optimisation

**SQLite3** :
```sql
-- Analyser les performances
EXPLAIN QUERY PLAN SELECT * FROM bookings WHERE roomId = '201';

-- Optimiser la base
VACUUM;

-- Analyser les statistiques
ANALYZE;
```

---

## 8. Sécurité

### Bonnes pratiques

1. **Requêtes paramétrées** : Toujours utiliser des placeholders (?, $1) pour éviter les injections SQL
2. **Validation des données** : Valider toutes les entrées utilisateur
3. **Chiffrement** : Chiffrer les bases de données en production
4. **Accès restreint** : Limiter les permissions sur les fichiers de base de données
5. **Sauvegardes chiffrées** : Chiffrer les sauvegardes

### Exemple de validation

```javascript
// ❌ Mauvais (injection SQL possible)
db.run(`SELECT * FROM users WHERE id = '${userId}'`);

// ✅ Bon (requête paramétrée)
db.get("SELECT * FROM users WHERE id = ?", [userId]);
```

---

## 9. Performance

### Métriques actuelles

| Opération | RxDB | SQLite3 |
|-----------|------|---------|
| Lecture simple | ~1ms | ~5ms |
| Écriture simple | ~2ms | ~10ms |
| Recherche | ~3ms | ~15ms |
| Mise à jour | ~2ms | ~10ms |

### Optimisations recommandées

1. **Index** : Créer des index sur les colonnes fréquemment recherchées
2. **Batch operations** : Grouper les insertions multiples
3. **Connection pooling** : Réutiliser les connexions
4. **Caching** : Mettre en cache les données fréquemment lues

---

## 10. Schéma relationnel (production)

### Diagramme ER recommandé

```
┌─────────────┐         ┌─────────────┐         ┌─────────────┐
│    users    │         │  bookings   │         │    rooms    │
├─────────────┤         ├─────────────┤         ├─────────────┤
│ id (PK)     │◄────────│ userId (FK) │         │ id (PK)     │
│ name        │         │ roomId (FK) │────────►│ title       │
│ email       │         │ startDate   │         │ description │
│loyaltyPoints│         │ endDate     │         │ price       │
└─────────────┘         │ id (PK)     │         │ isAvailable │
                        └─────────────┘         └─────────────┘
```

### Contraintes d'intégrité

```sql
-- Clés étrangères
ALTER TABLE bookings 
ADD CONSTRAINT fk_user 
FOREIGN KEY (userId) REFERENCES users(id);

ALTER TABLE bookings 
ADD CONSTRAINT fk_room 
FOREIGN KEY (roomId) REFERENCES rooms(id);

-- Contraintes de dates
ALTER TABLE bookings 
ADD CONSTRAINT check_dates 
CHECK (endDate > startDate);
```

---

**Version** : 1.0  
**Date** : Mai 2026
