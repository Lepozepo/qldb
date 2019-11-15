import QLDB from './index';

const QuantumClient = new QLDB({
  region: process.env.REGION,
  accessKey: process.env.ACCESS_KEY,
  secretKey: process.env.SECRET_KEY,
  ledger: process.env.LEDGER,
});

describe('QLDB', () => {
//   it('can execute', async () => {
//     const result = await QuantumClient.execute(process.env.TEST_QUERY);
//     expect(result).toBeInstanceOf(Array);
//   });
// 
//   it('can fail', async () => {
//     let failure;
//     try {
//       await QuantumClient.execute('SELECT * FROM nothing');
//     } catch (err) {
//       failure = err;
//     }
//     expect(failure).toBeInstanceOf(Error);
//     expect(failure.message.includes('No such variable')).toBe(true);
//   });

  it('can list ledgers', async () => {
    try {
      const result = await QuantumClient.list();
      expect(result.Ledgers).toBeInstanceOf(Array);
    } catch (err) {
      // console.log(err);
      throw err;
    }
  });

  // it('can validate ledger entries', async () => {
  //   try {
  //     const validationResult = await QuantumClient.validate(process.env.TEST_VALIDATION_QUERY);
  //     expect(validationResult).toBe(true);
  //   } catch (err) {
  //     throw err;
  //   }
  // });
});
