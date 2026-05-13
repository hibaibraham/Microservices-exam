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

// Client pour MS-Rooms (Port 50052)
const roomProtoPath = path.join(__dirname, '../protos/room.proto');
const roomProtoDef = protoLoader.loadSync(roomProtoPath, { keepCase: true });
const roomProto = grpc.loadPackageDefinition(roomProtoDef).room;
const roomClient = new roomProto.RoomService('localhost:50052', grpc.credentials.createInsecure());


// ==========================================
// 2. SCHÉMA GRAPHQL (Définition des types)
// ==========================================
const typeDefs = gql`
  type User {
    id: String!
    name: String!
    email: String!
  }

  type Room {
    id: String!
    title: String!
    description: String!
    price_per_night: Float!
  }

  type Query {
    user(id: String!): User
    room(id: String!): Room
    allRooms: [Room]
  }
`;


// ==========================================
// 3. RÉSOLVEURS GRAPHQL (Comment récupérer la donnée)
// ==========================================
const resolvers = {
  Query: {
    // Appel gRPC vers MS-Users
    user: (_, { id }) => {
      return new Promise((resolve, reject) => {
        userClient.getUser({ id }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
    },
    // Appel gRPC vers MS-Rooms (Récupérer une chambre)
    room: (_, { id }) => {
      return new Promise((resolve, reject) => {
        roomClient.getRoom({ id }, (err, response) => {
          if (err) reject(err);
          else resolve(response);
        });
      });
    },
    // Appel gRPC vers MS-Rooms (Lister toutes les chambres)
    allRooms: () => {
      return new Promise((resolve, reject) => {
        roomClient.listRooms({}, (err, response) => {
          if (err) reject(err);
          else resolve(response.rooms);
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
  const server = new ApolloServer({ typeDefs, resolvers });
  
  await server.start();
  server.applyMiddleware({ app });

  // Route REST de test (Optionnel)
  app.get('/rooms', (req, res) => {
    roomClient.listRooms({}, (err, response) => {
      if (err) res.status(500).send(err);
      else res.json(response.rooms);
    });
  });

  app.listen(3000, () => {
    console.log('🚀 API Gateway prête sur http://localhost:3000/graphql');
  });
}

startServer();