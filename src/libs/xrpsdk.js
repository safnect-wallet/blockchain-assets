import { xrpl, bitcore } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = new xrpl.Client("wss://s.altnet.rippletest.net:51233/");
const clientMainnet = new xrpl.Client("wss://xrplcluster.com/");

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

async function getBalance(network, address) {
	const client = getClient(network);
	await client.connect();
	let balance = 0.0;
	try {
		const xrpBalance = await client.getXrpBalance(address);
		balance = parseFloat(xrpBalance);
	} catch (error) {
		console.log(error);
	}
	client.disconnect();
	return balance;
}

function buildTx(network, senderAddr, receiverAddr, amount) {
	const transaction = {
		TransactionType: "Payment",
		Account: senderAddr,
		Destination: receiverAddr,
		Amount: xrpl.xrpToDrops(amount),
	};
	return { transaction: transaction, transactionFee: 0.000012};
}

async function sendTx(network, transaction, privateKey) {
	const client = getClient(network);
	await client.connect();
	
	try {
		const privateKeyObj = bitcore.PrivateKey.fromString(privateKey);
		const publicKeyHex = privateKeyObj.toPublicKey().toString();
		const senderWallet = new xrpl.Wallet(publicKeyHex, `${privateKey}`);
		
		const preparedTx = await client.autofill(transaction);
		const signedTx = senderWallet.sign(preparedTx);
		const resultData = await client.submitAndWait(signedTx.tx_blob);
		if (resultData.result.meta.TransactionResult == 'tesSUCCESS') {
			return { success: true, txid: resultData.result.hash };
		} else {
			return { success: false, txid: resultData.result.hash, errorMsg: resultData.result.meta.TransactionResult };
		}
	} finally {
		client.disconnect();
	}
}

export default {
	getBalance,
	buildTx,
	sendTx,
}
