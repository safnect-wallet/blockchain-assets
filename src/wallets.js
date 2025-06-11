import * as bitcore from 'bitcore-lib-inquisition';
import * as bip39 from 'bip39';
import { BIP32Factory } from 'bip32';
import ecc from '@bitcoinerlab/secp256k1';
import { EthWallet } from '@okxweb3/coin-ethereum';
import * as trxSdk from '@okxweb3/coin-tron'
import * as solSdk from '@okxweb3/coin-solana';
import { 
	LtcWallet, DogeWallet, BchWallet, BsvWallet,
	BtcWallet, TBtcWallet, address as okxcbAddress, private2Wif as okxcbPrivate2Wif 
} from '@okxweb3/coin-bitcoin';
import { KaspaWallet } from '@okxweb3/coin-kaspa';
import { AptosWallet } from '@okxweb3/coin-aptos';
import * as tonSdk from '@okxweb3/coin-ton';
import * as nearSdk from '@okxweb3/coin-near';
import * as suiSdk from '@okxweb3/coin-sui';
import * as cardanoSdk from '@okxweb3/coin-cardano';
import * as cosmosSdk from '@okxweb3/coin-cosmos';
import * as stacksSdk from '@okxweb3/coin-stacks';
import * as eosSdk from '@okxweb3/coin-eos';
import * as nostrSdk from '@okxweb3/coin-nostrassets';
import * as okxcry from '@okxweb3/crypto-lib';
import * as web3 from 'web3';
import * as stellarSdk from '@stellar/stellar-base';
import * as ed25519_hd_key from 'ed25519-hd-key';
import { ApiPromise, WsProvider, Keyring } from '@polkadot/api';
import { cryptoWaitReady, validateAddress } from '@polkadot/util-crypto';
import * as nearApi from 'near-api-js';
import * as starknetSdk from 'starknet';
import * as xrpl from 'xrpl';
import crypto from 'crypto-browserify';
import elliptic from 'elliptic';


export const bip32 = BIP32Factory(ecc);
export const ethWallet = new EthWallet();
export const btcWallet = new BtcWallet();
export const tbtcWallet = new TBtcWallet();
export const trxWallet = new trxSdk.TrxWallet();
export const dogeWallet = new DogeWallet();
export const solWallet = new solSdk.SolWallet();
export const ltcWallet = new LtcWallet();
export const bchWallet = new BchWallet();
export const bsvWallet = new BsvWallet();
export const kaspaWallet = new KaspaWallet();
export const aptosWallet = new AptosWallet();
export const tonWallet = new tonSdk.TonWallet();
export const nearWallet = new nearSdk.NearWallet();
export const suiWallet = new suiSdk.SuiWallet();
export const adaWallet = new cardanoSdk.AdaWallet();
export const atomWallet = new cosmosSdk.AtomWallet();
export const stxWallet = new stacksSdk.StxWallet();
export const eosWallet = new eosSdk.EosWallet();
export const waxWallet = new eosSdk.WaxWallet();
export const nostrWallet = new nostrSdk.NostrAssetsWallet();

export const STARKNET_OZ_CLASSHASH = '0x061dac032f228abef9c6626f995015233097ae253a7f72d68552db02f2971b8f';

const bellcoin = {
  messagePrefix: 'Bells Signed Message:\n',
  bech32: 'bel',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398,
  },
  pubKeyHash: 25,
  scriptHash: 30,
  wif: 0x99,
};
const bellcoin_testnet = {
  messagePrefix: 'Bells Signed Message:\n',
  bech32: 'tbel',
  bip32: {
    public: 0x02facafd,
    private: 0x02fac398,
  },
  pubKeyHash: 33,
  scriptHash: 22,
  wif: 0x9e,
};
class BellWallet extends BtcWallet {
  network() {
    return bellcoin;
  }
}
export const bellWallet = new BellWallet();

export { 
  starknetSdk, nearApi, cryptoWaitReady, ApiPromise, WsProvider, Keyring, ed25519_hd_key, stellarSdk, web3, nostrSdk, 
  eosSdk, stacksSdk, cosmosSdk, cardanoSdk, suiSdk, nearSdk, bip39, okxcry, xrpl, bitcore, solSdk, elliptic, tonSdk,
  crypto, okxcbAddress, okxcbPrivate2Wif, validateAddress, trxSdk
};