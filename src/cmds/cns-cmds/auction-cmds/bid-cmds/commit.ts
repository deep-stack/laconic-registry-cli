import { Arguments } from 'yargs';
import assert from 'assert';
import path from 'path';
import { Account, createBid, Registry } from '@cerc-io/laconic-sdk';
import { ensureDir } from 'fs-extra';
import fs from 'fs';

import { getConfig, getConnectionInfo, getGasAndFees } from '../../../../util';

const OUT_DIR = 'out';

export const command = 'commit [auction-id] [quantity] [type]';

export const desc = 'Commit auction bid.';

export const handler = async (argv: Arguments) => {
  const auctionId = argv.auctionId as string;
  const quantity = argv.quantity as string;
  const denom = argv.type as string;
  assert(auctionId, 'Invalid auction ID.');
  assert(quantity, 'Invalid token quantity.');
  assert(denom, 'Invalid token type.');

  const { services: { cns: cnsConfig } } = getConfig(argv.config as string)
  const { restEndpoint, gqlEndpoint, privateKey, chainId } = getConnectionInfo(argv, cnsConfig);
  assert(restEndpoint, 'Invalid CNS REST endpoint.');
  assert(gqlEndpoint, 'Invalid CNS GQL endpoint.');
  assert(privateKey, 'Invalid Transaction Key.');
  assert(chainId, 'Invalid CNS Chain ID.');

  const account = new Account(Buffer.from(privateKey, 'hex'));
  const bidderAddress = account.formattedCosmosAddress;
  const bidAmount = `${quantity}${denom}`;
  const { reveal, commitHash } = await createBid(chainId, auctionId, bidderAddress, bidAmount);

  // Save reveal file.
  const outDirPath = path.join(process.cwd(), OUT_DIR);
  const revealFilePath = path.join(outDirPath, `${commitHash}.json`);
  await ensureDir(outDirPath);
  fs.writeFileSync(revealFilePath, JSON.stringify(reveal, undefined, 2));

  const registry = new Registry(gqlEndpoint, restEndpoint, chainId);
  const fee = getGasAndFees(argv, cnsConfig);

  const result = await registry.commitBid({ auctionId, commitHash }, privateKey, fee);
  const revealFile = `{"reveal_file":"${revealFilePath}"}`
  console.log(argv.verbose ? JSON.stringify(result, undefined, 2)+ JSON.stringify(JSON.parse(revealFile)) : JSON.stringify(JSON.parse(revealFile)));

  if (argv.output=="json"){
    console.log(argv.verbose ? JSON.stringify(result, undefined, 2)+"\n"+JSON.stringify(JSON.parse(revealFile)) : JSON.stringify(JSON.parse(revealFile)));
  } else {
    console.log(argv.verbose ? result+"\n"+revealFile:revealFile)
  }
}
