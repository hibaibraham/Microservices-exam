const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const path = require('path');
const { Kafka } = require('kafkajs'); 

const { createRxDatabase } = require('rxdb');
const { getRxStorageMemory } = require('rxdb/plugins/storage-memory');

async function start() {
    try {
        
        // 1. Initialisation NoSQL RxDB
        const db = await createRxDatabase({
            name: 'roomsdb',
            storage: getRxStorageMemory() // Base NoSQL en mémoire
        });

        await db.addCollections({
            rooms: {
                schema: {
                    version: 0,
                    primaryKey: 'id',
                    type: 'object',
                    properties: {
                        id: { type: 'string', maxLength: 100 },
                        title: { type: 'string' },
                        description: { type: 'string' },
                        price_per_night: { type: 'number' },
                        is_available: { type: 'boolean' } 
                    },
                    required: ['id', 'title', 'price_per_night']
                }
            }
        });

        // Données de test initiales propres
        await db.rooms.insert({ 
            id: '201', 
            title: 'Suite Royale', 
            description: 'Vue sur mer', 
            price_per_night: 150.0,
            is_available: true 
        });

        await db.rooms.insert({
            id: "202",
            title: "Chambre Deluxe",
            description: "Lit King Size et Jacuzzi",
            price_per_night: 95.0,
            is_available: true 
        });

        console.log('🏁 [RXDB] Chambres 201 et 202 initialisées à disponible (true).');

        
        
        console.log(' MS-Rooms : Kafka désactivé - Les chambres restent toujours disponibles');
        console.log('   La disponibilité est vérifiée en temps réel via les réservations');

        // 3. Configuration gRPC
        const PROTO_PATH = path.join(__dirname, '../protos/room.proto');
        const packageDefinition = protoLoader.loadSync(PROTO_PATH, { keepCase: true });
        const roomProto = grpc.loadPackageDefinition(packageDefinition).room;

        const server = new grpc.Server();
        server.addService(roomProto.RoomService.service, {
            getRoom: async (call, callback) => {
                const room = await db.rooms.findOne(call.request.id).exec();
                if (room) {
                    callback(null, room.toJSON());
                } else {
                    callback({ code: grpc.status.NOT_FOUND, details: "Chambre non trouvée" });
                }
            },
            listRooms: async (call, callback) => {
                const allRooms = await db.rooms.find().exec();
                callback(null, { rooms: allRooms.map(r => r.toJSON()) });
            }
        });

        server.bindAsync('0.0.0.0:50051', grpc.ServerCredentials.createInsecure(), (err, port) => {
            if (err) throw err;
            console.log(` MS-Rooms (RxDB NoSQL + Kafka) démarré sur le port ${port}`);
        });

    } catch (err) {
        console.error("Erreur fatale :", err);
    }
}

start();