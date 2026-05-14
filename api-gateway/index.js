const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const cors = require('cors');

// ==========================================
// 1. INITIALISATION DES CLIENTS gRPC
// ==========================================

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

// ==========================================
// 2. SCHÉMA GRAPHQL
// ==========================================
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
    users: [User]  # 🟢 NOUVEAU : On dit à Apollo que la liste des utilisateurs existe
  }

  type Mutation {
    createBooking(userId: String!, roomId: String!, startDate: String!, endDate: String!): BookingResponse
  }
`;

// ==========================================
// 3. RÉSOLVEURS GRAPHQL
// ==========================================
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
    
    // 🟢 NOUVEAU : On apprend à Apollo comment aller chercher tous les utilisateurs via gRPC
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

// ==========================================
// 4. LANCEMENT DU SERVEUR
// ==========================================
async function startServer() {
  const app = express();
  
  app.use(cors());

  // 1. D'ABORD APOLLO
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  // 2. ENSUITE EXPRESS JSON
  app.use(express.json());

  // ROUTE REST POUR TON FORMULAIRE HTML
  app.post('/bookings', (req, res) => {
    const { userId, roomId, startDate, endDate } = req.body;

    if (!roomId) return res.status(400).json({ success: false, message: "ID de chambre manquant." });

    roomClient.getRoom({ id: roomId }, (err, room) => {
      if (err || !room) return res.status(404).json({ success: false, status: 'INVALID_ID', message: "ID invalide : Cette chambre n'existe pas." });
      if (room.is_available === false) return res.status(400).json({ success: false, status: 'ALREADY_BOOKED', message: "Déjà réservée : Cette chambre n'est plus disponible." });

      bookingClient.createBooking({ userId, roomId, startDate, endDate }, (err, response) => {
        if (err) return res.status(500).json({ success: false, message: "Erreur interne." });
        res.status(200).json({ success: true, id: response.id, status: response.status, message: "Réservation confirmée avec succès." });
      });
    });
  });

  app.get('/rooms', (req, res) => {
    roomClient.listRooms({}, (err, response) => {
      if (err) res.status(500).send(err);
      else res.json(response.rooms || []);
    });
  });

  // 🟢 NOUVEAU : Route REST pour ajouter facilement un utilisateur depuis Postman si besoin
  app.post('/users', (req, res) => {
    const { name, email } = req.body;
    userClient.CreateUser({ name, email }, (err, response) => {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json(response);
    });
  });

  app.listen(3000, () => {
    console.log('🚀 API Gateway en ligne (Apollo + REST) !');
  });
}

startServer();