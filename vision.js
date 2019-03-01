const vision = require('@google-cloud/vision');
const fs = require('fs');
const lodash = require('lodash');
const bluebird = require('bluebird');
const batchPromises = require('batch-promises');

const program = require('commander');

program
    .option('-r, --root [path]', 'root dir')
    .parse(process.argv);


const data = JSON.parse(fs.readFileSync(program.root+'/data.json', 'utf8')).filter(post => {
    return fs.existsSync(program.root+`/images/${post.id}.jpg`);
});


const visionDir = program.root+'/vision';

if (!fs.existsSync(visionDir)){
    fs.mkdirSync(visionDir, {recursive: true});
}

function round(num) {
    return Math.round(num * 100) / 100;
}

const client = new vision.ImageAnnotatorClient({
    keyFilename: 'key_ds41C-16ec549b66f1.json',
    projectId: 'ds41c-232407'
});

const features = [
    {type: 'LABEL_DETECTION'},
    {type: 'WEB_DETECTION'},
    {type: 'IMAGE_PROPERTIES'},
    {type: 'SAFE_SEARCH_DETECTION'},
    {type: 'OBJECT_LOCALIZATION'},
    {type: 'DOCUMENT_TEXT_DETECTION'},
    {type: 'TEXT_DETECTION'},
    {type: 'LANDMARK_DETECTION'},
    {type: 'CROP_HINTS'},
    {type: 'LOGO_DETECTION'},
    {type: 'FACE_DETECTION'},
];


let count = 0;
const total = data.length;
const steps = 10;

function processPosts(posts) {
    return new Promise((resolve, reject) => {
        const requests = posts
            .map(post => {
                return {
                    id: post.id,
                    image: {content: Buffer.from(fs.readFileSync(program.root+`/images/${post.id}.jpg`)).toString('base64') },
                    features: features
                }
            });

        client
            .batchAnnotateImages({requests: requests})
            .then(response => {
                count += count + steps > total ? total - count : steps;
                const results = response[0].responses.map((value, index) => {
                    return {
                        id: requests[index].id,
                        data: value
                    }
                });

                bluebird.all(results.map(result => {
                    return new Promise((res, rej) => {
                        const json = JSON.stringify(result.data);
                        fs.writeFile(visionDir+`/${result.id}.json`, json, 'utf8', (err) => {
                            if(err) rej(`failed to save: ${result.id}`);
                            console.log(result.id+' saved');
                            res();
                        });
                    });
                })).then(() => {
                    console.log(`progress (${count}/${total} - ${round((100/total)*count)}%)`);

                    if(process.send){
                        process.send({progress: `${round((100/total)*count)}%`})
                    }

                    resolve();
                }).catch(err => {
                    console.log(err);
                    console.log('retrying...');
                    processPosts(posts).then(resolve).catch(reject);
                })
            })
            .catch(err => {
                console.error(err);
                console.log('retrying...');
                processPosts(posts).then(resolve).catch(reject);
            });
    });
}
batchPromises(20, lodash.chunk(data, steps), posts => processPosts(posts)).then(results => {
    console.log('done');
});
