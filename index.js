const rlserver = require('temporary-rocketlets-server');
const bodyParser = require('body-parser');
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();

const manager = new rlserver.RocketletManager();

function _loadRocketlets() {
    fs.readdirSync('dist')
        .filter((file) => fs.statSync(path.join('dist', file)).isFile() && file.endsWith('.zip'))
        .map((zip) => fs.readFileSync(path.join('dist', zip), 'base64'))
        .forEach((content) => manager.add(content));
}

app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.json({
        'POST: /event': {
            msg: 'string'
        }
    });
});

app.post('/event', (req, res) => {
    console.log(req.body, req.body.msg);
    res.json({ success: true });
});

app.listen(3003, function _appListen() {
  console.log('Example app listening on port 3003!');
  console.log('http://localhost:3003/');
  _loadRocketlets();
});
