import { Orchestrator } from './orchestrator';

import * as bodyParser from 'body-parser';
import * as express from 'express';

const orch = new Orchestrator();
const app = express();

app.use(bodyParser.json());

app.get('/', function _indexHandler(req, res) {
    res.json({ message: 'Coming soon ;)' });
});

app.post('/event', (req, res) => {
    console.log(req.body, req.body.msg);
    res.json({ success: true });
});

app.listen(3003, function _appListen() {
  console.log('Example app listening on port 3003!');
  console.log('http://localhost:3003/');

  orch.loadAndUpdate().catch((err) => console.warn(err));
});
