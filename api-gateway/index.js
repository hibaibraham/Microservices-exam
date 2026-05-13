const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();

// --- CONFIGURATION gRPC ---

// Client pour MS-Users (Port 50051)
const userProtoPath = path.join(__dirname, '../protos/user.proto');
const userPackageDef = protoLoader.loadSync(userProtoPath, {});
const userProto = grpc.loadPackageDefinition(userPackageDef).user;
const userClient = new userProto.UserService('localhost:50051', grpc.credentials.createInsecure());

// Client pour MS-Rooms (Port 50052) - NOUVEAU
const roomProtoPath = path.join(__dirname, '../protos/room.proto');
const roomPackageDef = protoLoader.loadSync(roomProtoPath, {});
const roomProto = grpc.loadPackageDefinition(roomPackageDef).room;
const roomClient = new roomProto.RoomService('localhost:50052', grpc.credentials.createInsecure());

// --- CONFIGURATION GRAPHQL ---

const typeDefs = gql`
  type User {
    id: String
    name: String
    email: String
  }

  type Room {
    id: String
    title: String
    description: String
    price_per_night: Float
  }

  type Query {
    user(id: String!): User
    room(id: String!): Room
    allRooms: [Room]
  }
`;

const resolvers = {
  Query: {
    // Resolver pour les utilisateurs
    user: (_, { id }) => {
      return new Promise((resolve, reject) => {
        userClient.getUser({ id }, (err, response) => {
          if (err) reject(err); else resolve(response);
        });
      });
    },
    // Resolvers pour les chambres - NOUVEAU
    room: (_, { id }) => {
      return new Promise((resolve, reject) => {
        roomClient.getRoom({ id }, (err, response) => {
          if (err) reject(err); else resolve(response);
        });
      });
    },
    allRooms: () => {
      return new Promise((resolve, reject) => {
        roomClient.listRooms({}, (err, response) => {
          if (err) reject(err); else resolve(response.rooms);
        });
      });
    }
  },
};

// --- DÉMARRAGE DU SERVEUR ---

async function startServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  // Endpoint REST pour tester les chambres (Optionnel mais recommandé pour le barème)
  app.get('/rooms', (req, res) => {
    roomClient.listRooms({}, (err, response) => {
      if (err) res.status(500).send(err);
      else res.json(response.rooms);
    });
  });

  app.listen(3000, () => {
    console.log('Gateway : http://localhost:3000 | GraphQL : http://localhost:3000/graphql');
  });
}

startServer();