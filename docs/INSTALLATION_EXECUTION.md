# Instructions d'installation et d'exécution

Ce document fournit des instructions détaillées pour installer et exécuter le projet StaySmart Microservices.

---

## Table des matières

1. [Prérequis](#prérequis)
2. [Installation](#installation)
3. [Configuration](#configuration)
4. [Exécution](#exécution)
5. [Vérification](#vérification)
6. [Arrêt](#arrêt)
7. [Dépannage](#dépannage)

---

## Prérequis

### Logiciels requis

| Logiciel | Version minimale | Vérification |
|----------|------------------|--------------|
| Node.js | 18.0.0 | `node --version` |
| npm | 8.0.0 | `npm --version` |
| Docker | 20.0.0 | `docker --version` |
| Docker Compose | 1.29.0 | `docker-compose --version` |

### Installation des prérequis

#### Windows

**Node.js** :
1. Télécharger depuis https://nodejs.org/
2. Exécuter l'installateur
3. Vérifier : `node --version`

**Docker Desktop** :
1. Télécharger depuis https://www.docker.com/products/docker-desktop
2. Exécuter l'installateur
3. Démarrer Docker Desktop
4. Vérifier : `docker --version`

#### Linux (Ubuntu/Debian)

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Docker
sudo apt-get update
sudo apt-get install docker.io docker-compose

# Vérification
node --version
docker --version
docker-compose --version
```

#### macOS

```bash
# Installer Homebrew si nécessaire
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Node.js
brew install node

# Docker Desktop
brew install --cask docker

# Vérification
node --version
docker --version
docker-compose --version
```

---

## Installation

### Étape 1 : Cloner ou extraire le projet

```bash
# Si le projet est sur Git
git clone <url-du-repo>
cd staysmart-microservices

# Ou extraire l'archive ZIP
unzip staysmart-microservices.zip
cd staysmart-microservices
```

### Étape 2 : Installer les dépendances

#### Installation automatique (recommandé)

**Windows** :
```batch
cd api-gateway && npm install && cd ..
cd microservice-rooms && npm install && cd ..
cd microservice-bookings && npm install && cd ..
cd microservice-users && npm install && cd ..
```

**Linux/macOS** :
```bash
for dir in api-gateway microservice-rooms microservice-bookings microservice-users; do
  cd $dir && npm install && cd ..
done
```

#### Installation manuelle

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

### Étape 3 : Vérifier l'installation

```bash
# Vérifier que node_modules existe dans chaque dossier
ls api-gateway/node_modules
ls microservice-rooms/node_modules
ls microservice-bookings/node_modules
ls microservice-users/node_modules
```

---

## Configuration

### Configuration de Kafka

Le fichier `docker-compose.yml` est déjà configuré. Aucune modification n'est nécessaire pour un environnement de développement local.

**Contenu de docker-compose.yml** :
```yaml
version: '3'
services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.3.0
    container_name: zookeeper
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181
      ZOOKEEPER_TICK_TIME: 2000

  kafka:
    image: confluentinc/cp-kafka:7.3.0
    container_name: kafka
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://localhost:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
```

### Ports utilisés

Assurez-vous que les ports suivants sont disponibles :

| Port | Service | Vérification |
|------|---------|--------------|
| 3000 | API Gateway | `netstat -ano \| findstr :3000` (Windows) |
| 50051 | MS-Rooms | `netstat -ano \| findstr :50051` (Windows) |
| 50052 | MS-Bookings | `netstat -ano \| findstr :50052` (Windows) |
| 50053 | MS-Users | `netstat -ano \| findstr :50053` (Windows) |
| 9092 | Kafka | `netstat -ano \| findstr :9092` (Windows) |
| 2181 | Zookeeper | `netstat -ano \| findstr :2181` (Windows) |

**Linux/macOS** :
```bash
lsof -i :3000
lsof -i :50051
lsof -i :50052
lsof -i :50053
lsof -i :9092
lsof -i :2181
```

---

## Exécution

### Étape 1 : Démarrer Kafka et Zookeeper

```bash
# Depuis la racine du projet
docker-compose up -d
```

**Vérifier que les conteneurs sont actifs** :
```bash
docker ps
```

**Sortie attendue** :
```
CONTAINER ID   IMAGE                             STATUS         PORTS
abc123def456   confluentinc/cp-kafka:7.3.0       Up 10 seconds  0.0.0.0:9092->9092/tcp
def456ghi789   confluentinc/cp-zookeeper:7.3.0   Up 15 seconds  2181/tcp
```

**Attendre 30 secondes** pour que Kafka soit complètement démarré.

### Étape 2 : Démarrer les microservices

Ouvrir **4 terminaux différents** (ou 4 onglets de terminal).

#### Terminal 1 : Microservice Rooms

```bash
cd microservice-rooms
node index.js
```

**Sortie attendue** :
```
✅ MS-Rooms : Consommateur Kafka connecté
🏁 [RXDB] Chambres 201 et 202 initialisées à disponible (true).
🚀 MS-Rooms (RxDB NoSQL + Kafka) démarré sur le port 50051
```

#### Terminal 2 : Microservice Bookings

```bash
cd microservice-bookings
node index.js
```

**Sortie attendue** :
```
✅ Connecté à la base de données SQLite (bookings.db)
✅ Connecté à Kafka avec succès
🚀 Microservice Bookings (gRPC) démarré sur le port 50052
```

#### Terminal 3 : Microservice Users

```bash
cd microservice-users
node index.js
```

**Sortie attendue** :
```
✅ Consommateur Kafka connecté
🚀 MS-Users (SQLite3 + Kafka) démarré sur le port 50053
```

#### Terminal 4 : API Gateway

```bash
cd api-gateway
node index.js
```

**Sortie attendue** :
```
🚀 API Gateway en ligne (Apollo + REST) !
```

### Étape 3 : Vérifier que tous les services sont démarrés

Tous les terminaux doivent afficher des messages de succès sans erreurs.

---

## Vérification

### Test 1 : API REST

```bash
curl http://localhost:3000/rooms
```

**Réponse attendue** :
```json
{
  "rooms": [
    {
      "id": "201",
      "title": "Suite Royale",
      "description": "Vue sur mer",
      "price_per_night": 150,
      "is_available": true
    },
    {
      "id": "202",
      "title": "Chambre Deluxe",
      "description": "Lit King Size et Jacuzzi",
      "price_per_night": 95,
      "is_available": true
    }
  ]
}
```

### Test 2 : GraphQL Playground

1. Ouvrir un navigateur
2. Aller sur : `http://localhost:3000/graphql`
3. Exécuter la requête suivante :

```graphql
query {
  allRooms {
    id
    title
    isAvailable
  }
}
```

**Réponse attendue** :
```json
{
  "data": {
    "allRooms": [
      {
        "id": "201",
        "title": "Suite Royale",
        "isAvailable": true
      },
      {
        "id": "202",
        "title": "Chambre Deluxe",
        "isAvailable": true
      }
    ]
  }
}
```

### Test 3 : Créer une réservation

**Via GraphQL** :
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

**Via REST** :
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

**Réponse attendue** :
```json
{
  "success": true,
  "id": "1",
  "status": "CONFIRMED",
  "message": "Réservation confirmée avec succès."
}
```

**Vérifier les logs** :

- **Terminal Bookings** : `[DB] 💾 Réservation 1 sauvegardée dans SQLite`
- **Terminal Rooms** : `🏨 [KAFKA] Réservation confirmée pour la chambre 201 !`
- **Terminal Users** : `🎉 [KAFKA] Réservation détectée pour user_123 ! +10 points de fidélité ajoutés.`

### Test 4 : Frontend HTML

1. Ouvrir le fichier `frontend-test/index.html` dans un navigateur
2. Remplir le formulaire de réservation
3. Cliquer sur "Réserver"
4. Vérifier le message de confirmation

---

## Arrêt

### Arrêter les microservices

Dans chaque terminal, appuyer sur `Ctrl + C`

### Arrêter Kafka et Zookeeper

```bash
docker-compose down
```

### Arrêter et supprimer les données Kafka (optionnel)

```bash
docker-compose down -v
```

---

## Dépannage

### Problème 1 : Kafka ne démarre pas

**Symptôme** :
```
Error: connect ECONNREFUSED 127.0.0.1:9092
```

**Solution** :
```bash
# Arrêter complètement
docker-compose down -v

# Redémarrer
docker-compose up -d

# Attendre 30 secondes
sleep 30

# Vérifier les logs
docker logs kafka
```

### Problème 2 : Port déjà utilisé

**Symptôme** :
```
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution Windows** :
```bash
# Trouver le processus
netstat -ano | findstr :3000

# Tuer le processus (remplacer <PID>)
taskkill /PID <PID> /F
```

**Solution Linux/macOS** :
```bash
# Tuer le processus
lsof -ti:3000 | xargs kill -9
```

### Problème 3 : Erreur de connexion gRPC

**Symptôme** :
```
Error: 14 UNAVAILABLE: No connection established
```

**Solution** :
1. Vérifier que tous les microservices sont démarrés
2. Vérifier les ports dans les logs de démarrage
3. Redémarrer dans l'ordre : Rooms → Bookings → Users → Gateway

### Problème 4 : Module non trouvé

**Symptôme** :
```
Error: Cannot find module '@grpc/grpc-js'
```

**Solution** :
```bash
# Réinstaller les dépendances
cd <microservice>
rm -rf node_modules package-lock.json
npm install
```

### Problème 5 : Base de données corrompue

**Symptôme** :
```
Error: SQLITE_CORRUPT: database disk image is malformed
```

**Solution** :
```bash
# Supprimer les fichiers de base de données
rm microservice-users/users.db
rm microservice-bookings/bookings.db

# Redémarrer les microservices (les tables seront recréées)
```

### Problème 6 : Docker Desktop n'est pas démarré

**Symptôme** :
```
Error: Cannot connect to the Docker daemon
```

**Solution** :
1. Démarrer Docker Desktop
2. Attendre que Docker soit complètement démarré
3. Relancer `docker-compose up -d`

---

## Commandes utiles

### Vérifier l'état des services

```bash
# Vérifier les conteneurs Docker
docker ps

# Vérifier les logs Kafka
docker logs kafka

# Vérifier les logs Zookeeper
docker logs zookeeper

# Lister les topics Kafka
docker exec -it kafka kafka-topics --list --bootstrap-server localhost:9092
```

### Nettoyer complètement

```bash
# Arrêter tous les services
docker-compose down -v

# Supprimer les bases de données
rm microservice-users/users.db
rm microservice-bookings/bookings.db

# Supprimer les node_modules (optionnel)
rm -rf api-gateway/node_modules
rm -rf microservice-rooms/node_modules
rm -rf microservice-bookings/node_modules
rm -rf microservice-users/node_modules

# Réinstaller
npm install
```

---

## Résumé des commandes

### Démarrage complet

```bash
# 1. Démarrer Kafka
docker-compose up -d

# 2. Attendre 30 secondes
sleep 30

# 3. Démarrer les microservices (4 terminaux)
# Terminal 1
cd microservice-rooms && node index.js

# Terminal 2
cd microservice-bookings && node index.js

# Terminal 3
cd microservice-users && node index.js

# Terminal 4
cd api-gateway && node index.js
```

### Arrêt complet

```bash
# 1. Arrêter les microservices (Ctrl+C dans chaque terminal)

# 2. Arrêter Kafka
docker-compose down
```

---

**Version** : 1.0  
**Date** : Mai 2026
