require('chromedriver');
const webdriver = require('selenium-webdriver');
const querystring = require('querystring');
const {By} = require('selenium-webdriver');
const fs = require('fs');
const rimraf = require('rimraf');
const lodash = require('lodash');
const chrome = require('selenium-webdriver/chrome');

const chomeDir = __dirname+"/chrome";
const o = new chrome.Options();
o.addArguments("--user-data-dir="+chomeDir);
const driver = new webdriver.Builder()
    .forBrowser('chrome')
    .setChromeOptions(o)
    .build();

const data = [];

let root_dir = null;
let location_id = null;
let location_name = null;

function errorHandler(err) {
    if(err.hasOwnProperty('name') && err.name == 'WebDriverError' && err.hasOwnProperty('message') && err.message.indexOf('chrome not reachable') !== -1) {
        process.exit(1);
    }
}

function waitForInstagramHome() {
    return new Promise(resolve => {
        driver.findElement(By.css('span[aria-label="Profile"]')).then(element => {
            resolve();
        }).catch(err => {
            errorHandler(err);
            waitForInstagramHome().then(resolve);
        });
    });
}

function waitForAlert() {
   return new Promise((resolve, reject) => {
       driver.switchTo().alert().then(() => {
           waitForAlert().then(resolve);
       }).catch(err => {
           errorHandler(err);
           resolve();
       })
   });
}

function waitForLocationUrl() {
    return new Promise((resolve, reject) => {
        driver.getCurrentUrl().then(url => {
            const parts = url.substring(url.length, url.indexOf('explore/locations') + 18).split('/');
            if(url.indexOf('explore/locations') !== -1 && location_id != parts[0] && location_name != parts[1]){
                location_id = parts[0];
                location_name = parts[1];
                resolve();
            }else{
                setTimeout(() => {
                    waitForLocationUrl().then(resolve);
                }, 1000);
            }
        }).catch(err => {
            errorHandler(err);
            console.log(err);
            setTimeout(() => {
                waitForLocationUrl().then(resolve);
            }, 1000);
        });
    })
}

function waitForLocation() {
    return new Promise((resolve, reject) => {
        waitForLocationUrl()
            .then(() => driver.executeScript(`if(confirm("wanna crawl ${location_name}?")){ window.crawl = true; }`))
            .then(() => waitForAlert())
            .then(() => driver.executeScript('return window.crawl'))
            .then(answer => {
                if(answer) {
                    if(process.send) {
                        process.send({location_id: location_id, location_name: location_name});
                    }

                    root_dir = `./data/${location_id}`;

                    rimraf(root_dir, () => {
                        if (!fs.existsSync(root_dir)) {
                            fs.mkdirSync(root_dir, {recursive: true});
                        }

                        resolve();
                    });
                }else{
                    waitForLocation().then(resolve);
                }
            })
    })
}

function createUrl(next, max) {
    const variables = `{"id":"${location_id}","first":${max || 50}, "after": "${next}"}`;
    return 'https://www.instagram.com/graphql/query/?query_hash=1b84447a4d8b6d6d0426fefb34514485&variables='+querystring.escape(variables);
}

function crawlPage(url) {
    console.log(`crawling: ${url}`);
    return new Promise((resolve, reject) => {
        driver.get(url)
            .then(() => {
                return driver.findElement( By.tagName('body')).getText();
            })
            .then(source => {
                const response = JSON.parse(source);

                if(response['status'] == 'fail') {
                    if(response['message']){
                        console.log(response['message']);
                    }
                    console.log('retrying in 10 seconds...');
                    setTimeout(() => {
                        crawlPage(url).then(resolve).catch(reject);
                    }, 10000);
                    return;
                }

                const hasNextPage = response.data.location.edge_location_to_media.page_info.has_next_page;

                const items = response.data.location.edge_location_to_media.edges.map(edge => edge.node);
                data.push(...items);

                if(!fs.existsSync(root_dir+`/location.json`)){
                    const location  = lodash.cloneDeep(response.data.location);
                    delete location.edge_location_to_media;
                    delete location.edge_location_to_top_posts;
                    fs.writeFile(root_dir+'/location.json', JSON.stringify(location), 'utf8', (err) => {
                        if(err) reject(err);
                        console.log('location.json created');
                    });
                }


                console.log(items.length+' added');

                console.log(`progress... (${data.length})`);

                if(process.send) {
                    process.send({progress: `${data.length} items collected`});
                }

                if(hasNextPage) {
                    const nextCursor = response.data.location.edge_location_to_media.page_info.end_cursor;
                    crawlPage(createUrl(nextCursor, 50)).then(resolve).catch(reject);
                }else{
                    console.log(response.data.location.edge_location_to_media.page_info);
                    resolve();
                }
            })
            .catch(e => reject(e));
    });
}

function saveData(){
    return new Promise((resolve, reject) => {
        const json = JSON.stringify(data);

        fs.writeFile(root_dir+'/data.json', json, 'utf8', (err) => {
            if(err) reject(err);
            console.log('done '+data.length+' items crawled');
            resolve();
        });
    });
}

driver.get('https://www.instagram.com/accounts/edit/')
    .then(() => waitForInstagramHome())
    .then(() => waitForLocation())
    .then(() => crawlPage(`https://www.instagram.com/graphql/query/?query_hash=1b84447a4d8b6d6d0426fefb34514485&variables=%7B%22id%22%3A%22${location_id}%22%2C%22first%22%3A50%7D`))
    .then(() => driver.close())
    .then(() => saveData())
    .catch(err => {
        driver.close();
        saveData();
    });
