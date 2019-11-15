import {
  isDate,
  isPlainObject,
  isArray,
} from 'lodash';
import java from 'java';
// import parse from 'loose-json';
import path from 'path';
// import axios from 'axios';
// import aws4 from 'aws4';
// import qs from 'qs';
import { QLDB as ControlDriver } from 'aws-sdk';
import { PooledQldbDriver as SessionDriver } from 'amazon-qldb-driver-nodejs';
import { decodeUtf8, makeTextWriter } from 'ion-js';

java.classpath.push(path.resolve(__dirname, '../assets/execute.jar'));
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
      controlProps: {},
      sessionProps: {},
      ...props,
    };

    this.control = new ControlDriver({
      accessKeyId: this.props.accessKey,
      secretAccessKey: this.props.secretKey,
      region: this.props.region,
      ...this.props.controlProps,
    });

    if (this.props.ledger) {
      this.connect(this.props.ledger);
    }
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
    return this.control.describeLedger(props).promise();
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

  // EXECUTION
  connect(ledger, sessionProps) {
    if (this.sessionDriver) {
      this.sessionDriver.close();
    }

    this.sessionDriver = new SessionDriver(ledger, {
      accessKeyId: this.props.accessKey,
      secretAccessKey: this.props.secretKey,
      region: this.props.region,
      ...(sessionProps || this.props.sessionProps),
    });
  }

  async session() {
    if (!this.sessionDriver) throw new Error('The driver is not connected to a ledger! Use .connect(ledgerName) before running queries');

    if (this._session) return this._session;

    this._session = await this.sessionDriver.getSession();
    return this._session;
  }

  async execute(query) {
    const session = await this.session();
    const binaryResult = await session.executeStatement(query);
    return this.parse(binaryResult);
  }

  // eslint-disable-next-line
  parse(binaryResult) {
    const writer = makeTextWriter();
    binaryResult.getResultList().forEach((reader) => {
      writer.writeValues(reader);
    });
    return decodeUtf8(writer.getBytes());
  }

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
}
