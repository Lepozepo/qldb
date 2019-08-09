import QLDB from './index';

const QuantumClient = new QLDB({
  region: process.env.REGION,
  accessKey: process.env.ACCESS_KEY,
  secretKey: process.env.SECRET_KEY,
  ledger: process.env.LEDGER,
});

describe('QLDB', () => {
  it('can execute', async () => {
    const result = await QuantumClient.execute(process.env.TEST_QUERY);
    expect(result).toBeInstanceOf(Array);
  });

  it('can fail', async () => {
    let failure;
    try {
      await QuantumClient.execute('SELECT * FROM nothing');
    } catch (err) {
      failure = err;
    }
    expect(failure).toBeInstanceOf(Error);
    expect(failure.message.includes('No such variable')).toBe(true);
  });

  it('can list ledgers', async () => {
    try {
      const result = await QuantumClient.control('list');
      expect(result.data.Ledgers).toBeInstanceOf(Array);
    } catch (err) {
      // console.log(err);
      throw err;
    }
  });

  it('can create/delete ledgers', async () => {
    try {
      const createResult = await QuantumClient.control('create', {
        data: {
          Name: 'tester',
        },
      });
      expect(createResult.data.Name).toBe('tester');

      await QuantumClient.control('delete', {
        path: {
          Name: 'tester',
        },
      });
    } catch (err) {
      throw err;
    }
  });
});
