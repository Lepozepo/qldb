import { isDate, isPlainObject, isArray, pick } from 'lodash';
import java from 'java';
import parse from 'loose-json';
import path from 'path';
import axios from 'axios';
import aws4 from 'aws4';
import qs from 'qs';

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
    create: {
      method: 'POST',
      path: () => '/ledgers',
      defaultData: {
        PermissionsMode: 'ALLOW_ALL',
      },
    },
    delete: {
      method: 'DELETE',
      path: ({ Name }) => `/ledgers/${Name}`,
    },
    list: {
      method: 'GET',
      path: () => '/ledgers',
    },
    describe: {
      method: 'GET',
      path: ({ Name }) => `/ledgers/${Name}`,
    },
    update: {
      method: 'POST',
      path: ({ Name }) => `/ledgers/${Name}`,
    },
    // JOURNALS
    describeS3Journal: {
      method: 'GET',
      path: ({ Name, ExportId }) => `/ledgers/${Name}/journal-s3-exports/${ExportId}`,
    },
    exportS3Journal: {
      method: 'POST',
      path: ({ Name }) => `/ledgers/${Name}/journal-s3-exports`,
    },
    listS3Journals: {
      method: 'GET',
      path: () => '/journal-s3-exports',
    },
    listLedgersS3Journals: {
      method: 'GET',
      path: ({ Name }) => `/ledgers/${Name}/journal-s3-exports`,
    },
    // BLOCKCHAIN
    getBlock: {
      method: 'GET',
      path: ({ Name }) => `/ledgers/${Name}/block`,
    },
    getDigest: {
      method: 'POST',
      path: ({ Name }) => `/ledgers/${Name}/digest`,
    },
    getRevision: {
      method: 'POST',
      path: ({ Name }) => `/ledgers/${Name}/revision`,
    },
  };

  control(action, props = {}) {
    const {
      accessKey: accessKeyId,
      secretKey: secretAccessKey,
    } = this.props;

    if (!accessKeyId) throw new Error('accessKey required!');
    if (!secretAccessKey) throw new Error('secretKey required!');

    const endpoint = this.endpoints[action];
    const controlEndpointPath = endpoint.path(props.path);
    const { method } = endpoint;

    const data = {
      ...(endpoint.defaultData || {}),
      ...props.data,
    };
    const dataEmpty = Object.entries(data).length === 0;

    const params = {
      ...(endpoint.defaultParams || {}),
      ...props.params,
    };
    const paramsEmpty = Object.entries(params).length === 0;

    return axios({
      method,
      url: `${this.controlUrl}${controlEndpointPath}`,
      ...(dataEmpty ? {} : { data }),
      ...(paramsEmpty ? {} : { params }),
      headers: aws4.sign({
        service: 'qldb',
        region: this.props.region,
        path: `${controlEndpointPath}${paramsEmpty ? '' : qs.stringify(params, { addQueryPrefix: true })}`,
        method,
        ...(dataEmpty ? {} : { body: JSON.stringify(data) }),
      }, { accessKeyId, secretAccessKey }).headers,
    });
  }

  create(props) {
    return this.control('create', {
      data: pick(props, [
        'DeletionProtection',
        'Name',
        'PermissionsMode',
        'Tags',
      ]),
    });
  }

  delete(props) {
    return this.control('delete', {
      path: pick(props, [
        'Name',
      ]),
    });
  }

  list(props) {
    return this.control('list', {
      params: pick(props, [
        'MaxResults',
        'NextToken',
      ]),
    });
  }

  describe(props) {
    return this.control('describe', {
      path: pick(props, [
        'Name',
      ]),
    });
  }

  update(props) {
    return this.control('update', {
      data: pick(props, [
        'DeletionProtection',
      ]),
      path: pick(props, [
        'Name',
      ]),
    });
  }

  block(props) {
    return this.control('getBlock', {
      data: pick(props, [
        'BlockAddress',
        'DigestTipAddress',
      ]),
      path: pick(props, [
        'Name',
      ]),
    });
  }

  digest(props) {
    return this.control('getDigest', {
      data: pick(props, [
        'DigestTipAddress',
      ]),
      path: pick(props, [
        'Name',
      ]),
    });
  }

  revision(props) {
    return this.control('getRevision', {
      data: pick(props, [
        'BlockAddress',
        'DigestTipAddress',
        'DocumentId',
      ]),
      path: pick(props, [
        'Name',
      ]),
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
