import {
  isDate,
  isPlainObject,
  isArray,
} from 'lodash';
import { QLDB as ControlDriver } from 'aws-sdk';
import { PooledQldbDriver as SessionDriver } from 'amazon-qldb-driver-nodejs';
import { IonTypes } from 'ion-js';
import compare from './compare';

export { compare };

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

export function toIonText({ strandId, sequenceNo } = {}) {
  return { IonText: `{strandId: "${strandId}", sequenceNo: ${sequenceNo}}` };
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

  async execute(query, ops = {}) {
    const { noParse = false } = ops;

    const session = await this.session();
    const binaryResult = await session.executeStatement(query);

    const resultList = binaryResult.getResultList();

    if (noParse) return resultList;

    return this.parse(resultList);
  }

  parse(ions) {
    return ions.map(this.parseIon);
  }

  parseIon = (ion) => {
    if (ion.type() === null) {
      ion.next();
    }

    if (ion.type() === IonTypes.LIST) {
      const list = [];
      ion.stepIn();
      while (ion.next() != null) {
        const itemInList = this.parseIon(ion);
        list.push(itemInList);
      }

      return list;
    }

    if (ion.type() === IonTypes.STRUCT) {
      const structToReturn = {};

      let type;
      const currentDepth = ion.depth();
      ion.stepIn();
      while (ion.depth() > currentDepth) {
        type = ion.next();
        if (type === null) {
          ion.stepOut();
        } else {
          structToReturn[ion.fieldName()] = this.parseIon(ion);
        }
      }
      return structToReturn;
    }

    if (ion.type().isNumeric) {
      return ion.numberValue();
    }

    if (ion.type() === IonTypes.DECIMAL) {
      return ion.value().numberValue();
    }

    if (ion.type() === IonTypes.TIMESTAMP) {
      return ion.value().toString();
    }

    return ion.value();
  }

  async validate(query) {
    const digest = await this.digest({
      Name: this.props.ledger,
    });

    const docs = await this.execute(query);
    const doc = docs[0];

    if (!doc) throw new Error('Datum not found!');

    const revision = await this.revision({
      Name: this.props.ledger,
      BlockAddress: toIonText(doc.blockAddress),
      DigestTipAddress: digest.DigestTipAddress,
      DocumentId: doc.metadata.id,
    });

    return compare(doc.hash, digest.Digest, revision.Proof);
  }
}
