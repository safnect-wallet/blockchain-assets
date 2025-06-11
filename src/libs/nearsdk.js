import { nearApi } from '@src/wallets';
import { networkType } from '@src/constants';

const mainnetConfig = { networkId: networkType.main, nodeUrl: "https://free.rpc.fastnear.com" };
const testnetConfig = { networkId: networkType.test, nodeUrl: "https://test.rpc.fastnear.com" };

function getConfig(network) {
	if (network == networkType.main) {
		return mainnetConfig;
	}
	return testnetConfig;
}

async function getBalance(network, address) {
	try {
		const config = getConfig(network);
		const connection = await nearApi.connect(config);
		const account = await connection.account(address);
		const accountBalance = await account.getAccountBalance();
		return nearApi.utils.format.formatNearAmount(accountBalance.total);
	} catch (err) {
		console.error(err);
		return 0;
	}
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	const transaction = {
			senderAddr, receiverAddr, amount: nearApi.utils.format.parseNearAmount(amount.toFixed(24))
	};
	let transactionFee = 0.000835;
	if (network == networkType.main) {
		transactionFee = 0.0008;
	}
	return { transaction, transactionFee };
}

async function sendTx(network, transaction, privateKey) {
	const config = getConfig(network);
	const myKeyStore = new nearApi.keyStores.InMemoryKeyStore();
	const keyPair = nearApi.KeyPair.fromString(privateKey); // ed25519:5Fg2...
	await myKeyStore.setKey(network, transaction.senderAddr, keyPair);
	config.keyStore = myKeyStore;
	const connection = await nearApi.connect(config);
	const account = await connection.account(transaction.senderAddr);
	try {
		const re = await account.sendMoney(
			transaction.receiverAddr, // Receiver account
			transaction.amount, // Amount being sent in yoctoNEAR
		);
		if (re.status) {
			return { success: true, txid: re.transaction.hash };
		} else {
			return { success: false, errorMsg: re };
		}
	} catch (error) {
		return { success: false, errorMsg: error.message };
	}
}

export default {
	getBalance,
	buildTx, 
	sendTx,
}
