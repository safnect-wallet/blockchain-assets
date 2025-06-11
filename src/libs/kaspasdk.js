import { kaspaWallet } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://api.kaspa.org";
const clientMainnet = "https://api.kaspa.org";

const unit = 100000000;
const transactionFee = 10000;

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

async function getBalance(network, address) {
	const endpoint = getClient(network);
	const balance = await fetch(`${endpoint}/addresses/${address}/balance`)
		.then(res => res.json())
	  .then(res => { return res.balance; });
	return balance / unit;
}

async function getUtxo(network, address) {
	const endpoint = getClient(network);
	const res = await fetch(`${endpoint}/addresses/${address}/utxos`)
		.then(res => res.json())
	  .then(res => { return res; });
	return res;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	amount = Number((amount * unit).toFixed(1))
	const utxoArr = await getUtxo(network, senderAddr);
	const inputArr = [];
	utxoArr.forEach(da => {
		inputArr.push({
			txId: da.outpoint.transactionId,
			vOut: da.outpoint.index,
			address: da.address,
			amount: da.utxoEntry.amount
		});
	});
	const transaction = {
    inputs: inputArr,
    outputs: [
      { address: receiverAddr, amount: amount, },
    ],
    address: senderAddr,
    fee: transactionFee,
	};
	
	return { transaction, transactionFee: transactionFee / unit };
}

async function sendTx(network, transaction, privateKey) {
	const signParam = {  privateKey: privateKey, data: transaction };
	const tx = await kaspaWallet.signTransaction(signParam);
	const re = await submitTx(network, tx);
	if (!re.error) {
		return { success: true, txid: re.transactionId };
	} else {
		return { success: false, errorMsg: re.error };
	}
}

async function submitTx(network, tx) {
	const endpoint = getClient(network);
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' },
	  body: tx
	};
	const re = await fetch(`${endpoint}/transactions?replaceByFee=false`, option)
		.then(res => res.json())
	  .then(res => { return res; });
	return re;
}

export default {
	getBalance,
	buildTx, 
	sendTx,
}
