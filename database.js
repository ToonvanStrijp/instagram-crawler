const MongoClient = require('mongodb').MongoClient;
const {ObjectId} = require('mongodb'); // or ObjectID

const url = "mongodb://localhost:27017/";
const fs = require('fs');
const bluebird = require('bluebird');
const program = require('commander');

program
    .option('-r, --root [path]', 'root dir')
    .parse(process.argv);

const data = JSON.parse(fs.readFileSync(program.root+'/data.json', 'utf8'));

let db = null;

bluebird.all(data.map(post => {
    return new Promise((resolve, reject) => {

    });
}));

function connectDatabase() {
    return new Promise((resolve, reject) => {
        MongoClient.connect(url, function(err, connection) {
            if (err) reject(err);
            console.log("Connected");
            db = connection;
            resolve(db.db("instacrawler"));
        });
    });
}

function createCollections(dbo, collection) {
    return new Promise((resolve, reject) => {
        dbo.createCollection(collection, function(err, res) {
            if (err) reject(err);
            console.log(`Collection ${collection} created`);
            resolve(dbo);
        });
    })
}

function importLocation(dbo) {
    return new Promise((resolve, reject) => {

        const location = JSON.parse(fs.readFileSync(program.root+'/location.json', 'utf8'));

        dbo.collection('locations').deleteOne({id: location.id}, function(err, obj) {
            if (err) reject(err);
            dbo.collection('locations').insertOne(location, function(err, res) {
                if (err) reject(err);
                console.log(`location ${location.id} inserted`);
                resolve({dbo: dbo, locationId: res.insertedId});
            });
        });
    });
}

function importData(dbo, locationId) {
    const collection = dbo.collection('posts');
    return bluebird.all(data.map(post => {
        return new Promise(resolve => {
            if(fs.existsSync(program.root+`/vision/${post.id}.json`)) {
                post.vision = JSON.parse(fs.readFileSync(program.root+`/vision/${post.id}.json`, 'utf8'));
            }

            if(locationId !== null || locationId !== undefined) {
                post.location = ObjectId(locationId);
            }

            resolve(post);
        })
    })).then(posts => {
        return bluebird.all(posts.map(post => {
            return new Promise((resolve, reject) => {
                collection.deleteOne({id: post.id}, function(err, obj) {
                    if (err) reject(err);
                    collection.insertOne(post, function(err, res) {
                        if (err) reject(err);
                        console.log(`post ${post.id} inserted`);
                        resolve();
                    });
                });
            });
        }));
    });
}

connectDatabase()
    .then(dbo => createCollections(dbo, 'locations'))
    .then(dbo => createCollections(dbo, 'posts'))
    .then(dbo => importLocation(dbo))
    .then((res) => importData(res.dbo, res.locationId))
    .then(() => {
        db.close();
        console.log('done');
        console.log(`${data.length} items saved`);
    });
