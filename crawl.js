require('chromedriver');
const readline = require('readline');
var webdriver = require('selenium-webdriver');
const querystring = require('querystring');
const {Builder, By, Key, until} = require('selenium-webdriver');
var fs = require('fs');
var driver = new webdriver.Builder()
    .forBrowser('chrome')
    .build();

const data = [];

function askQuestion(query) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise(resolve => rl.question(query, ans => {
        rl.close();
        resolve(ans);
    }))
}

function waitForInstagramHome() {
    return new Promise(resolve => {
        driver.findElement(By.css('span[aria-label="Profile"]')).then(element => {
            resolve();
        }).catch(err => {
            waitForInstagramHome().then(resolve);
        });
    });
}

function createUrl(next, max) {
    const variables = `{"id":"224081233","first":${max || 50}, "after": "${next}"}`;
    return 'https://www.instagram.com/graphql/query/?query_hash=1b84447a4d8b6d6d0426fefb34514485&variables='+querystring.escape(variables);
}

function crawlPage(url, callback) {
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
                        crawlPage(url, callback);
                    }, 10000);
                    return;
                }

                const hasNextPage = response.data.location.edge_location_to_media.page_info.has_next_page;

                const items = response.data.location.edge_location_to_media.edges.map(edge => edge.node);
                data.push(...items);

                console.log(items.length+' added');

                console.log(`progress... (${data.length})`);

                if(hasNextPage) {
                    const nextCursor = response.data.location.edge_location_to_media.page_info.end_cursor;
                    crawlPage(createUrl(nextCursor, 50), callback);
                }else{
                    console.log(response.data.location.edge_location_to_media.page_info);
                    callback();
                }
            });
    });
}


driver.get('https://www.instagram.com/accounts/login/')
    .then(() => {
      return new Promise((resolve, reject) => {
          waitForInstagramHome().then(resolve).catch(reject);
      })
    })
    .then(() =>  {
        return new Promise((resolve, reject) => {
            crawlPage('https://www.instagram.com/graphql/query/?query_hash=1b84447a4d8b6d6d0426fefb34514485&variables=%7B%22id%22%3A%22224081233%22%2C%22first%22%3A50%7D', () => {
                resolve();
            });
        });
    })
    .then(() => {
        return new Promise((resolve, reject) => {
            const json = JSON.stringify(data);
            fs.writeFile('data.json', json, 'utf8', (err) => {
                if(err) reject(err);
                console.log('done '+data.length+' items crawled');
                resolve();
            });
        });
    })
    .then(() => driver.close())
    .catch(err => {
        console.log('error:', err);
        driver.close();
    });
