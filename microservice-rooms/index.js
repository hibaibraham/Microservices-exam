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

        // 2. Configuration du Consommateur KAFKA
        const kafka = new Kafka({
            clientId: 'room-service',
            brokers: ['localhost:9092']
        });
        const consumer = kafka.consumer({ groupId: 'room-group' });

        await consumer.connect();
        console.log(' MS-Rooms : Consommateur Kafka connecté');
        
        await consumer.subscribe({ topic: 'hotel-bookings-topic', fromBeginning: true });

        await consumer.run({
            eachMessage: async ({ message }) => {
                const eventData = JSON.parse(message.value.toString());
                
                if (eventData.event === 'BOOKING_CREATED') {
                    const roomId = eventData.roomId || eventData.room_id; 
                    
                    const room = await db.rooms.findOne(roomId).exec();
                    if (room && room.is_available) {
                        await room.incrementalPatch({ is_available: false });
                        console.log(`\n [KAFKA] Réservation confirmée pour la chambre ${roomId} !`);
                        console.log(`   -> Mise à jour RxDB : La chambre n'est plus disponible (is_available: false).`);
                    }
                }
            }
        });

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