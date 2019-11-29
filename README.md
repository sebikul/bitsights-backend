# Bitsights Backend

## Configuration

You need to set the API key. You have two ways:

Either create the file `config/development.json` with the following content:


```json
{
  "bcoin": {
    "apiKey": "[KEY]"
  }
}
```

Or execute node with the following env var set:

```
BCOIN_API_KEY=[KEY]
```

## Running the server

```bash
$ npm ci
$ npm run build
$ node dist/index.js start

$ BCOIN_API_KEY='[KEY]' node dist/index.js start
```

## Related addresses

The payload for a related address search should be of the form:

```json
{
  "job_type": "RELATED",
  "args": {
    "needle_address": "mnPfojHV6zCbWNxdvui6TXwza6PMjbyBqc"
  }
}
```

```
curl -v localhost:3000/jobs -XPOST -H"Content-Type: application/json" -d '{"job_type":"RELATED", "args": {"needle_address":"mnPfojHV6zCbWNxdvui6TXwza6PMjbyBqc"}}'
```

## Distance

The payload for a distance search between two addresses should be of the form:


```json
{
  "job_type": "DISTANCE",
  "args": {
    "source": "msjXVby3fq8nZNSFdru46EeDXXweYKCNr8",
    "sink": "mnUkCH6ca558QNArLJCW5iwvTMpFbTD7NC",
  }
}
```

```
curl -v localhost:3000/jobs/ -XPOST -H"Content-Type: application/json" -d '{"job_type":"DISTANCE", "args": {"source":"msjXVby3fq8nZNSFdru46EeDXXweYKCNr8", "sink":"mnUkCH6ca558QNArLJCW5iwvTMpFbTD7NC", "max_depth":30}}'
```
