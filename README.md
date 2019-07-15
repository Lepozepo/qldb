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
