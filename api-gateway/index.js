const express = require('express');
const bodyParser = require('body-parser');
const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');

const app = express();
app.use(bodyParser.json());

// Charger le contrat gRPC
const PROTO_PATH = path.join(__dirname, '../protos/user.proto');
const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// Créer le client gRPC pour MS-Users
const userClient = new userProto.UserService(
  'localhost:50051', 
  grpc.credentials.createInsecure()
);

// --- ENDPOINT REST (Exemple: Récupérer un utilisateur) ---
app.get('/users/:id', (req, res) => {
  const userId = req.params.id;
  
  // Appel gRPC au microservice
  userClient.getUser({ id: userId }, (err, response) => {
    if (err) {
      res.status(404).send({ error: "Utilisateur non trouvé" });
    } else {
      res.json(response);
    }
  });
});

app.listen(3000, () => {
  console.log('API Gateway (REST) tournant sur le port 3000');
});