const fs = require('fs');
const express = require('express');
const bodyParser = require('body-parser');
const m = require('./dist/manager.js');
const compiler = require('./dist/compiler.js');
const app = express();

const manager = new m.RocketletManager('./examples');

manager.load().then((items) => console.log(items)).catch((err) => console.warn(err));

app.use(bodyParser.json());

app.get('/', function (req, res) {
    res.json({
        'GET: /compile': {},
        'POST: /event': {
            msg: 'string'
        }
    });
});

app.get('/compile', (req, res) => {
    const src = fs.readFileSync('./examples/preMessageSent.ts', 'utf8');
    const result = compiler.compiler(src);

    const Rocketlet = eval(result);
    new Rocketlet();

    res.json({ src, result });
});

app.post('/event', (req, res) => {
    console.log(req.body, req.body.msg);
    res.json({ success: true });
});

app.listen(3003, function _appListen() {
  console.log('Example app listening on port 3003!');
  console.log('http://localhost:3003/');
});
