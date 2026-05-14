const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const { Kafka } = require('kafkajs');
const path = require('path');

// 1. CONFIGURATION DE LA BASE DE DONNÉES (SQLite3)
const db = new sqlite3.Database('./bookings.db', (err) => {
  if (err) console.error('Erreur SQLite:', err.message);
  else console.log(' Connecté à la base de données SQLite (bookings.db)');
});

// Création de la table mise à jour avec Date d'arrivée et Date de départ
db.run(`CREATE TABLE IF NOT EXISTS bookings (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  userId TEXT,
  roomId TEXT,
  startDate TEXT,
  endDate TEXT
)`);

// 2. CONFIGURATION DE KAFKA
const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: ['localhost:9092']
});
const producer = kafka.producer();

// 3. CONFIGURATION DE gRPC
const PROTO_PATH = path.join(__dirname, '../protos/booking.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {
  keepCase: true, longs: String, enums: String, defaults: true, oneofs: true,
});
const bookingProto = grpc.loadPackageDefinition(packageDefinition).booking;


// 4. LOGIQUE DU SERVICE (Créer une réservation)
const createBooking = async (call, callback) => {
  const { userId, roomId, startDate, endDate } = call.request;

  // 1️ÉTAPE DE VÉRIFICATION : Est-ce que cette chambre est déjà réservée dans SQLite ?
  const checkSql = `SELECT * FROM bookings WHERE roomId = ?`;
  
  db.get(checkSql, [roomId], async (err, row) => {
    if (err) {
      console.error('Erreur de vérification DB:', err);
      return callback({ code: grpc.status.INTERNAL, message: 'Erreur interne de la base' });
    }

    // Si on trouve une ligne, ça veut dire que la chambre est DÉJÀ réservée 
    if (row) {
      console.log(`[DB]  Refusé : La chambre ${roomId} est déjà occupée.`);
      
      // On renvoie un statut "FAILED" ou on déclenche une erreur gRPC
      return callback(null, { 
        id: "0",
        status: 'FAILED' // le HTML va capter ça et afficher le bandeau ROUGE !
      });
    }

    // 2️) SI LA CHAMBRE EST LIBRE : On fait l'insertion normale
    const insertSql = `INSERT INTO bookings (userId, roomId, startDate, endDate) VALUES (?, ?, ?, ?)`;
    db.run(insertSql, [userId, roomId, startDate, endDate], async function (err) {
      if (err) {
        console.error('Erreur insertion DB:', err);
        return callback({ code: grpc.status.INTERNAL, message: 'Erreur DB' });
      }

      const bookingId = this.lastID;
      console.log(`[DB] 💾 Réservation ${bookingId} sauvegardée dans SQLite (Du ${startDate} au ${endDate})`);

      // Action 2 : Diffuser l'événement dans Kafka
      try {
        await producer.send({
          topic: 'hotel-bookings-topic',
          messages: [
            { 
              value: JSON.stringify({ 
                event: 'BOOKING_CREATED',
                bookingId: bookingId,
                userId: userId, 
                roomId: roomId, 
                startDate: startDate,
                endDate: endDate,
                timestamp: new Date().toISOString()
              }) 
            },
          ],
        });
        console.log(`[Kafka]  Événement envoyé pour la réservation ${bookingId}`);

        // Réponse positive
        callback(null, { 
          id: bookingId.toString(),
          status: 'CONFIRMED'
        });

      } catch (error) {
        console.error('Erreur Kafka:', error);
        callback({ code: grpc.status.INTERNAL, message: 'Erreur Kafka' });
      }
    });
  });
};
// 5. DÉMARRAGE DU SERVEUR gRPC
async function startServer() {
  try {
    // On connecte Kafka d'abord
    await producer.connect();
    console.log(' Connecté à Kafka avec succès');

    // On lance le serveur gRPC
    const server = new grpc.Server();
    server.addService(bookingProto.BookingService.service, { CreateBooking: createBooking });
    
    server.bindAsync('127.0.0.1:50052', grpc.ServerCredentials.createInsecure(), (err, port) => {
      if (err) {
        console.error('Erreur de liaison gRPC:', err);
        return;
      }
      console.log(` Microservice Bookings (gRPC) démarré sur le port ${port}`);
    });

  } catch (error) {
    console.error('Erreur de démarrage:', error);
  }
}

startServer();