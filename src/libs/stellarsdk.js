import { stellarSdk } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://horizon-testnet.stellar.org";
const clientMainnet = "https://horizon.stellar.org";

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

async function getBalance(network, address) {
	const endpoint = getClient(network);
	let balance = 0.0;
	const balances = await fetch(`${endpoint}/accounts/${address}`)
		.then(res => {
			if (res.status == 200) {
				return res.json();
			} else {
				return { balances: [ { asset_type: 'native', balance: '0' }]}
			}
		})
	  .then(res => { return res.balances; });
	for (var i=0; i<balances.length; i++) {
		const balanceObj = balances[i];
		if (balanceObj.asset_type == 'native') {
			balance = Number(balanceObj.balance);
			break;
		}
	}
	return balance;
}

async function getStatusCode(network, address) {
	const endpoint = getClient(network);
	const statusCode = await fetch(`${endpoint}/accounts/${address}`)
		.then(res => res.status)
		.then(res => { return res });
	return statusCode;
}

async function getSequence(network, address) {
	const endpoint = getClient(network);
	return fetch(`${endpoint}/accounts/${address}`)
		.then(res => res.json())
	  .then(res => { return res.sequence; });
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	const sequence = await getSequence(network, senderAddr);
	const account = new stellarSdk.Account(senderAddr, sequence);
	let networkObj;
	if (network == networkType.main) {
		networkObj = stellarSdk.Networks.PUBLIC;
	} else {
		networkObj = stellarSdk.Networks.TESTNET;
	}
	const statusCode = await getStatusCode(network, receiverAddr); // http status code is 404: Account is not exists
	let operation;
	if (statusCode == 404) { 
		operation = stellarSdk.Operation.createAccount({ destination: receiverAddr, startingBalance: amount.toString() });
	} else {
		operation = stellarSdk.Operation.payment({
	    destination: receiverAddr,
	    asset: stellarSdk.Asset.native(),
	    amount: amount.toString()
	  });
	}
	
	const transaction = new stellarSdk.TransactionBuilder(account, {
		fee: stellarSdk.BASE_FEE,
    networkPassphrase: networkObj
	}).addOperation(operation).setTimeout(stellarSdk.TimeoutInfinite).build();
	return { transaction, transactionFee: stellarSdk.BASE_FEE };
}

async function sendTx(network, transaction, privateKey) {
	const keypair = stellarSdk.Keypair.fromSecret(privateKey);
	transaction.sign(keypair);
	const txBase64 = transaction.toEnvelope().toXDR('base64');
	const re = await submitTx(network, txBase64);
	if (re.successful == true) {
		return { success: true, txid: re.hash };
	} else {
		return { success: false, errorMsg: re.extras.result_codes.transaction };
	}
}

async function submitTx(network, txBase64) {
	const endpoint = getClient(network);
	const formData = new URLSearchParams();
	formData.append('tx', txBase64);
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
	  body: formData
	};
	const re = await fetch(`${endpoint}/transactions`, option)
		.then(res => res.json())
		.then(res => { return res });
	return re;
}

export default {
	getBalance,
	buildTx, 
	sendTx,
}
