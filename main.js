const fork = require('child_process').fork;
const path = require('path');

const options = {
    stdio: [ 'pipe', 'pipe', 'pipe', 'ipc' ]
};

const args = [];

async function runFile(file) {
    return new Promise((resolve, reject) => {
        const command = fork(path.resolve(file), args, options);

        command.stdout.on('data', function (data) {
            process.stdout.write(data);
        });

        command.stderr.on('data', function (data) {
            process.stdout.write(data);
        });

        command.on('message', data => {
            args.push('-r');
            args.push(`./data/${data.location_id}`);
        });

        command.on('exit', (code) => {
            if(code == 0) {
                resolve();
            }else{
                reject(`process exited with code ${code}`);
            }
        });
    });
}

console.time('crawl');
runFile('crawl.js')
    .then(() => runFile('images.js'))
    .then(() => runFile('vision.js'))
    .then(() => runFile('database.js'))
    .then(() => console.timeEnd('crawl'));
