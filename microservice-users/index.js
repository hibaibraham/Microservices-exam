const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const sqlite3 = require('sqlite3').verbose();
const path = require('path'); // Ajoute cette ligne

// Utilise path.join pour un chemin absolu sécurisé
const PROTO_PATH = path.join(__dirname, '../protos/user.proto');

const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
const userProto = grpc.loadPackageDefinition(packageDefinition).user;

// 2. Initialiser la DB SQLite3 (Conformément au cahier des charges)
const db = new sqlite3.Database(':memory:'); // Utilisation en mémoire pour simplifier le test
db.serialize(() => {
  db.run("CREATE TABLE users (id TEXT, name TEXT, email TEXT)");
  db.run("INSERT INTO users VALUES ('1', 'Hiba Ibrahim', 'hiba@example.com')");
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
  createUser: (call, callback) => {
    const { name, email } = call.request;
    const id = Math.random().toString(36).substr(2, 9);
    db.run("INSERT INTO users VALUES (?, ?, ?)", [id, name, email], (err) => {
      if (err) callback(err);
      else callback(null, { id, name, email });
    });
  }
};

// 4. Démarrage du serveur gRPC
const server = new grpc.Server();
server.addService(userProto.UserService.service, userService);
server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), () => {
  console.log('MS-Users (SQLite3) démarré sur le port 50051');
  server.start();
});