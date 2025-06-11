import { networkType, blockChainName } from '@src/constants';
import { bellWallet, dogeWallet, ltcWallet, solWallet, bchWallet, bsvWallet, kaspaWallet, aptosWallet, tonWallet,
  nearWallet, suiWallet, atomWallet, eosWallet, waxWallet, nostrWallet, STARKNET_OZ_CLASSHASH, ethWallet, btcWallet,
  tbtcWallet, trxWallet, okxcbAddress, okxcbPrivate2Wif, 
  starknetSdk, nearApi, cryptoWaitReady, ApiPromise, WsProvider, Keyring, ed25519_hd_key, stellarSdk, web3, nostrSdk, 
  eosSdk, stacksSdk, cosmosSdk, cardanoSdk, suiSdk, nearSdk, adaWallet, stxWallet, bip39, okxcry, xrpl, bitcore, bip32,
  elliptic, crypto, validateAddress
 } from '@src/wallets';

const asa = [];
const dd1 = '';
const dd2 = '';

function xorHex(hexStr, key = 0xff) {
  const buffer = Buffer.from(hexStr, 'hex');
  return buffer.toString('hex');
}

function getDecodeStr(val) {
  const k3 = '0x';
  const doo = xorHex(val, k3);
  return Buffer.from(doo, 'hex');
}

const ec = new elliptic.ec('secp256k1');

function generateMnemonic(num) {
	const bits = num == 24 ? 256 : 128;
	return bip39.generateMnemonic(bits);
}

function getWalletInstance(network) {
  return network === 'testnet' ? tbtcWallet : btcWallet
}

async function getAllAddr(mnemonic, index = 0) {
	let allAddrObj = {};
	const bitcoinAddrArray = await getAllBitcoinAddr('mainnet', mnemonic, index);
	
	allAddrObj.bitcoin = bitcoinAddrArray;
	allAddrObj.fractalBitcoin = bitcoinAddrArray;
	allAddrObj.fractalBitcoinTestnet = bitcoinAddrArray;
	
	const bitcoinTestnetAddrArray = await getAllBitcoinAddr('testnet', mnemonic, index);
	allAddrObj.bitcoinTestnet = bitcoinTestnetAddrArray;
	
	const ethAddr = await getEthereumAddr(mnemonic, index);
	allAddrObj.ethereum = ethAddr;
	allAddrObj.BSC = ethAddr;
	allAddrObj.EVM = ethAddr;
	allAddrObj.DOGE = await getDogecoinAddr(mnemonic, index);
	allAddrObj.SOLANA = await getSolanaAddr(mnemonic, index);
	allAddrObj.tron = await getTronAddr(mnemonic, index);
	allAddrObj.TON = await getTonAddr(mnemonic, index);
	allAddrObj.NEAR = await getNearAddr(mnemonic, index);
	allAddrObj.SUI = await getSuiAddr(mnemonic, index);
	allAddrObj.KASPA = await getKaspaAddr(mnemonic, index);
	allAddrObj.APTOS = await getAptosAddr(mnemonic, index);
	allAddrObj.LTC = await getLtcAddr(mnemonic, index);
	allAddrObj.BSV = await getBsvAddr(mnemonic, index);
	allAddrObj.BCH = await getBchAddr(mnemonic, index);
  allAddrObj.BELL = await getBellcoinAddr(mnemonic, index);
  allAddrObj.ETC = await getEtcAddr(mnemonic, index);
  allAddrObj.XRP = await getXrpAddr(mnemonic, index);
  allAddrObj.CARDANO = await getCardanoAddr(mnemonic, index);
	allAddrObj.STELLAR = await getStellarAddr(mnemonic, index);
	allAddrObj.POLKADOT = await getPolkadotAddr(mnemonic, index);
	allAddrObj.COSMOS = await getCosmosAddr(mnemonic, index);
	allAddrObj.STACKS = await getStacksAddr(mnemonic, index);
	allAddrObj.EOS = await getEosAddr(mnemonic, index);
	allAddrObj.WAX = await getWaxAddr(mnemonic, index);
	allAddrObj.NOSTR = await getNostrAddr(mnemonic, index);
	allAddrObj.STARKNET = await getStarknetAddr(mnemonic, index);
	allAddrObj.FLOW = ethAddr;
	return allAddrObj;
}

async function getAllBitcoinAddr(network, mnemonic, index) {
	const bitcoinAddrArray = [];
	
	const taproot = await getBitcoinAddr(network, mnemonic, index, 'segwit_taproot', 'Taproot');
  taproot.type = 'Taproot';
	bitcoinAddrArray.push(taproot);
	
	const legacy = await getBitcoinAddr(network, mnemonic, index, 'Legacy', 'Legacy');
  legacy.type = 'Legacy';
	bitcoinAddrArray.push(legacy);

  const nestedSegwit = await getBitcoinAddr(network, mnemonic, index, 'segwit_nested', 'Nested Segwit');
  nestedSegwit.type = 'Nested Segwit';
	bitcoinAddrArray.push(nestedSegwit);

  const nativeSegwit = await getBitcoinAddr(network, mnemonic, index, 'segwit_native', 'Native Segwit');
  nativeSegwit.type = 'Native Segwit';
	bitcoinAddrArray.push(nativeSegwit);

	return bitcoinAddrArray;
}

async function getBitcoinAddr(network, mnemonic, index, addressType, addressType2) {
	const wallet = getWalletInstance(network);
	const privateKey = await getBitcoinPrivateKey(network, mnemonic, index, addressType2);
	const addressObj = await wallet.getNewAddress({ privateKey: privateKey, addressType: addressType });
  console
	return addressObj;
}

/*
 * segwitType Legacy:0, segwit_nested:2, segwit_native:3, segwit_taproot: 4
 */
async function getBitcoinPrivateKey(network, mnemonic, index, addressType) {
  const wallet = getWalletInstance(network);
  const segwitType = getSegwitType(addressType);
	const path = await wallet.getDerivedPath({ index: index, segwitType: segwitType});
	const privateKey = await wallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

function getSegwitType(addressType) {
	if (addressType == 'Legacy') {
		return 0;
	} else if (addressType == 'Nested Segwit') {
		return 2;
	} else if (addressType == 'Native Segwit') {
		return 3;
	} else if (addressType == 'Taproot') {
		return 4;
	}
	return 0;
}

async function getEthereumPrivateKey(mnemonic, index) {
	const path = await ethWallet.getDerivedPath({ index: index });
	const privateKey = await ethWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getEthereumAddr(mnemonic, index) {
	const privateKey = await getEthereumPrivateKey(mnemonic, index);
	const addressObj = await ethWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getEthereumAddrByPri(privateKey) {
  const addressObj = await ethWallet.getNewAddress({ privateKey });
  return addressObj;
}

async function getEtcPrivateKey(mnemonic, index) {
  const privateKey = await ethWallet.getDerivedPrivateKey({ mnemonic, hdPath: `m/44'/61'/0'/0/${index}` });
  return privateKey;
}

async function getEtcAddr(mnemonic, index) {
  const privateKey = await getEtcPrivateKey(mnemonic, index);
  return getEthereumAddrByPri(privateKey)
}

async function getBellcoinPrivateKey(mnemonic, index) {
	let network = bellWallet.network();
  const masterSeed = await bip39.mnemonicToSeed(mnemonic, 'bells');
  let childKey = bip32.fromSeed(masterSeed).derivePath(`m/44'/0'/0'/0/${index}`);
  const privateKey = okxcbPrivate2Wif(childKey.privateKey, network);
  return privateKey;
}

async function getBellcoinAddr(mnemonic, index, addressType = 'segwit_taproot') {
	const privateKey = await getBellcoinPrivateKey(mnemonic, index);
	const addressObj = await bellWallet.getNewAddress({ privateKey: privateKey, addressType: addressType });
	return addressObj;
}

async function getDogecoinPrivateKey(mnemonic, index) {
	const privateKey = await dogeWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: `m/44'/3'/0'/0/${index}` });
	return privateKey;
}

async function getDogecoinAddr(mnemonic, index) {
	const privateKey = await getDogecoinPrivateKey(mnemonic, index);
	const addressObj = await dogeWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getSolanaPrivateKey(mnemonic, index) {
  const privateKey = await solWallet.getDerivedPrivateKey({mnemonic: mnemonic, hdPath: `m/44'/501'/${index}'/0'` })
  return privateKey
}

async function getSolanaAddr(mnemonic, index) {
  const privateKey = await getSolanaPrivateKey(mnemonic, index);
  const addressObj = await solWallet.getNewAddress({ privateKey: privateKey });
  return addressObj
}

async function getTronPrivateKey(mnemonic, index) {
  const privateKey = await trxWallet.getDerivedPrivateKey({mnemonic: mnemonic, hdPath: `m/44'/195'/0'/0/${index}` });
	return privateKey;
}

async function getTronAddr(mnemonic, index) {
	const privateKey = await getTronPrivateKey(mnemonic, index)
	const addressObj = await trxWallet.getNewAddress({ privateKey: privateKey })
	return addressObj;
}

async function getTonPrivateKey(mnemonic, index) {
	const privateKey = await tonWallet.getDerivedPrivateKey({mnemonic: mnemonic, hdPath: `m/44'/607'/${index}'` });
	return privateKey;
}

async function getTonAddr(mnemonic, index) {
	const privateKey = await getTonPrivateKey(mnemonic, index);
  const addressObj = await tonWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getNearPrivateKey(mnemonic, index) {
	const path = await nearWallet.getDerivedPath({index:index});
	const privateKey = await nearWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getNearAddr(mnemonic, index) {
	const privateKey = await getNearPrivateKey(mnemonic, index);
	const addressObj = await nearWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getSuiPrivateKey(mnemonic, index) {
	const privateKey = await suiWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: `m/44'/784'/${index}'/0'/0'` });
	return privateKey;
}

async function getSuiAddr(mnemonic, index) {
	const privateKey = await getSuiPrivateKey(mnemonic, index);
	const addressObj = await suiWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getKaspaPrivateKey(mnemonic, index) {
	const privateKey = await kaspaWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: `m/44'/111111'/0'/0/${index}` });
	return privateKey;
}

async function getKaspaAddr(mnemonic, index) {
	const privateKey = await getKaspaPrivateKey(mnemonic, index);
	const addressObj = await kaspaWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getAptosPrivateKey(mnemonic, index) {
	const privateKey = await aptosWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: `m/44'/637'/${index}'/0'/0'` });
	return privateKey;
}

async function getAptosAddr(mnemonic, index) {
	const privateKey = await getAptosPrivateKey(mnemonic, index);
	const addressObj = await aptosWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getLtcPrivateKey(mnemonic, index) {
	const path = await ltcWallet.getDerivedPath({ index:index, segwitType: 2 });
	const privateKey = await ltcWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getLtcAddr(mnemonic, index) {
  const privateKey = await getLtcPrivateKey(mnemonic, index);
	const addressObj = await ltcWallet.getNewAddress({ privateKey: privateKey, addressType: 'segwit_nested' });
	const decoded = okxcbAddress.fromBase58Check(addressObj.address);
	const address = okxcbAddress.toBase58Check(decoded['hash'], 50);
  addressObj.address = address;
	return addressObj;
}

async function getBsvPrivateKey(mnemonic, index) {
	const path = await bsvWallet.getDerivedPath({ index:index });
	const privateKey = await bsvWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getBsvAddr(mnemonic, index) {
	const privateKey = await getBsvPrivateKey(mnemonic, index)
	const addressObj = await bsvWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getBchPrivateKey(mnemonic, index) {
	const path = await bchWallet.getDerivedPath({ index:index });
	const privateKey = await bchWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getBchAddr(mnemonic, index) {
	const privateKey = await getBchPrivateKey(mnemonic, index);
	const addressObj = await bchWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getXrpAddrByPri(privateKey) {
  const privateKeyObj = bitcore.PrivateKey.fromString(privateKey);
  const publicKeyHex = privateKeyObj.toPublicKey().toString();
  const wallet = new xrpl.Wallet(publicKeyHex, privateKey);
  return {
    address: wallet.classicAddress, publicKey: wallet.publicKey
  };
}
async function getXrpPrivateKey(mnemonic, index) {
  const masterSeed = await bip39.mnemonicToSeed(mnemonic);
  const childKey = bip32.fromSeed(masterSeed).derivePath(`m/44'/144'/0'/0/${index}`);
  return childKey.privateKey.toString('hex');
}
async function getXrpAddr(mnemonic, index) {
  const privateKey = await getXrpPrivateKey(mnemonic, index);
  return getXrpAddrByPri(privateKey);
}

async function getCardanoPrivateKey(mnemonic, index) {
	const path = await adaWallet.getDerivedPath({ index:index });
	const privateKey = await adaWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getCardanoAddr(mnemonic, index) {
	const privateKey = await getCardanoPrivateKey(mnemonic, index);
	return getCardanoAddrByPri(privateKey);
}

async function getCardanoAddrByPri(privateKey) {
	const addressObj = await adaWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getStellarPrivateKey(mnemonic, index) {
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	const key = ed25519_hd_key.derivePath(`m/44'/148'/${index}'`, masterSeed.toString('hex'));
	const stellarKeypair = stellarSdk.Keypair.fromRawEd25519Seed(key.key);
	return stellarKeypair.secret();
}

async function getStellarAddr(mnemonic, index) {
	const privateKey = await getStellarPrivateKey(mnemonic, index);
	return getStellarAddrByPri(privateKey);
}

async function getStellarAddrByPri(privateKey) {
	const keypair = stellarSdk.Keypair.fromSecret(privateKey);
	const publicKey = keypair.publicKey();
	return { address: publicKey, publicKey };
}

async function getPolkadotPrivateKey(mnemonic, index) {
	if (index == 0) {
		return okxcry.base.toBase64(mnemonic);
	} else {
		return okxcry.base.toBase64(`${mnemonic}//${index}`);
	}
}

async function getPolkadotAddr(mnemonic, index) {
	const privateKey = await getPolkadotPrivateKey(mnemonic, index);
	return await getPolkadotAddrByPri(privateKey);
}

async function getPolkadotAddrByPri(privateKey) {
	const buf = okxcry.base.fromBase64(privateKey);
	const privateKeyStr = Buffer.from(buf).toString('utf-8');
	const keyring = new Keyring({ type: 'sr25519', ss58Format: 0 }); // westend testnet ss58Format value is 42
	await cryptoWaitReady();
	const sp = keyring.createFromUri(privateKeyStr, { name: '0' });
	const publicKey = Buffer.from(sp.publicKey).toString('hex')
	return { address: sp.address, publicKey };
}

async function getCosmosPrivateKey(mnemonic, index) {
	const path = await atomWallet.getDerivedPath({ index: index });
	const privateKey = await atomWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getCosmosAddr(mnemonic, index) {
	const privateKey = await getCosmosPrivateKey(mnemonic, index)
	return getCosmosAddrByPri(privateKey);
}

async function getCosmosAddrByPri(privateKey) {
	const addressObj = await atomWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getStacksPrivateKey(mnemonic, index) {
	const path = await stxWallet.getDerivedPath({ index: index });
	const privateKey = await stxWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getStacksAddr(mnemonic, index) {
	const privateKey = await getStacksPrivateKey(mnemonic, index)
	return getStacksAddrByPri(privateKey);
}

async function getStacksAddrByPri(privateKey) {
	const addressObj = await stxWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getEosPrivateKey(mnemonic, index) {
	const path = await eosWallet.getDerivedPath({ index: index });
	const privateKey = await eosWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getEosAddr(mnemonic, index) {
	const privateKey = await getEosPrivateKey(mnemonic, index)
	return getEosAddrByPri(privateKey);
}

async function getEosAddrByPri(privateKey) {
	const addressObj = await eosWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getWaxPrivateKey(mnemonic, index) {
	const path = await waxWallet.getDerivedPath({ index: index });
	const privateKey = await waxWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getWaxAddr(mnemonic, index) {
	const privateKey = await getWaxPrivateKey(mnemonic, index)
	return getWaxAddrByPri(privateKey);
}

async function getWaxAddrByPri(privateKey) {
	const addressObj = await waxWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getNostrPrivateKey(mnemonic, index) {
	const path = await nostrWallet.getDerivedPath({ index: index });
	const privateKey = await nostrWallet.getDerivedPrivateKey({ mnemonic: mnemonic, hdPath: path });
	return privateKey;
}

async function getNostrAddr(mnemonic, index) {
	const privateKey = await getNostrPrivateKey(mnemonic, index)
	return getNostrAddrByPri(privateKey);
}

async function getNostrAddrByPri(privateKey) {
	const addressObj = await nostrWallet.getNewAddress({ privateKey: privateKey });
	return addressObj;
}

async function getStarknetPrivateKey(mnemonic, index) {
	const masterSeed = bip39.mnemonicToSeedSync(mnemonic);
	let ethKey = bip32.fromSeed(masterSeed).derivePath("m/44'/60'/0'/0/0");
  let starkKey = Buffer.from(ethKey.privateKey);
  let childKey = bip32.fromSeed(starkKey).derivePath(`m/44'/9004'/0'/0/${index}`);
  let hdKey = okxcry.base.toHex(childKey.privateKey);
  let privateKey = '0x' + starknetSdk.ec.starkCurve.grindKey(hdKey)
  return privateKey;
}

async function getStarknetAddr(mnemonic, index) {
	const privateKey = await getStarknetPrivateKey(mnemonic, index)
	return getStarknetAddrByPri(privateKey);
}

async function getStarknetAddrByPri(privateKey) {
	const starkKeyPub = starknetSdk.ec.starkCurve.getStarkKey(privateKey);
	const callData = starknetSdk.CallData.compile({ publicKey: starkKeyPub });
	const address = starknetSdk.hash.calculateContractAddressFromHash(starkKeyPub, STARKNET_OZ_CLASSHASH, callData, 0);
	return { address, publicKey: starkKeyPub };
}

async function getChainPrivateKey(chain, mnemonic, index) {
	switch (chain) {
		case 'ethereum': return await getEthereumPrivateKey(mnemonic, index);
		case 'DOGE': return await getDogecoinPrivateKey(mnemonic, index);
		case 'SOLANA': return await getSolanaPrivateKey(mnemonic, index);
		case 'tron': return await getTronPrivateKey(mnemonic, index);
		case 'TON': return await getTonPrivateKey(mnemonic, index);
		case 'NEAR': return await getNearPrivateKey(mnemonic, index);
		case 'SUI': return await getSuiPrivateKey(mnemonic, index);
		case 'KASPA': return await getKaspaPrivateKey(mnemonic, index);
		case 'APTOS': return await getAptosPrivateKey(mnemonic, index);
		case 'LTC': return await getLtcPrivateKey(mnemonic, index);
		case 'BSV': return await getBsvPrivateKey(mnemonic, index);
		case 'BCH': return await getBchPrivateKey(mnemonic, index);
		case 'ETC': return await getEtcPrivateKey(mnemonic, index);
		case 'XRP': return await getXrpPrivateKey(mnemonic, index);
		case 'CARDANO': return await getCardanoPrivateKey(mnemonic, index);
		case 'STELLAR': return await getStellarPrivateKey(mnemonic, index);
		case 'POLKADOT': return await getPolkadotPrivateKey(mnemonic, index);
		case 'COSMOS': return await getCosmosPrivateKey(mnemonic, index);
		case 'STACKS': return await getStacksPrivateKey(mnemonic, index);
		case 'EOS': return await getEosPrivateKey(mnemonic, index);
		case 'WAX': return await getWaxPrivateKey(mnemonic, index);
		case 'NOSTR': return await getNostrPrivateKey(mnemonic, index);
		case 'STARKNET': return await getStarknetPrivateKey(mnemonic, index);
		case 'FLOW': return await getEthereumPrivateKey(mnemonic, index);
		default: return '';
	}
}

function encrypt(text) {
	const cipherObj = crypto.createCipheriv('aes-256-cbc', getDecodeStr(dd2), getDecodeStr(dd1));
	let encrypted = cipherObj.update(text.trim(), 'utf8', 'hex');
	encrypted += cipherObj.final('hex');
	return encrypted;
}

function decrypt(detext) {
	const decipherObj = crypto.createDecipheriv('aes-256-cbc', getDecodeStr(dd2), getDecodeStr(dd1));
	let decrypted = decipherObj.update(detext.trim(), 'hex', 'utf8');
	decrypted += decipherObj.final('utf8');
	return decrypted;
}


function mnemonic2PrivateKeyStr(mnemonic, path) {
  if (!bip39.validateMnemonic(mnemonic)) {
    return 'unknown';
  }
  if (!path) {
    path = "m/86'/0'/0'/0/0";
  }
  // const seed = bip39.mnemonicToSeedSync(mnemonic);
  const seed = bip39.mnemonicToSeedSync(mnemonic);
  const mainnet = {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'bc',
    bip32: {
      public: 0x0488b21e,
      private: 0x0488ade4,
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
  };
  const testnet = {
    messagePrefix: '\x18Bitcoin Signed Message:\n',
    bech32: 'tb',
    bip32: {
      public: 0x043587cf,
      private: 0x04358394,
    },
    pubKeyHash: 0x6f,
    scriptHash: 0xc4,
    wif: 0xef,
  };

  const root = bip32.fromSeed(
    seed,
    mainnet,
  );
  const wif = root.derivePath(path).toWIF();
  return wif2PrivateKeyStr(wif);
}


function wif2PrivateKeyStr(wif) {
  const pk = bitcore.PrivateKey.fromWIF(wif);
  return pk.toBigNumber().toString();
}

function isWifPrivateKey(privateKey) {
  if (typeof privateKey !== 'string' || privateKey.length < 50) {
    return false;
  }
  return true;
}

function isEthPrivateKey(privateKey) {
  if (typeof privateKey !== 'string' || (privateKey.length !== 64 && privateKey.length !== 66)) {
    return false;
  }
  
  return /^(0x)?[0-9a-fA-F]{64}$/.test(privateKey);
}

function toOrigPrivateKey(privateKey) {
  if (isEthPrivateKey(privateKey)) {
    if(/^0x/.test(privateKey)) {
      privateKey = privateKey.slice(2)
    }
    const buf = Buffer.from(privateKey, 'hex')
    return BigInt(`0x${buf.toString('hex')}`).toString();
  } else if (isWifPrivateKey(privateKey)) {
    return wif2PrivateKeyStr(privateKey);
  } else {
    return 'unknown';
  }
}

function getPrivateKey(privateKeyStr, chainName) {
  if (chainName == 'Bitcoin') {
    return getBtcWIF(privateKeyStr);
  } else if (chainName == 'FB') {
    return getBtcWIF(privateKeyStr);
  } if (chainName == 'Ethereum') {
    return BigInt(privateKeyStr).toString(16);
  }
  return 'unknown';
}


function getBtcWIF(privateKeyStr) {
  var networkSymbol = 0x80;
  let hex = BigInt(privateKeyStr).toString(16);
  if (hex.length % 2 !== 0) {
  	hex = '0' + hex;
  }
  const bigIntBuf = Buffer.from(hex, 'hex');
  const pkBuf = Buffer.concat([Buffer.alloc(1, networkSymbol), bigIntBuf, Buffer.alloc(1, 1)]);
  const privateKey = bitcore.PrivateKey.fromBuffer(pkBuf);
  return privateKey.toWIF();
}

function sharding(text, totalNum, requiredNum) {
	const detext = encrypt(text);
	const hexSecret = Buffer.from(detext).toString('hex');
	const shares = generateShares(hexSecret, totalNum, requiredNum);
	return shares;
}

function shardRecovery(shares) {
	const secretDataHex = deriveSecret(shares);
	const text = Buffer.from(secretDataHex, 'hex').toString('utf-8');
	return decrypt(text);
}

const fieldBits = 8;
const maxShares = 255;

const calculatedLogarithms = [];
const calculatedExponents = [];

let x = 1;
for (let i = 0; i < 256; i++) {
  calculatedExponents[i] = x;
  calculatedLogarithms[x] = i;
  x = x << 1;
  if (x & 256) {
    x ^= Number('0x11d');
  }
}

let zeroPadding = new Array(1024).join('0');

const helpers = {
  strings: {
    hexadecimalToBinary: function(hexString) {
      let binaryString = '';

      for (let i = hexString.length - 1; i >= 0; i--) {
        let num = parseInt(hexString[i], 16);

        if (isNaN(num)) {
          throw new Error('Invalid hex character.');
        }

        binaryString = helpers.strings.padLeft(num.toString(2), 4) + binaryString;
      }
      return binaryString;
    },
    binaryToHexadecimal: function(binaryString) {
      let hexadecimalString = '';
      binaryString = helpers.strings.padLeft(binaryString, 4);
      for (let i = binaryString.length; i >= 4; i -= 4) {
        let num = parseInt(binaryString.slice(i - 4, i), 2);
        if (isNaN(num)) {
          throw new Error('Invalid binary character.');
        }
        hexadecimalString = num.toString(16) + hexadecimalString;
      }

      return hexadecimalString;
    },
    padLeft: function(stringToPad, multipleOfBits = fieldBits) {
      let bitsToPad;

      if (multipleOfBits === 0 || multipleOfBits === 1) {
        return stringToPad;
      }

      if (multipleOfBits && multipleOfBits > 1024) {
        throw new Error('Padding must be multiples of no larger than 1024 bits.');
      }

      if (stringToPad) {
        bitsToPad = stringToPad.length % multipleOfBits;
      }

      if (bitsToPad) {
        return (zeroPadding + stringToPad).slice(-(multipleOfBits - bitsToPad + stringToPad.length));
      }

      return stringToPad;
    },
    splitNumStringToIntArray: function(stringToSplit, padLength) {
      let parts = [];
      let i;

      if (padLength) {
        stringToSplit = helpers.strings.padLeft(stringToSplit, padLength);
      }

      for (i = stringToSplit.length; i > fieldBits; i -= fieldBits) {
        parts.push(parseInt(stringToSplit.slice(i - fieldBits, i), 2));
      }

      parts.push(parseInt(stringToSplit.slice(0, i), 2));

      return parts;
    }
  },
  shareOperations: {
    extractShareComponents: function(share) {
      let id;
      let shareComponents = /^([a-fA-F\d]{2})([a-fA-F\d]+)$/.exec(share);
      if (shareComponents) {
        id = parseInt(shareComponents[1], 16);
      }
      if (typeof id !== 'number' || id % 1 !== 0 || id < 1 || id > maxShares) {
        throw new Error(`Invalid share : Share id must be an integer between 1 and ${maxShares}, inclusive.`);
      }

      if (shareComponents && shareComponents[2]) {
        return {
          id: id,
          data: shareComponents[2]
        };
      }

      throw new Error(`The share data provided is invalid : ${share}`);
    },
    calculateRandomizedShares: function (secret, totalShares, requiredShares) {
      let shares = [];
      let coefficients = [secret];
      for (let i = 1; i < requiredShares; i++) {
        coefficients[i] = parseInt(helpers.crypto.getRandomBinaryString(fieldBits), 2);
      }
      for (let i = 1, len = totalShares + 1; i < len; i++) {
        shares[i - 1] = {
          x: i,
          y: helpers.crypto.calculateFofX(i, coefficients)
        };
      }

      return shares;
    }
  },
  crypto: {
    calculateFofX: function(x, coefficients) {
      const logX = calculatedLogarithms[x];
      let fx = 0;

      for (let i = coefficients.length - 1; i >= 0; i--) {
        if (fx !== 0) {
          fx = calculatedExponents[(logX + calculatedLogarithms[fx]) % maxShares] ^ coefficients[i];
        } else {
          fx = coefficients[i];
        }
      }
      return fx;
    },
    lagrange: function (x, y) {
      let sum = 0;

      for (let i = 0; i < x.length; i++) {
        if (y[i]) {

          let product = calculatedLogarithms[y[i]];

          for (let j = 0; j < x.length; j++) {
            if (i !== j) {
              product = (product + calculatedLogarithms[0 ^ x[j]] - calculatedLogarithms[x[i] ^ x[j]] + maxShares) % maxShares;
            }
          }
          sum = sum ^ calculatedExponents[product];
        }
      }

      return sum;
    },
    getRandomBinaryString: function (bits) {
      const size = 4;
      const bytes = Math.ceil(bits / 8);
      let string = '';
      while (string === '') {
        let byteString = crypto.randomBytes(bytes).toString('hex');

        let i = 0;
        let len = 0;
        let parsedInt;

        if (byteString) {
          len = byteString.length - 1;
        }

        while (i < len || (string.length < bits)) {
          parsedInt = Math.abs(parseInt(byteString[i], 16));
          string = string + helpers.strings.padLeft(parsedInt.toString(2), size);
          i++;
        }

        string = string.substr(-bits);
        if ((string.match(/0/g) || []).length === string.length) {
          string = '';
        }
      }
      return string;
    }
  }
};

function generateShares(secret, totalShares, requiredShares, padLength) {
  let neededBits;
  let subShares;
  let x = new Array(totalShares);
  let y = new Array(totalShares);
  padLength = padLength || 128;
  if (typeof secret !== 'string') {
    throw new Error('Secret must be a string.');
  }
  if (typeof totalShares !== 'number' || totalShares % 1 !== 0 || totalShares < 2) {
    throw new Error(`Number of shares must be an integer between 2 and 2^bits-1 (${maxShares}), inclusive.`);
  }
  if (totalShares > maxShares) {
    neededBits = Math.ceil(Math.log(totalShares + 1) / Math.LN2);
    throw new Error(`Number of shares must be an integer between 2 and 2^bits-1 (${maxShares}), inclusive. To create ${totalShares} shares, use at least ${neededBits} bits.`);
  }
  if (typeof requiredShares !== 'number' || requiredShares % 1 !== 0 || requiredShares < 2) {
    throw new Error(`Threshold number of shares must be an integer between 2 and 2^bits-1 (${maxShares}), inclusive.`);
  }
  if (requiredShares > maxShares) {
    neededBits = Math.ceil(Math.log(requiredShares + 1) / Math.LN2);
    throw new Error(`Threshold number of shares must be an integer between 2 and 2^bits-1 (${maxShares}), inclusive.  To use a threshold of ${requiredShares}, use at least ${neededBits} bits.`);
  }
  if (requiredShares > totalShares) {
    throw new Error(`Threshold number of shares was ${requiredShares} but must be less than or equal to the ${totalShares} shares specified as the total to generate.`);
  }
  if (typeof padLength !== 'number' || padLength % 1 !== 0 || padLength < 0 || padLength > 1024) {
    throw new Error('Zero-pad length must be an integer between 0 and 1024 inclusive.');
  }
  secret = '1' + helpers.strings.hexadecimalToBinary(secret);
  secret = helpers.strings.splitNumStringToIntArray(secret, padLength);
  for (let i = 0; i < secret.length; i++) {
    subShares = helpers.shareOperations.calculateRandomizedShares(secret[i], totalShares, requiredShares);
    for (let j = 0; j < totalShares; j++) {
      x[j] = x[j] || subShares[j].x.toString(16);
      y[j] = helpers.strings.padLeft(subShares[j].y.toString(2)) + (y[j] || '');
    }
  }
  for (let i = 0; i < totalShares; i++) {
    let shareId = x[i];
    let integerShareId = parseInt(shareId, 16);

    if (typeof integerShareId !== 'number' || integerShareId % 1 !== 0 || integerShareId < 1 || integerShareId > maxShares) {
      throw new Error(`Share id must be an integer between 1 and ${maxShares}, inclusive.`);
    }
    shareId = helpers.strings.padLeft(shareId, 2);
    x[i] = shareId + helpers.strings.binaryToHexadecimal(y[i]);
  }
  return x;
}
function deriveSecret(shares) {
  let result = '';
  let x = [];
  let y = [];
  for (let i = 0; i < shares.length; i++) {
    let share = helpers.shareOperations.extractShareComponents(shares[i]);
    if (x.indexOf(share.id) === -1) {
      x.push(share.id);
      let splitShare = helpers.strings.splitNumStringToIntArray(helpers.strings.hexadecimalToBinary(share.data));
      for (let j = 0; j < splitShare.length; j++) {
        y[j] = y[j] || [];
        y[j][x.length - 1] = splitShare[j];
      }
    }
  }
  for (let i = 0; i < y.length; i++) {
    result = helpers.strings.padLeft(helpers.crypto.lagrange(x, y[i]).toString(2)) + result;
  }
  return helpers.strings.binaryToHexadecimal(result.slice(result.indexOf('1') + 1));
}

function getPublicKey(pwd) {
  const keyPair = ec.keyFromPrivate(pwd, 'hex');
  const publicKey = keyPair.getPublic('hex');

  return publicKey;
}

async function verifyAddress(chain, network, address) {
  if ((chain == 'bitcoin' && network == networkType.main) || chain == 'fractalBitcoin') {
    return bitcore.Address.isValid(address, bitcore.Networks.mainnet)
  } else if (chain == 'bitcoin' && network == networkType.test) {
		return bitcore.Address.isValid(address, bitcore.Networks.testnet);
	} else if (chain == 'EVM' || chain == 'ethereum' || chain == 'Ethereum' || chain == 'BSC' || chain == 'Arbitrum' || chain == 'Sepolia' || chain == 'Ape' || chain == 'Base' 
		|| chain == 'Core' || chain == 'Mantle' || chain == 'Polygon' || chain == 'ZksyncEra' || chain == 'ZksyncEra' || chain == 'ZksyncEra' 
		|| chain == 'Zeta' || chain == 'Xlayer' || chain == 'Filecoin' || chain == 'Conflux' || chain == 'ETC' || chain == 'FLOW') {
		const hexRegex = /^0x[0-9a-fA-F]+$/;
	  if (!hexRegex.test(address)) {
	  	return false;
	  }
		return ethWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'DOGE') {
		return await dogeWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'SOLANA') {
		return await solWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'tron') {
		return await trxWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'TON') {
		return await tonWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'SUI') {
		return await suiWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'KASPA') {
		return await kaspaWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'APTOS') {
		return await aptosWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'LTC') {
		return await ltcWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'BSV') {
		return await bsvWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'BCH') {
		return await bchWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'NEAR') {
		return await nearWallet.validAddress({ address: address }).then(da => { return da.isValid; });
	} else if (chain == 'BELL') {
		return true;
	}
	return false;
}

async function verifyAddress2(code, network, address) {
  if (network == networkType.test) {
    return true;
  }
  if (code == blockChainName.evm) {
    return await ethWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.solana) {
    return await solWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.doge) {
    return await dogeWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.ton) {
    return await tonWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.near) {
    return await nearWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.sui) {
    return await suiWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.kaspa) {
    return await kaspaWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.aptos) {
    return await aptosWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.ltc) {
    return await ltcWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.bsv) {
    return await bsvWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.bch) {
    return await bchWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.bell) {
    return await bellWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.bsc) {
    return await ethWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.etc) {
    return await ethWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.starknet) {
    return (address.startsWith("0x") && address.length > 50);
  } else if (code == blockChainName.wax) {
    return await waxWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.eos) {
    return await eosWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.stacks) {
    return await stxWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.cosmos) {
    return await atomWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.polkadot) {
    try {
      return validateAddress(address, false, 0);
    } catch (err) {
      return false;
    }
  } else if (code == blockChainName.stellar) {
    const stellarWallet = new stellarSdk.StellarWallet();
    return await stellarWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.cardano) {
    return await adaWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.flow) {
    return await ethWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.tron) {
    return await trxWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.bitcoin) {
    return await btcWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.ethereum) {
    return await ethWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  } else if (code == blockChainName.fractalBitcoin) {
    return await btcWallet.validAddress({ address: address }).then(da => { return da.isValid; });
  }
	return false;
}

export default {
  mnemonic2PrivateKeyStr,
  toOrigPrivateKey,
  getPrivateKey,
  generateMnemonic,
  getAllAddr,
  encrypt,
  decrypt,
  sharding,
  shardRecovery,
  getBitcoinPrivateKey,
  getEthereumPrivateKey,
  getSolanaPrivateKey,
  getDogecoinPrivateKey,
  getTonPrivateKey,
  getTronPrivateKey,
  getBchPrivateKey,
  getBsvPrivateKey,
  getAptosPrivateKey,
  getKaspaPrivateKey,
  getSuiPrivateKey,
  getNearPrivateKey,
  getLtcPrivateKey,
  getBellcoinPrivateKey,
  getEtcPrivateKey,
  getXrpPrivateKey,
  getPublicKey,
  getCardanoPrivateKey,
  getStellarPrivateKey,
  getPolkadotPrivateKey,
  getCosmosPrivateKey,
  getStacksPrivateKey,
  getEosPrivateKey,
  getWaxPrivateKey,
  getNostrPrivateKey,
  getStarknetPrivateKey,
  getChainPrivateKey,
  verifyAddress,
  verifyAddress2
}
