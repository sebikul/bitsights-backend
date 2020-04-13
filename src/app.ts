import cors from 'cors';
import express from 'express';
import logger from 'morgan';
import { registry as engineRegistry } from './engines';
import { buildBigraphFromEdges, buildGraphFromEdges } from './graph';
import { registry as jobRegistry } from './jobs';

const app = express();

app.use(logger('dev'));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('static'));

app.get('/ready', (_, res) => {
  res.status(200).send('OK');
});

app.get('/health', async (_, res) => {
  res.status(200).send('OK');
});

app.get('/jobs', async (_, res) => {
  res.send({ engines: engineRegistry.getRegistered() });
});

app.post('/jobs', async (req, res) => {
  const jobType: string = req.body.job_type;
  const args = req.body.args;

  const engine = engineRegistry.getEngine(jobType.toUpperCase());

  if (engine === null) {
    res.status(404).send({ message: `Engine not found: ${jobType}`, status: 'error' });
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

  res.status(200).send({
    status: job.getStatus(),
    type: job.getType(),
    uuid: job.getUUID(),
  });
});

app.get('/jobs/:id/results', async (req, res) => {
  const jobUUID = req.params.id;

  const format = req.query.format as string || 'json';

  if (!['json', 'graphviz'].includes(format)) {
    res.status(400).send({ message: 'Invalid format', status: 'error' });
    return;
  }

  const job = jobRegistry.getJob(jobUUID);
  if (job === null) {
    res.status(404).send({ message: 'Job not found', status: 'error' });
    return;
  }

  if (job.getStatus() === 'running') {
    res.status(200).send({ message: 'Job is still processing', status: 'running' });
    return;
  }

  switch (format) {
    case 'json':
      res.status(200).send({
        results: job.getResult(),
        status: job.getStatus(),
        type: job.getType(),
        uuid: job.getUUID(),
      });
      break;

    case 'graphviz':

      switch (job.getType()) {
        case 'DISTANCE':
        case 'RELATED':
          const graph = buildGraphFromEdges(job.getResult().edges);
          res.status(200).send(graph);
          break;
        case 'RELATIONSHIP':

          const jobResult = job.getResult();

          const bigraph = buildBigraphFromEdges(
            jobResult.leftCluster.edges,
            jobResult.rightCluster.edges,
            jobResult.crossEdges,
          );
          res.status(200).send(bigraph);
          break;
      }

  }
});

export default app;
