const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const cors = require('cors');

// 1. INITIALISATION DES CLIENTS gRPC

const userProtoPath = path.join(__dirname, '../protos/user.proto');
const userProtoDef = protoLoader.loadSync(userProtoPath, {});
const userProto = grpc.loadPackageDefinition(userProtoDef).user;
const userClient = new userProto.UserService('localhost:50053', grpc.credentials.createInsecure()); // Vérifie bien que ton microservice user est sur le port 50053 (ou 50051 selon ta config)

const bookingProtoPath = path.join(__dirname, '../protos/booking.proto');
const bookingProtoDef = protoLoader.loadSync(bookingProtoPath, { keepCase: true });
const bookingProto = grpc.loadPackageDefinition(bookingProtoDef).booking;
const bookingClient = new bookingProto.BookingService('localhost:50052', grpc.credentials.createInsecure());

const roomProtoPath = path.join(__dirname, '../protos/room.proto');
const roomProtoDef = protoLoader.loadSync(roomProtoPath, { keepCase: true });
const roomProto = grpc.loadPackageDefinition(roomProtoDef).room;
const roomClient = new roomProto.RoomService('localhost:50051', grpc.credentials.createInsecure()); // Port ajusté

// 2. SCHÉMA GRAPHQL
const typeDefs = gql`
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
    createBooking(userId: String!, roomId: String!, startDate: String!, endDate: String!): BookingResponse
  }
`;

// 3. RÉSOLVEURS GRAPHQL

const resolvers = {
  Query: {
    user: (_, { id }) => {
      return new Promise((resolve, reject) => {
        userClient.getUser({ id }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
    },
    
    users: () => {
      return new Promise((resolve, reject) => {
        userClient.listUsers({}, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve(response.users || []);
          }
        });
      });
    },

    room: (_, { id }) => {
      return new Promise((resolve, reject) => {
        roomClient.getRoom({ id }, (err, response) => {
          if (err) reject(err);
          else {
            const rawAvailable = response.is_available !== undefined ? response.is_available : response.isAvailable;
            resolve({
              id: response.id,
              title: response.title,
              description: response.description,
              price_per_night: response.price_per_night || response.pricePerNight || 0,
              isAvailable: rawAvailable !== undefined ? rawAvailable : false
            });
          }
        });
      });
    },
    allRooms: () => {
      return new Promise((resolve, reject) => {
        roomClient.listRooms({}, (err, response) => {
          if (err) reject(err);
          else {
            const rooms = response.rooms || [];
            const mappedRooms = rooms.map(r => {
              const rawAvailable = r.is_available !== undefined ? r.is_available : r.isAvailable;
              return {
                id: r.id,
                title: r.title,
                description: r.description,
                price_per_night: r.price_per_night || r.pricePerNight || 0,
                isAvailable: rawAvailable !== undefined ? rawAvailable : false
              };
            });
            resolve(mappedRooms);
          }
        });
      });
    }
  },
  Mutation: {
    createBooking: (_, { userId, roomId, startDate, endDate }) => {
      return new Promise((resolve, reject) => {
        
        const grpcRequest = {
         userId: userId,
         roomId: roomId,
         start_date: startDate,
         end_date: endDate
        };

        bookingClient.createBooking(grpcRequest, (err, response) => {
          if (err) {
            reject(err);
          } else {
            resolve({
              success: response.status === 'CONFIRMED',
              message: response.status === 'CONFIRMED' ? 'Réservation confirmée avec succès.' : 'Erreur lors de la réservation.',
              bookingId: response.id
            });
          }
        });
      });
    }
  }
};

// 4. LANCEMENT DU SERVEUR
async function startServer() {
  const app = express();
  
  app.use(cors());
  
  // IMPORTANT : express.json() SEULEMENT pour les routes REST (pas /graphql)
  app.use((req, res, next) => {
    if (req.path === '/graphql') {
      return next();
    }
    express.json()(req, res, next);
  });

  // ROUTES REST AVANT APOLLO (pour éviter les conflits de middleware)
  app.post('/bookings', (req, res) => {
    const { userId, roomId, startDate, endDate } = req.body;

    if (!roomId) return res.status(400).json({ success: false, message: "ID de chambre manquant." });

    roomClient.getRoom({ id: roomId }, (err, room) => {
      if (err || !room) return res.status(404).json({ success: false, status: 'INVALID_ID', message: "ID invalide : Cette chambre n'existe pas." });
      if (room.is_available === false) return res.status(400).json({ success: false, status: 'ALREADY_BOOKED', message: "Déjà réservée : Cette chambre n'est plus disponible." });

      bookingClient.createBooking({ 
        userId, 
        roomId, 
        start_date: startDate, 
        end_date: endDate 
      }, (err, response) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur interne." });
        
        // Vérifier le statut de la réponse
        if (response.status === 'FAILED') {
          return res.status(400).json({ 
            success: false, 
            id: response.id, 
            status: response.status, 
            message: "Cette chambre est déjà réservée pour cette période." 
          });
        }
        
        // Réservation confirmée
        res.status(200).json({ 
          success: true, 
          id: response.id, 
          status: response.status, 
          message: "Réservation confirmée avec succès." 
        });
      });
    });
  });

  app.get('/rooms', (req, res) => {
    roomClient.listRooms({}, (err, response) => {
      if (err) res.status(500).send(err);
      else res.json({ rooms: response.rooms || [] });
    });
  });

  // Endpoint pour vérifier la disponibilité d'une chambre pour des dates spécifiques
  app.post('/check-availability', (req, res) => {
    const { roomId, startDate, endDate } = req.body;

    if (!roomId || !startDate || !endDate) {
      return res.status(400).json({ available: false, message: 'Paramètres manquants' });
    }

    // Appeler MS-Bookings via gRPC pour vérifier la disponibilité
    bookingClient.checkAvailability({ 
      roomId, 
      start_date: startDate, 
      end_date: endDate 
    }, (err, response) => {
      if (err) {
        console.error('Erreur vérification disponibilité:', err);
        return res.status(500).json({ available: false, message: 'Erreur serveur' });
      }
      
      res.json({ 
        available: response.available,
        message: response.message
      });
    });
  });

  app.get('/users/:id', (req, res) => {
    const { id } = req.params;
    userClient.getUser({ id }, (err, response) => {
      if (err) {
        console.error('Erreur récupération utilisateur:', err);
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
      res.json(response);
    });
  });

  app.post('/users', (req, res) => {
    const { name, email } = req.body;
    userClient.CreateUser({ name, email }, (err, response) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(response);
    });
  });

  // APOLLO SERVER APRÈS LES ROUTES REST
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  app.listen(3000, () => {
    console.log(' API Gateway en ligne (Apollo + REST) !');
  });
}

startServer();