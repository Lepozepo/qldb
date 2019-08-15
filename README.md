# QLDB Java Bridge for Node
This is a temporary solution to the missing QLDB driver for AWS. It uses the Java driver internally to run queries against QLDB.

## How to use
- Import QLDB and instantiate a client
- Run queries using `execute`

```
import QLDB from 'qldb';

const QuantumClient = new QLDB({
  accessKey,
  secretKey,
  region,
  ledger,
});

// Later in your code
const stuff = await QuantumClient.execute('SELECT * from Stuff');
```

### Inserting documents
To insert a document you need to convert it to ion structures as describe [here](http://amzn.github.io/ion-docs/docs/spec.html). This package provides a helper to convert javascript objects and array into ion structures.

- Import ionize from qldb
- Pass an array or object through the function
- Run an insert or update statement

```
import QLDB, { ionize } from 'qldb';

const QuantumClient = new QLDB({
  accessKey,
  secretKey,
  region,
  ledger,
});

// Later in your code
const doc = { id: 'someId', key: 'value', n: 1, fl: 1.2, obj: { s: 's' }, arr: [1, 2] };
const stuff = await QuantumClient.execute(`INSERT INTO collection ${ionize(doc)}`);
```

## Validating documents
To validate documents as described [here](https://s3.amazonaws.com/amazon-qldb-docs/verification.digest.html) you can use the Quantum Client's `validate` function. The validate function can only take a query string that returns QLDB history.

```
import QuantumClient from './your/configured/QLDB/instance';

const isValid = await QuantumClient.validate(`SELECT * FROM _ql_committed_Vehicle WHERE data.VIN = '1HVBBAANXWH544237'`);
```
