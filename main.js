const spawn = require('child_process').spawn;

async function runFile(file) {
    return new Promise((resolve, reject) => {
        const command = spawn('node', [file]);

        command.stdout.on('data', function (data) {
            process.stdout.write(data);
        });

        command.stderr.on('data', function (data) {
            process.stdout.write(data);
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
