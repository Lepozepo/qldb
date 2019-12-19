# QLDB Bridge for Node
This is a simplified solution of the QLDB driver for AWS

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

### Inserting Documents
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

### Acid Transactions
To run multiple operations within an acid transaction, use the `transaction` command and pass a function to it. Whatever you return from the transaction function will be the result set from the transaction operation. All data created during the transaction will return an object as it would during normal execution.

```
import QLDB, { ionize } from 'qldb';

const QuantumClient = new QLDB({
  accessKey,
  secretKey,
  region,
  ledger,
});

// Later in your code
const docs = [{ id: 'someId', value: '1' }, { id: 'otherId', value: '2' }];
const [doc1, doc2] = await QuantumClient.transaction((txn) => {
  const d1 = await txn.execute(`INSERT INTO collection ${ionize(docs[0])}`);
  const d2 = await txn.execute(`INSERT INTO collection ${ionize(docs[1])}`);
  return [d1, d2];
});

// NOTE: You can iterate and use a Promise.all as well if you don't care to use the output of one entry for another
```


## Validating documents
To validate documents as described [here](https://s3.amazonaws.com/amazon-qldb-docs/verification.digest.html) you can use the Quantum Client's `validate` function. The validate function can only take a query string that returns QLDB history.

```
import QuantumClient from './your/configured/QLDB/instance';

const isValid = await QuantumClient.validate(`SELECT * FROM _ql_committed_Vehicle WHERE data.VIN = '1HVBBAANXWH544237'`);
```
