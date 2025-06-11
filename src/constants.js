export const SafServerBaseUrl = ''

export const retCode = {
  success: '0',
  unsupport: '1001',
  invalidParam: '1000',
  sharding: '1100',
  accountAddrs: '1101',
  addrPrivateKey: '1102',
  balance: '1103',
  records: '1104',
  estimateGasFee: '1105',
  buildTx: '1106',
  feeList: '1107',
  sendTx: '1108',
  tokenBalance: '1109',
  price: '1110',
  tokenDetailList: '1111',
  pwdToPubKey: '1112',
  verifyAddr: '1113',
  unsupportNetwork: '1114',
  deployAccount: '1115',
  
}
export const invalidParamError = {
  code: retCode.invalidParam,
  err: 'invalid param',
}

export const unsupportNetworkError = {
  code: retCode.unsupportNetwork,
  err: 'unsupport network',
}

export const blockChainName = {
  bitcoin: 'bitcoin',
  fractalBitcoin: 'fractalBitcoin',
  ethereum: 'ethereum',
  btc: 'btc',
  tbtc: 'btc_test',
  fb: 'fb',
  eth: 'eth',
  doge: 'DOGE',
  solana: 'SOLANA',
  tron: 'tron',
  ton: 'TON',
  near: 'NEAR',
  sui: 'SUI',
  kaspa: 'KASPA',
  aptos: 'APTOS',
  ltc: 'LTC',
  bsv: 'BSV',
  bch: 'BCH',
  bell: 'BELL',
  bsc: 'BSC',
  etc: 'ETC',
  starknet: 'STARKNET',
  nostr: 'NOSTR',
  wax: 'WAX',
  eos: 'EOS',
  zkspace: 'ZKSPACE',
  stacks: 'STACKS',
  cosmos: 'COSMOS',
  polkadot: 'POLKADOT',
  stellar: 'STELLAR',
  cardano: 'CARDANO',
  flow: 'FLOW',
  evm: 'EVM',
}

export const segwitType = {
  legacy: 0,
  segwit_nested: 2,
  segwit_native: 3,
  taproot: 4
}

export const networkType = {
  main: 'mainnet',
  test: 'testnet'
}

export function getTatumOption(method, body) {
  const option = {
    headers: { 'Content-Type': 'application/json' },
  };
  if (method) {
    option.method = method;
  }
  if (body) {
    option.body = JSON.stringify(body);
  }
  return option;
}

export const MORALIS_API_KEYS = [
  
];
let keyIndex = 0;
export function getMoralisKey() {
  if (keyIndex >= MORALIS_API_KEYS.length) {
    keyIndex = 0;
  }
  return MORALIS_API_KEYS[keyIndex ++];
}
export const MORALIS_API_ENDPOINT = 'https://deep-index.moralis.io';
export const TATUM_API_ENDPOINT = 'https://api.tatum.io';