const { MongoClient } = require('mongodb');

const confirmation = process.env.RESET_CARS_CONFIRM;
if (confirmation !== 'DELETE_ALL_ADVERTISEMENTS') {
  throw new Error('Set RESET_CARS_CONFIRM=DELETE_ALL_ADVERTISEMENTS to confirm the production reset');
}

if (!process.env.MONGODB_URI) {
  throw new Error('MONGODB_URI is required');
}

async function main() {
  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();

  try {
    const database = client.db(process.env.MONGODB_DB || 'carsale');
    const cars = database.collection('cars');
    const imageFiles = database.collection('images.files');
    const imageChunks = database.collection('images.chunks');
    const before = {
      cars: await cars.countDocuments(),
      imageFiles: await imageFiles.countDocuments(),
      imageChunks: await imageChunks.countDocuments(),
    };

    const carDeletion = await cars.deleteMany({});
    const chunkDeletion = await imageChunks.deleteMany({});
    const fileDeletion = await imageFiles.deleteMany({});

    console.log(JSON.stringify({
      database: database.databaseName,
      before,
      deleted: {
        cars: carDeletion.deletedCount,
        imageFiles: fileDeletion.deletedCount,
        imageChunks: chunkDeletion.deletedCount,
      },
    }, null, 2));
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
