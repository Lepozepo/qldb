import {
  isDate,
  isPlainObject,
  isArray,
  pick,
} from 'lodash';
import java from 'java';
import parse from 'loose-json';
import path from 'path';
import axios from 'axios';
import aws4 from 'aws4';
import qs from 'qs';
import { QLDB as ControlDriver, QLDBSession as SessionDriver } from 'aws-sdk';

java.classpath.push(path.resolve(__dirname, '../assets/execute.jar'));
const Execute = java.import('software.amazon.qldb.tutorial.Execute');
const Validate = java.import('software.amazon.qldb.tutorial.Validate');

export function ionize(entity) {
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

export default class QLDB {
  constructor(props = {}) {
    this.props = {
      region: 'us-east-2',
      ...props,
    };

    this.control = new ControlDriver({
      ...this.props,
      accessKeyId: this.props.accessKey,
      secretAccessKey: this.props.secretKey,
    });

    // this.session = new SessionDriver({
    //   ...this.props,
    //   accessKeyId: this.props.accessKey,
    //   secretAccessKey: this.props.secretKey,
    // });
  }

  // TABLE CRUD
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#createLedger-property
  create(props) {
    return this.control.createLedger(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#deleteLedger-property
  delete(props) {
    return this.control.deleteLedger(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#listLedgers-property
  list(props) {
    return this.control.listLedgers(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#describeLedger-property
  describe(props) {
    return this.control.describeLedger({
      Name: this.props.ledger,
      ...props,
    }).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#updateLedger-property
  update(props) {
    return this.control.describeLedger(props).promise();
  }

  // BLOCKCHAIN
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#getBlock-property
  block(props) {
    return this.control.getBlock(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#getDigest-property
  digest(props) {
    return this.control.getDigest(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#getRevision-property
  revision(props) {
    return this.control.getRevision(props).promise();
  }

  // JOURNALS
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#describeJournalS3Export-property
  journal(props) {
    return this.control.describeJournalS3Export(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#exportJournalToS3-property
  exportJournal(props) {
    return this.control.exportJournalToS3(props).promise();
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#listJournalS3Exports-property
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/QLDB.html#listJournalS3ExportsForLedger-property
  listJournals(props = {}) {
    if (!props.Name) return this.control.listJournalS3Exports(props).promise();
    return this.control.listJournalS3ExportsForLedger(props).promise();
  }

  // TODO: TAGS

  validate(query) {
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

        const result = Validate.validateSync(accessKey, secretKey, region, ledger, query);
        return resolve(result);
      } catch (err) {
        return reject(new Error((err.cause && err.cause.getMessageSync()) || err));
      }
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
