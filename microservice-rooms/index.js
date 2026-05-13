const grpc = require('@grpc/grpc-js');
const protoLoader = require('@grpc/proto-loader');
const { createRxDatabase, addRxPlugin } = require('rxdb');
const { getRxStoragePouch, addPouchPlugin } = require('rxdb/plugins/pouchdb');
const path = require('path');

addPouchPlugin(require('pouchdb-adapter-memory'));

async function start() {
    // 1. Initialisation RxDB (NoSQL conforme au cahier des charges)
    const db = await createRxDatabase({
        name: 'roomsdb',
        storage: getRxStoragePouch('memory')
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
                    price_per_night: { type: 'number' }
                },
                required: ['id', 'title', 'price_per_night']
            }
        }
    });

    // Insertion d'une chambre de test
    await db.rooms.insert({ id: '101', title: 'Suite Royale', description: 'Vue sur mer', price_per_night: 150.0 });

    // 2. Configuration gRPC
    const PROTO_PATH = path.join(__dirname, '../protos/room.proto');
    const packageDefinition = protoLoader.loadSync(PROTO_PATH, {});
    const roomProto = grpc.loadPackageDefinition(packageDefinition).room;

    const server = new grpc.Server();
    server.addService(roomProto.RoomService.service, {
        getRoom: async (call, callback) => {
            const room = await db.rooms.findOne(call.request.id).exec();
            if (room) callback(null, room.toJSON());
            else callback({ code: grpc.status.NOT_FOUND, details: "Chambre non trouvée" });
        },
        listRooms: async (call, callback) => {
            const allRooms = await db.rooms.find().exec();
            callback(null, { rooms: allRooms.map(r => r.toJSON()) });
        }
    });

    server.bindAsync('0.0.0.0:50052', grpc.ServerCredentials.createInsecure(), () => {
        console.log('MS-Rooms (RxDB) démarré sur le port 50052');
        server.start();
    });
}

start();