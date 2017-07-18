import { Orchestrator } from './orchestrator';

import * as bodyParser from 'body-parser';
import * as express from 'express';
import * as fs from 'fs';
import * as path from 'path';
import * as socketIO from 'socket.io';

const app = express();

let orch = new Orchestrator();

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'site')));

app.get('/loaded', (req, res) => {
    res.json({ rocketlets: orch.manager.get().map((rc) => rc.getName()) });
});

app.post('/load', (req, res) => {
    if (req.body.rocketletId) {
        res.status(501).json({ success: false, err: 'Coming soon.' });
    } else {
        orch = new Orchestrator();
        orch.loadAndUpdate()
            .then(() => res.json({ success: true }))
            .catch((err) => res.status(500).json({ success: false, err }));
    }
});

app.post('/event', (req, res) => {
    console.log(req.body, req.body.msg);
    res.json({ success: true });
});

app.use((req, res, next) => {
    let route = path.join('node_modules', req.url);
    let route2 = path.join('.server-dist', 'site', req.url);
    const ext = path.extname(req.url);
    if (!ext) {
        route += '.js';
        route2 += '.js';
    }

    if (fs.existsSync(route2)) {
        console.log('Loading:', route2);
        fs.createReadStream(route2).pipe(res);
    } else if (fs.existsSync(route)) {
        console.log('Loading:', route);
        fs.createReadStream(route).pipe(res);
    } else {
        res.status(404).json({ message: 'Not found.' });
    }
});

const server = app.listen(3003, function _appListen() {
  console.log('Example app listening on port 3003!');
  console.log('http://localhost:3003/');

  orch.loadAndUpdate()
    .then(() => console.log('Completed the loading'))
    .catch((err) => console.warn('Errored loadAndUpdate:', err));
});

orch.setSocketServer(socketIO.listen(server));
