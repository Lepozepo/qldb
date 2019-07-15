import java from 'java';
import parse from 'loose-json';
import path from 'path';

java.classpath.push(path.resolve(__dirname, '../assets/execute.jar'));
const Execute = java.import('software.amazon.qldb.tutorial.Execute');

export default class QLDB {
  constructor(props = {}) {
    this.props = {
      region: 'us-east-2',
      ...props,
    };
  }

  execute(query) {
    return new Promise((resolve, reject) => {
      try {
        const {
          accessKey,
          secretKey,
          region,
          ledger,
        } = this.props;
        if (!accessKey) throw new Error('accessKey required!');
        if (!secretKey) throw new Error('secretKey required!');
        if (!ledger) throw new Error('ledger required!');

        const resultBuffer = Execute.executeSync(accessKey, secretKey, region, ledger, query);
        if (!resultBuffer) return resolve();
        const resultString = resultBuffer.toStringSync();
        const result = parse(resultString);

        return resolve(result);
      } catch (err) {
        return reject(err);
      }
    });
  }
}
