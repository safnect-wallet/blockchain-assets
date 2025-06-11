import { stacksSdk, stxWallet } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://api.testnet.hiro.so";
const clientMainnet = "https://api.mainnet.hiro.so";

const unit = 1000000;

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

async function getBalance(network, address) {
	const re = await getAccount(network, address);
	return Number(re.balance) / unit;
}

async function getAccount(network, address) {
	const endpoint = getClient(network);
	const re = await fetch(`${endpoint}/v2/accounts/${address}`)
		.then(res => res.json())
	  .then(res => { return res; });
	return re;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	amount = Number((amount * unit).toFixed(1))
	const memo = '';
	const re = await getAccount(network, senderAddr);
	const payload = stacksSdk.createTokenTransferPayload(receiverAddr, amount, memo);
	const byteArr = stacksSdk.serializePayload(payload);
	const hex = stacksSdk.bytesToHex(byteArr);
	const estRe = await estimateFee(network, hex);
	const transaction = {
    type: 'transfer',
    data: {
      to: receiverAddr,
      amount: amount,
      memo: memo,
      nonce: re.nonce,
      fee: estRe.fee,
    }
  };
	
	return { transaction, transactionFee: estRe.fee / unit };
}

async function estimateFee(network, hex) {
	const endpoint = getClient(network);
	const param = {
		estimated_len: 180,
		transaction_payload: hex
	}
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify(param)
	};
	const re = await fetch(`${endpoint}/v2/fees/transaction`, option)
		.then(res => res.json())
	  .then(res => { return res.estimations[2]; });
	return re;
}

async function sendTx(network, transaction, privateKey) {
	let signParam = { 
		privateKey: privateKey, 
    data: transaction
	}
	let tx = await stxWallet.signTransaction(signParam);
	const txBuf = stacksSdk.hexToBuff(tx.txSerializedHexString);
	const re = await submitTx(network, txBuf);
	if (!re.error) {
		return { success: true, txid: re };
	} else {
		return { success: false, errorMsg: `${re.error}_${re.reason}`, txid: re.txid };
	}
}

async function submitTx(network, txBuf) {
	const endpoint = getClient(network);
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/octet-stream' },
	  body: txBuf
	};
	const re = await fetch(`${endpoint}/v2/transactions`, option)
		.then(res => res.json())
	  .then(res => { return res; });
	return re;
}

export default {
	getBalance,
	buildTx, 
	sendTx,
}
