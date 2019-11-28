import express from 'express';
import logger from 'morgan';
import { registry as engineRegistry } from './engines';
import { registry as jobRegistry } from './jobs';

const app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.get('/ready', (_, res) => {
  res.status(200).send('OK');
});

app.get('/health', async (_, res) => {
  res.status(200).send('OK');
});

app.post('/jobs', async (req, res) => {
  const jobType = req.body.job_type;
  const args = req.body.args;

  const engine = engineRegistry.getEngine(jobType);

  if (engine === null) {
    res.status(404).send({ message: 'Engine not found', status: 'error' });
    return;
  }

  const errors = engine.validateArgs(args);
  if (errors !== undefined) {
    res.status(400).send({ message: 'Invalid args', ...errors, status: 'error' });
    return;
  }

  const jobUUID = engine.execute(args);

  res.status(202).send({ status: 'created', uuid: jobUUID });

});

app.get('/jobs/:id', async (req, res) => {
  const jobUUID = req.params.id;

  const job = jobRegistry.getJob(jobUUID);
  if (job === null) {
    res.status(404).send({ message: 'Job not found', status: 'error' });
    return;
  }

  if (job.getStatus() === 'running') {
    res.status(200).send({ message: 'Job is still processing', status: 'running' });
    return;
  }

  res.status(200).send({
    message: 'Job has finished processing',
    results: job.getResult(),
    status: 'finished',
  });

});

export default app;
