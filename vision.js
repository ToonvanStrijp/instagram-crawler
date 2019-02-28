const vision = require('@google-cloud/vision');
const fs = require('fs');
const lodash = require('lodash');

const batchPromises = require('batch-promises');

const data = JSON.parse(fs.readFileSync('data.json', 'utf8'));

const client = new vision.ImageAnnotatorClient({
    keyFilename: 'key_ds41C-16ec549b66f1.json',
    projectId: 'ds41c-232407'
});

console.log(vision.types.Feature.Type.LABEL_DETECTION);

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



// batchPromises(20, data, (post, i) => new Promise((resolve, reject) => {
//     console.log(post, i);
//     resolve();
// })).then(results => {
//     console.log('done');
// });

// client
//     .batchAnnotateImages({
//         image: {source: { filename: './images/341200254171520867.jpg' }},
//         features: features
//     })
//     .then(results => {
//         const labels = results[0].labelAnnotations;

        // console.log(labels);
        // console.log('Labels:');
        // labels.forEach(label => console.log(label.description));
        //
        // console.log(results[0]);
    // })
    // .catch(err => {
    //     console.error('ERROR:', err);
    // });
