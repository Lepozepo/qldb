import { isDate, isPlainObject, isArray } from 'lodash';
import java from 'java';
import parse from 'loose-json';
import path from 'path';
import axios from 'axios';
import aws4 from 'aws4';

java.classpath.push(path.resolve(__dirname, '../assets/execute.jar'));
const Execute = java.import('software.amazon.qldb.tutorial.Execute');

function ionize(entity) {
  let string = '';
  if (isPlainObject(entity)) {
    Object.entries(entity).forEach(([key, value]) => {
      if (isDate(value)) {
        string += `'${key}':\`${value.toISOString()}\`,`;
      } else if (isPlainObject(value)) {
        string += `'${key}':${ionize(value)},`;
      } else if (isArray(value)) {
        string += `'${key}':[${value.map(v => ionize(v)).join(',')}],`;
      } else {
        string += `'${key}':${JSON.stringify(value).replace(/"/ig, "'")},`;
      }
    });
    string = `{${string.slice(0, -1)}}`;
  } else if (isArray(entity)) {
    string = `<<${entity.map(e => ionize(e)).join(',')}>>`;
  } else {
    string = JSON.stringify(entity).replace(/"/ig, "'");
  }
  return string;
}

class QLDB {
  constructor(props = {}) {
    this.props = {
      region: 'us-east-2',
      ...props,
    };

    this.controlUrl = `https://qldb.${this.props.region}.amazonaws.com`;
  }

  endpoints = {
    listLedgers: {
      method: 'GET',
      path: () => '/ledgers',
    },
  };

  control(action, props) {
    const {
      accessKey: accessKeyId,
      secretKey: secretAccessKey,
    } = this.props;

    if (!accessKeyId) throw new Error('accessKey required!');
    if (!secretAccessKey) throw new Error('secretKey required!');

    const controlEndpointPath = this.endpoints[action].path(props);
    const { method } = this.endpoints[action];

    return axios({
      method,
      url: `${this.controlUrl}${controlEndpointPath}`,
      data: props,
      params: props,
      headers: aws4.sign({
        service: 'qldb',
        region: this.props.region,
        path: controlEndpointPath,
        method,
      }, { accessKeyId, secretAccessKey }).headers,
    });
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
        return reject(new Error((err.cause && err.cause.getMessageSync()) || err));
      }
    });
  }
}

export { ionize };
export default QLDB;
