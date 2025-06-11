import { SafServerBaseUrl } from '@src/constants'
import { toSafHttpToken, markSpentUtxo } from '@src/util'
import { bellWallet } from '@src/wallets'

const mainnet_rpc_endpoint = 'https://api.nintondo.io/api';
const testnet_rpc_endpoint = 'https://testnet.nintondo.io/electrs';

const usatoshi = 100_000_000;

function getRpcEndpoint(network) {
	if (network == 'mainnet') {
		return mainnet_rpc_endpoint;
	}
	return testnet_rpc_endpoint;
}

export async function getBalance(network, address) {
	const prefix = getRpcEndpoint(network);
	const response = await fetch(`${prefix}/address/${address}/stats`);
  const re = await response.json();
  return (re.amount + re.balance) / usatoshi;
}

export async function getAvailableBalance(network, address) {
	const re = await getUtxoInfo(network, address);
	return re.totalAmount / usatoshi;
}

async function getUtxoInfo(network, address) {
	const utxos = await getUtxos(network, address);
	let totalAmount = 0;
	utxos.forEach((utxo) => {
		totalAmount += utxo.value
	});
	const size = utxos.length;
	return { totalAmount, size, utxos };
}

async function getUtxos(network, address, amount = 0) {
	const token = toSafHttpToken({ network, address, amount });
	const option = { headers: { 'token': token } };
	const response = await fetch(`${SafServerBaseUrl}/chain-bell/utxo?network=${network}&address=${address}&amount=${amount}`, option);
	if (response.ok) {
		const re = await response.json();
  	return re.data;
	} else {
		throw new Error(`get Utxo fail:${response.status}|${response.statusText}`)
	}
}

export async function buildTx(network, senderAddr, receiverAddr, bellAmount, feePerB) {
	const amount = Number((bellAmount * usatoshi).toFixed(1));
	const estbyt = 260;
	const estAmount = amount + parseInt(estbyt * feePerB);
	const utxos = await getUtxos(network, senderAddr, estAmount);
	const inputs = [];
	let totalSatoshi = 0;
	utxos.forEach(da => {
		inputs.push({ txId: da.txid, vOut: da.vout, amount: da.value });
		totalSatoshi += da.value;
	});
	const outputs = [{ address: receiverAddr, amount: amount }];
	const transaction = {
	  inputs: inputs,
	  outputs: outputs,
	  address: senderAddr,
	  feePerB: feePerB
	};
	const transactionFeeSat = await estimateGasFee(transaction);
	const transactionFee = transactionFeeSat / usatoshi;
	
	let avaAmount = totalSatoshi - transactionFeeSat;
	avaAmount = avaAmount > amount ? amount : avaAmount;
	transaction.outputs[0].amount = avaAmount;
	avaAmount = avaAmount / usatoshi;
	
	return { transaction, transactionFee, utxos, avaAmount };
}

export async function buildMaxTx(network, senderAddr, receiverAddr, feePerB) {
	const utxos = await getUtxos(network, senderAddr);
	const inputs = [];
	let totalSatoshi = 0;
	utxos.forEach(da => {
		inputs.push({ txId: da.txid, vOut: da.vout, amount: da.value });
		totalSatoshi += da.value;
	});
	const amount = totalSatoshi;
	const outputs = [{ address: receiverAddr, amount: amount }];
	const transaction = {
	  inputs: inputs,
	  outputs: outputs,
	  address: senderAddr,
	  feePerB: feePerB
	};
	const transactionFeeSat = await estimateGasFee(transaction);
	const transactionFee = transactionFeeSat / usatoshi;
	
	let avaAmount = totalSatoshi - transactionFeeSat;
	avaAmount = avaAmount > amount ? amount : avaAmount;
	transaction.outputs[0].amount = avaAmount;
	avaAmount = avaAmount / usatoshi;
	
	return { transaction, transactionFee, utxos, avaAmount };
}

export async function sendTx(network, transaction, wif, utxos) {
	const signParams = { privateKey: wif, data: transaction };
	let tx = await bellWallet.signTransaction(signParams);
	const re = await broadcast(network, tx);
	if (re.length == 64) {
		markSpentUtxo(network, utxos, 'bell');
		return { success: true, txid: re };
	} else {
		return { success: false, errorMsg: re };
	}
}

export async function estimateGasFee(transaction) {
  let signParams = {
    privateKey: '',
    data: transaction
  };
  let estFee = await bellWallet.estimateFee(signParams);
  return estFee;
}

export async function getGasFeeList(network) {
	const token = toSafHttpToken({ network });
	const option = { headers: { 'token': token } };
	const response = await fetch(`${SafServerBaseUrl}/chain-bell/fee-recomm?network=${network}`, option);
	const re = await response.json();
	return re;
}

async function broadcast(network, txHex) {
	const prefix = getRpcEndpoint(network);
  const url = `${prefix}/tx`;
  const options = {
    method: 'POST',
    body: txHex,
    headers: { "Content-Type": "text/plain", }
  };
  return fetch(url, options).then(async (res) => {
    const contentType = res.headers.get('content-type');
    if (contentType.includes('json')) {
      return res.json();
    } else {
      return res.text();
    }
  }).then(async (data) => {
    return data;
  });
}

export default {
  getBalance,
  getAvailableBalance,
  getGasFeeList,
  buildTx,
  buildMaxTx,
  sendTx,
}