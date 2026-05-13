const express = require('express');
const { Kafka } = require('kafkajs');

const app = express();
app.use(express.json());

// 1. Configuration de la connexion à Kafka (notre conteneur Docker)
const kafka = new Kafka({
  clientId: 'booking-service',
  brokers: ['localhost:9092']
});

const producer = kafka.producer();

// 2. Création de la route pour réserver une chambre
app.post('/booking', async (req, res) => {
  const { userId, roomId, date } = req.body;

  try {
    // On envoie le message dans le "Topic" (le canal de diffusion) Kafka
    await producer.send({
      topic: 'hotel-bookings-topic',
      messages: [
        { 
          value: JSON.stringify({ 
            event: 'BOOKING_CREATED',
            userId, 
            roomId, 
            date,
            timestamp: new Date().toISOString()
          }) 
        },
      ],
    });

    console.log(`[Kafka] 📢 Événement envoyé : Réservation chambre ${roomId} par user ${userId}`);
    res.status(201).json({ message: 'Réservation confirmée et diffusée sur Kafka !' });
    
  } catch (error) {
    console.error('Erreur Kafka:', error);
    res.status(500).json({ error: 'Erreur lors de la réservation' });
  }
});

// 3. Démarrage du serveur et connexion à Kafka
async function startServer() {
  try {
    await producer.connect();
    console.log('✅ Connecté à Kafka avec succès');

    app.listen(3001, () => {
      console.log('🚀 Microservice Bookings démarré sur http://localhost:3001');
    });
  } catch (error) {
    console.error('Erreur de démarrage:', error);
  }
}

startServer();