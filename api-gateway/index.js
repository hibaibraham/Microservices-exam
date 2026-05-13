const express = require('express');
const { ApolloServer, gql } = require('apollo-server-express');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();

// --- Configuration gRPC ---
const PROTO_PATH = path.join(__dirname, '../protos/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;
const userClient = new userProto.UserService('localhost:50051', grpc.credentials.createInsecure());

// --- Configuration GraphQL ---
const typeDefs = gql`
  type User {
    id: String
    name: String
    email: String
  }

  type Query {
    user(id: String!): User
  }
`;

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
  },
};

// --- Démarrage Serveur Apollo ---
async function startServer() {
  const server = new ApolloServer({ typeDefs, resolvers });
  await server.start();
  server.applyMiddleware({ app });

  // --- Endpoint REST (toujours présent) ---
  app.get('/users/:id', (req, res) => {
    userClient.getUser({ id: req.params.id }, (err, response) => {
      if (err) res.status(404).send({ error: "Utilisateur non trouvé" });
      else res.json(response);
    });
  });

  app.listen(3000, () => {
    console.log('Gateway prête : REST sur http://localhost:3000 et GraphQL sur http://localhost:3000/graphql');
  });
}

startServer();