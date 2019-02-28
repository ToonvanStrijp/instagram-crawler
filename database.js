const MongoClient = require('mongodb').MongoClient;
const url = "mongodb://localhost:27017/";
const fs = require('fs');
const bluebird = require('bluebird');
let db = null;
const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

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
            resolve(db.db("genneper-parken"));
        });
    });
}

function dropCollection(dbo) {
    return new Promise((resolve, reject) => {
        dbo.collection("posts").drop(function(err, delOK) {
            if (err) reject(err);
            console.log("Collection dropped");
            resolve(dbo);
        });
    })
}

function createCollection(dbo) {
    return new Promise((resolve, reject) => {
        dbo.createCollection("posts", function(err, res) {
            if (err) reject(err);
            console.log("Collection created");
            resolve(dbo);
        });
    })
}

function importData(dbo) {
    const collection = dbo.collection('posts');
    return bluebird.all(data.map(post => {
        return new Promise(resolve => {
            if(fs.existsSync(`./vision/${post.id}.json`)) {
                post.vision = JSON.parse(fs.readFileSync(`./vision/${post.id}.json`, 'utf8'));
            }
            resolve(post);
        })
    })).then(posts => {
        return bluebird.all(posts.map(post => {
            return new Promise((resolve, reject) => {
                collection.insertOne(post, function(err, res) {
                    if (err) reject(err);
                    console.log(`post ${post.id} inserted`);
                    resolve();
                });
            });
        }));
    });
}

connectDatabase()
    .then(dbo => dropCollection(dbo))
    .then(dbo => createCollection(dbo))
    .then(dbo => importData(dbo))
    .then(() => {
        db.close();
        console.log('done');
        console.log(`${data.length} items saved`);
    });
