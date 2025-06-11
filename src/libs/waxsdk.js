import { waxWallet } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://testnet.waxsweden.org";
const clientMainnet = "https://api-wax.eosarabia.net";

const UNIT = 100000000;

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

function getOption(param) {
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify(param)
	};
	return option;
}

async function getBalance(network, address) {
	const endpoint = getClient(network);
	const param = { account_name: address };
	const re = await fetch(endpoint + '/v1/chain/get_account', getOption(param))
		.then(res => res.json())
	  .then(res => { return res; });
	if (re.core_liquid_balance) {
		return parseFloat(re.core_liquid_balance.split(' ')[0]);
	} else {
		return 0;
	}
}

async function getInfo(network) {
	const endpoint = getClient(network);
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' }
	};
	const re = await fetch(`${endpoint}/v1/chain/get_info`, option)
		.then(res => res.json())
	  .then(res => { return res; });
	return re;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	amount = Number((amount * UNIT).toFixed(1));
	const info = await getInfo(network);
	const transaction = {
    type: 0,
    from: senderAddr,
    to: receiverAddr,
    amount: amount,
    memo: '',
    common: {
    	chainId: info.chain_id,
      compression: true,
      refBlockNumber: info.head_block_num,
      refBlockId: info.head_block_id,
      refBlockTimestamp: info.head_block_time,
      expireSeconds: 600
    },
  };
	return { transaction, transactionFee: 0 };
}

async function buildAccountTx(network, creator, accountName, publicKey) {
	const info = await getInfo(network);
	const transaction = {
    type: 1, // create account
    creator: creator,
    newAccount: accountName,
    pubKey: publicKey,
    buyRam: {
      payer: creator,
      receiver: accountName,
      quantity: 100000000,
    },
    delegate: {
      from: creator,
      receiver: accountName,
      stakeNet: 100000000,
      stakeCPU: 100000000,
      transfer: false,
    },
    common: {
      chainId: info.chain_id,
      compression: true,
      refBlockNumber: info.head_block_num,
      refBlockId: info.head_block_id,
      refBlockTimestamp: info.head_block_time,
      expireSeconds: 600,
    },
  };
	return { transaction, transactionFee: 0 };
}

async function sendTx(network, transaction, privateKey) {
	const param = { privateKey: privateKey, data: transaction };
	const tx = await waxWallet.signTransaction(param);
	const re = await submitTx(network, tx);
	if (re.code == 500) {
		return { success: false, errorMsg: re.error.details[0].message };
	} else {
		return { success: true, txid: re.transaction_id };
	}
}

async function submitTx(network, tx) {
	const endpoint = getClient(network);
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' },
		body: tx
	};
	const re = await fetch(`${endpoint}/v1/chain/send_transaction`, option)
		.then(res => res.json())
	  .then(res => { return res; });
	return re;
}

export default {
	getBalance,
	buildTx, 
	buildAccountTx,
	sendTx,
}