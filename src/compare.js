/* eslint-disable */

import { createHash } from 'crypto';
import { makeReader, toBase64 } from 'ion-js';

const HASH_LENGTH = 32;

function parseProof(valueHolder) {
  let proofList = valueHolder.IonText;
  const r = makeReader(proofList);
  r.next();
  r.stepIn();

  proofList = proofList.replace(']', '');
  proofList = proofList.replace('[', '');
  const array = proofList.split(',');

  const byteArray = [];
  for (let i = 0; i < array.length; i++) {
    r.next();
    byteArray.push(r.byteValue());
  }
  return byteArray;
}

function compareHashValues(hash1, hash2) {
  if (hash1.length !== HASH_LENGTH || hash2.length !== HASH_LENGTH) {
    throw new Error('Invalid hash.');
  }
  for (let i = hash1.length - 1; i >= 0; i--) {
    const difference = (hash1[i]<<24 >>24) - (hash2[i]<<24 >>24);
    if (difference !== 0) {
      return difference;
    }
  }
  return 0;
}

function concatenate(...arrays) {
  let totalLength = 0;

  for (const arr of arrays) {
    totalLength += arr.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;

  for (const arr of arrays) {
    result.set(arr, offset);
    offset += arr.length;
  }

  return result;
}

function joinHashesPairwise(h1, h2) {
  if (h1.length === 0) {
    return h2;
  }
  if (h2.length === 0) {
    return h1;
  }
  let concat;
  if (compareHashValues(h1, h2) < 0) {
    concat = concatenate(h1, h2);
  } else {
    concat = concatenate(h2, h1);
  }
  const hash = createHash('sha256');
  hash.update(concat);
  const newDigest = hash.digest();
  return newDigest;
}

function calculateRootHashFromInternalHash(internalHashes, leafHash) {
  return internalHashes.reduce(joinHashesPairwise, leafHash);
}

function buildCandidateDigest(proof, leafHash) {
  const parsedProof = parseProof(proof);
  const rootHash = calculateRootHashFromInternalHash(parsedProof, leafHash);
  return rootHash;
}

export default function compare(documentHash, digest, proof) {
  const candidateDigest = buildCandidateDigest(proof, documentHash);
  return toBase64(digest) === toBase64(candidateDigest);
}
