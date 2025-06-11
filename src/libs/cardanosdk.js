import { cardanoSdk, okxcry, adaWallet } from '@src/wallets';
import { SafServerBaseUrl } from '@src/constants';

cardanoSdk.Loader.setCardanoUrl(`${SafServerBaseUrl}/html/cardano_multiplatform_lib_bg.wasm`);
cardanoSdk.Loader.setMessageUrl(`${SafServerBaseUrl}/html/cardano_message_signing_bg.wasm`);

const API_ENDPOINT = 'https://cardano-mainnet.blockfrost.io/api/v0';

const UNIT = 1000_000;

const PROJECT_ID = '';

function getOption() {
	const option = {
		headers: { 'Content-Type': 'application/json', Project_id: PROJECT_ID }
	};
	return option;
}

async function getBalance(network, address) {
	const option = getOption();
	const re = await fetch(`${API_ENDPOINT}/addresses/${address}`, option)
		.then(res => { 
			if (res.status == 200) {
				return res.json();
			} else {
				return { amount: [ { quantity: '0' }]}
			}
		}).then(res => { 
  		return parseInt(res.amount[0].quantity) / UNIT; 
	  });
	return re;
}

async function getUtxo(network, address) {
	const option = getOption();
	const re = await fetch(`${API_ENDPOINT}/addresses/${address}/utxos`, option)
		.then(res => { 
			if (res.status == 200) {
				return res.json();
			} else {
				return [];
			}
		}).then(res => { 
  		return res; 
	  });
	return re;
}

async function getLastBlock(network) {
	const option = getOption();
	const re = await fetch(`${API_ENDPOINT}/blocks/latest`, option)
		.then(res => { 
			if (res.status == 200) {
				return res.json();
			} else {
				return [];
			}
		}).then(res => { 
  		return res; 
	  });
	return re;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	const amountNum = (amount * UNIT);
	const red = await cardanoSdk.AdaWallet.minAda(senderAddr);
	if (amountNum < parseInt(red)) {
		const redAda = red / UNIT;
		throw new Error(`Transfer at least ${redAda} ADA`);
	}
	amount = amountNum.toFixed(0);
	const utxos = await getUtxo(network, senderAddr);
	if (!utxos || utxos.length == 0) {
		throw new Error(`Insufficient balance`);
	}
	const inputs = [];
	utxos.forEach(da => {
		inputs.push({
			txId: da.tx_hash,
			index: da.output_index,
			address: da.address,
			amount: da.amount[0].quantity
		});
	});
	const ttl = parseInt(new Date().getTime() / 1000 + 172800).toString(); // add 2 days
	const param =  {
		data: { 
			type: 'transfer', 
			inputs: inputs,
      address: receiverAddr,
      amount: amount,
      changeAddress: senderAddr,
      ttl: ttl
    }
	};
	const blockData = await getLastBlock(network);
	let fee;
	if (blockData.fees) {
		fee = parseInt(blockData.fees) / blockData.tx_count;
	} else {
		fee = await cardanoSdk.AdaWallet.minFee(param);
	}
	return { transaction: param, transactionFee: Number((fee / UNIT).toFixed(6)) };
}

async function submitTx(network, tx) {
	let encodeData = okxcry.base.fromBase64(tx);
	const option = {
		method: 'POST',
		headers: { 'Content-Type': 'application/cbor', Project_id: PROJECT_ID },
		body: encodeData
	};
	const re = await fetch(`${API_ENDPOINT}/tx/submit`, option)
		.then(res => { 
			if (res.status == 200) {
				return res.json();
			} else {
				return [];
			}
		}).then(res => { 
  		return res; 
	  });
	return re;
}

async function sendTx(network, transaction, privateKey) {
	 
	transaction.data.inputs.forEach(da => {
		da.privateKey = privateKey;
	});
	const tx = await adaWallet.signTransaction(transaction);
	const re = await submitTx(network, tx);
	if (re.status_code) {
		return { success: false, errorMsg: re.message };
	} else {
		return { success: true, txid: re};
	}
}

export default {
	getBalance,
	buildTx,
	sendTx,
}
