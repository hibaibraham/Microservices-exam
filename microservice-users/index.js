const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const { Kafka } = require('kafkajs'); 
const path = require('path');

const PROTO_PATH = path.join(__dirname, '../protos/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// 2. Initialiser la DB SQLite3
// On utilise un fichier './users.db' pour conserver les points de fidélité
const db = new sqlite3.Database('./users.db'); 
db.serialize(() => {
  // Ajout de la colonne loyaltyPoints
  db.run("CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, name TEXT, email TEXT, loyaltyPoints INTEGER DEFAULT 0)");
  
  // On insère tes utilisateurs de test 
  db.run("INSERT OR IGNORE INTO users (id, name, email, loyaltyPoints) VALUES ('1', 'Hiba Ibrahim', 'hiba@example.com', 0)");
  db.run("INSERT OR IGNORE INTO users (id, name, email, loyaltyPoints) VALUES ('user_123', 'Client Test Kafka', 'test@example.com', 0)");
});

// 3. Implémentation de la logique métier
const userService = {
  getUser: (call, callback) => {
    const userId = call.request.id;
    db.get("SELECT * FROM users WHERE id = ?", [userId], (err, row) => {
      if (err || !row) {
        callback({ code: grpc.status.NOT_FOUND, details: "Utilisateur non trouvé" });
      } else {
        callback(null, row);
      }
    });
  },
  listUsers: (call, callback) => {
    db.all("SELECT * FROM users", [], (err, rows) => {
      if (err) {
        callback({ code: grpc.status.INTERNAL, details: "Erreur lors de la récupération des utilisateurs" });
      } else {
        callback(null, { users: rows || [] });
      }
    });
  },
  createUser: (call, callback) => {
    const { name, email } = call.request;
    const id = Math.random().toString(36).substr(2, 9);
    db.run("INSERT INTO users (id, name, email, loyaltyPoints) VALUES (?, ?, ?, 0)", [id, name, email], (err) => {
      if (err) callback(err);
      else callback(null, { id, name, email, loyaltyPoints: 0 });
    });
  }
};

// 4. Configuration du Consommateur Kafka
const kafka = new Kafka({
  clientId: 'user-service',
  brokers: ['localhost:9092']
});
const consumer = kafka.consumer({ groupId: 'user-group' });

async function startKafkaConsumer() {
  await consumer.connect();
  console.log(' Consommateur Kafka connecté');
  
  await consumer.subscribe({ topic: 'hotel-bookings-topic', fromBeginning: true });

  await consumer.run({
    eachMessage: async ({ message }) => {
      const eventData = JSON.parse(message.value.toString());

      if (eventData.event === 'BOOKING_CREATED') {
        const userId = eventData.userId;
        
        // On ajoute 10 points de fidélité à l'utilisateur dans la base SQLite
        db.run(`UPDATE users SET loyaltyPoints = loyaltyPoints + 10 WHERE id = ?`, [userId], function(err) {
          if (!err && this.changes > 0) {
            console.log(`\n [KAFKA] Réservation détectée pour ${userId} ! +10 points de fidélité ajoutés.`);
            db.get(`SELECT loyaltyPoints FROM users WHERE id = ?`, [userId], (err, row) => {
              if (row) console.log(`   Nouveau solde de points pour ${userId} : ${row.loyaltyPoints}`);
            });
          }
        });
      }
    },
  });
}

// 5. Démarrage global (Kafka + gRPC)
async function startService() {
  // 1. Démarrer le consommateur Kafka
  await startKafkaConsumer().catch(console.error);

  // 2. Démarrer le serveur gRPC
  const server = new grpc.Server();
  server.addService(userProto.UserService.service, userService);
  server.bindAsync('0.0.0.0:50053', grpc.ServerCredentials.createInsecure(), () => {
    console.log(' MS-Users (SQLite3 + Kafka) démarré sur le port 50053');
  });
}

startService();