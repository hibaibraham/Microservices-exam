const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

// ==========================================
// 1. INITIALISATION DES CLIENTS gRPC
// ==========================================

// Client pour MS-Users (Port 50051)
const userProtoPath = path.join(__dirname, '../protos/user.proto');
const userProtoDef = protoLoader.loadSync(userProtoPath, {});
const userProto = grpc.loadPackageDefinition(userProtoDef).user;
const userClient = new userProto.UserService('localhost:50051', grpc.credentials.createInsecure());

// Client pour MS-Bookings (Port 50052)
const bookingProtoPath = path.join(__dirname, '../protos/booking.proto');
const bookingProtoDef = protoLoader.loadSync(bookingProtoPath, { keepCase: true });
const bookingProto = grpc.loadPackageDefinition(bookingProtoDef).booking;
const bookingClient = new bookingProto.BookingService('localhost:50052', grpc.credentials.createInsecure());

// Client pour MS-Rooms (Port 50053)
const roomProtoPath = path.join(__dirname, '../protos/room.proto');
const roomProtoDef = protoLoader.loadSync(roomProtoPath, { keepCase: true });
const roomProto = grpc.loadPackageDefinition(roomProtoDef).room;
const roomClient = new roomProto.RoomService('localhost:50053', grpc.credentials.createInsecure());


// ==========================================
// 2. SCHÉMA GRAPHQL (Définition des types)
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
  }

  type Mutation {
    createBooking(userId: String!, roomId: String!, date: String!): BookingResponse
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
    room: (_, { id }) => {
      return new Promise((resolve, reject) => {
        roomClient.getRoom({ id }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
    },
    allRooms: () => {
      return new Promise((resolve, reject) => {
        roomClient.listRooms({}, (err, response) => {
          if (err) reject(err);
          else resolve(response.rooms);
        });
      });
    }
  },
  Mutation: {
    // Appel gRPC vers MS-Bookings pour créer une réservation
    createBooking: (_, { userId, roomId, date }) => {
      return new Promise((resolve, reject) => {
        bookingClient.createBooking({ userId, roomId, date }, (err, response) => {
          if (err) {
            reject(err);
          } else {
            // Traduction de la réponse gRPC pour GraphQL
            resolve({
              success: true,
              message: "Réservation créée avec succès !",
              bookingId: response.id || response.bookingId || "Inconnu"
            });
          }
        });
      });
    }
  }
};

// ==========================================
// 4. LANCEMENT DU SERVEUR (REST & GRAPHQL)
// ==========================================
async function startServer() {
  const app = express();

  // 1. Initialiser GraphQL d'abord (Résout l'erreur "stream is not readable")
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  // 2. Ensuite, activer la lecture du JSON pour les routes REST
  app.use(express.json());

  // ------------------------------------------------
  // ROUTES REST (Conforme à l'architecture demandée)
  // ------------------------------------------------
  
  // GET : Lister les chambres
  app.get('/rooms', (req, res) => {
    roomClient.listRooms({}, (err, response) => {
      if (err) res.status(500).send(err);
      else res.json(response.rooms);
    });
  });

  // POST : Créer une réservation via REST
  app.post('/bookings', (req, res) => {
    const { userId, roomId, date } = req.body;
    bookingClient.createBooking({ userId, roomId, date }, (err, response) => {
      if (err) res.status(500).send(err);
      else res.json(response);
    });
  });

  app.listen(3000, () => {
    console.log('🚀 API Gateway prête !');
    console.log('➡️  GraphQL: http://localhost:3000/graphql');
    console.log('➡️  REST:    http://localhost:3000/rooms (GET) | http://localhost:3000/bookings (POST)');
  });
}

startServer();