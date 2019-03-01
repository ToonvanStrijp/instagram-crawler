const fork = require('child_process').fork;
const path = require('path');
const listr = require('listr');
const {Observable} = require('rxjs');


const options = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
};

const args = [];

async function runFile(file, cb) {
    return new Promise((resolve, reject) => {
        const command = fork(path.resolve(file), args, options);

        command.stdout.on('data', function (data) {
            // process.stdout.write(data);
        });

        command.stderr.on('data', function (data) {
            // process.stdout.write(data);
        });

        command.on('message', data => {
            if(data.hasOwnProperty('progress')) {
                cb(data.progress)
            }else {
                args.push('-r');
                args.push(`./data/${data.location_id}`);
            }
        });

        command.on('exit', (code) => {
            if(code == 0) {
                resolve();
            }else{
                reject({message: `process exited with code ${code}`});
            }
        });
    });
}

const tasks = new listr([
    {
        title: 'crawling',
        task: () => new Observable(observer => {
            runFile('crawl.js', data => observer.next(data)).then(() => {
                observer.complete();
            }).catch(err => {
                observer.error(err);
                observer.complete();
            })
        })
    },
    {
        title: 'Downloading images...',
        task: () => new Observable(observer => {
            runFile('images.js', data => observer.next(data)).then(() => {
                observer.complete();
            }).catch(err => {
                observer.error(err);
                observer.complete();
            })
        })
    },
    {
        title: 'Applying Google Vision API',
        task: () => new Observable(observer => {
            runFile('vision.js', data => observer.next(data)).then(() => {
                observer.complete();
            }).catch(err => {
                observer.error(err);
                observer.complete();
            })
        })
    },
    {
        title: 'Export to database',
        task: () => new Observable(observer => {
            runFile('database.js', data => observer.next(data)).then(() => {
                observer.complete();
            }).catch(err => {
                observer.error(err);
                observer.complete();
            })
        })
    }
]);
const hrstart = process.hrtime();
tasks.run().then(() => {
    const hrend = process.hrtime(hrstart);
    console.log('Execution time: %ds %dms', hrend[0], hrend[1] / 1000000);
    console.log('done');
}).catch(err => {
    throw err;
});
