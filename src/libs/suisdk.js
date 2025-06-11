import { suiWallet } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://fullnode.testnet.sui.io:443";
const clientMainnet = "https://fullnode.mainnet.sui.io:443";

const MIST = 1_000_000_000;

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
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "suix_getAllBalances",
	  "params": [
	  	address
	  ]
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result; });
	let balance = 0;
	re.forEach(da => {
		if (da.coinType == '0x2::sui::SUI') {
			balance = da.totalBalance / MIST;
		}
	});
	return balance;
}

async function getCoins(network, address, coinType) {
	if (!coinType) {
		coinType = '0x2::sui::SUI';
	}
	const endpoint = getClient(network);
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "suix_getCoins",
	  "params": [
	  	address,
	  	coinType
	  ]
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result.data; });
	return re;
}

async function getTokenInfo(network, coinType) {
	const endpoint = getClient(network);
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "suix_getCoinMetadata",
	  "params": [ coinType ]
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result; });
	return re;
}

async function getGasPrice(network) {
	const endpoint = getClient(network);
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "suix_getReferenceGasPrice",
	  "params": []
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result; });
	return re;
}

async function estimateTransactionFee(network, transactionBlockBytes, gasPrice) {
	const endpoint = getClient(network);
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "sui_dryRunTransactionBlock",
	  "params": [transactionBlockBytes]
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result; });
	const gasUsed = re.effects.gasUsed;
	const gasFee = parseInt(gasUsed.computationCost) + parseInt(gasUsed.storageCost) + parseInt(gasUsed.storageRebate);
	return gasFee * gasPrice;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	amount = Number((amount * MIST).toFixed(1))
	const coinsArr = await getCoins(network, senderAddr);
	const coins = [];
	coinsArr.forEach(da => {
		coins.push({ digest: da.digest, objectId: da.coinObjectId, version: da.version });
	});
	const gasPrice = await getGasPrice(network);
	const transaction = { 
    inputCoins: coins,
    recipient: receiverAddr,
    amount: amount, 
    gasBudget: 100000000,
    gasPrice: gasPrice
	};
	
	return { transaction, transactionFee: 0.002 };
}

async function buildTokenTx(network, senderAddr, receiverAddr, amount, coinType) {
	const coinsArr = await getCoins(network, senderAddr, coinType);
	const coins = [];
	coinsArr.forEach(da => {
		coins.push({ digest: da.digest, objectId: da.coinObjectId, version: da.version });
	});
	const gasPrice = await getGasPrice(network);
	const transaction = { 
		inputCoins: coins,
		recipient: receiverAddr,
		amount: amount, 
		gasBudget: 100000000,
		gasPrice: gasPrice
	};
	
	return { transaction, transactionFee: 0.002 };
}

async function sendTx(network, transaction, privateKey) {
	const endpoint = getClient(network);
	let signParam = { 
		privateKey: privateKey, 
    	data: { type:'paySUI', data: transaction }
	}
	let data = await suiWallet.signTransaction(signParam);
	
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "sui_executeTransactionBlock",
	  "params": [
	  	data.transactionBlockBytes,
	    [ data.signature ],
	    {
	      "showInput": true,
	      "showRawInput": true,
	      "showEffects": true,
	      "showEvents": true,
	      "showObjectChanges": true,
	      "showBalanceChanges": true,
	      "showRawEffects": false
	    },
	    "WaitForLocalExecution"
	  ]
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result; });
	if (re.effects.status.status == 'success') {
		return { success: true, txid: re.digest };
	} else {
		return { success: false, txid: re.digest, errorMsg: re.effects.status.error };
	}
}

async function getTokenBalance(network, address) {
	const endpoint = getClient(network);
	const param = {
	  "jsonrpc": "2.0",
	  "id": 1,
	  "method": "suix_getAllBalances",
	  "params": [
	  	address
	  ]
	};
	const re = await fetch(endpoint, getOption(param))
		.then(res => res.json())
	  .then(res => { return res.result; });
	let balance = 0;
	re.forEach(da => {
		if (da.coinType == '0x2::sui::SUI') {
			balance = da.totalBalance / MIST;
		}
	});
	return balance;
}

export default {
	getBalance,
	buildTx, 
	sendTx,
}
