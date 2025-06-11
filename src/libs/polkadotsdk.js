import { okxcry, ApiPromise, WsProvider, Keyring, cryptoWaitReady } from '@src/wallets';
import { networkType } from '@src/constants';

let clientTestnet;
let clientMainnet;

const testnetUnit = 1_000_000_000_000;
const mainnetUnit = 10_000_000_000;

async function getClient(network) {
	if (network == networkType.main) {
		if (!clientMainnet) {
			clientMainnet = await ApiPromise.create({ provider: new WsProvider('wss://rpc.polkadot.io') }); 
		}
		return clientMainnet;
	} else {
		if (!clientTestnet) {
			clientTestnet = await ApiPromise.create({ provider: new WsProvider('wss://westend-rpc.polkadot.io') });
		}
		return clientTestnet;
	}
}

function getUnit(network) {
	if (network == networkType.main) {
		return mainnetUnit;
	}
	return testnetUnit;
}

function getSs58Format(network) {
	if (network == networkType.main) {
		return 0;
	}
	return 42;
}

async function getBalance(network, address) {
	const apiClient = await getClient(network);
	const { data: balance } = await apiClient.query.system.account(address);
	const unit = getUnit(network);
	return balance.free / unit;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	const unit = getUnit(network);
	amount = Number((amount * unit).toFixed(0))
	
	const fee = await estimateTransactionFee(network, senderAddr, receiverAddr, amount);
	
	const transaction = {
		senderAddr, receiverAddr, amount
	};
	
	return { transaction, transactionFee: fee / unit };
}

async function estimateTransactionFee(network, senderAddr, receiverAddr, amount) {
	const apiClient = await getClient(network);
	let info;
  if (network == networkType.main) {
  	info = await apiClient.tx.balances.transfer(receiverAddr, amount).paymentInfo(senderAddr);
	} else {
		info = await apiClient.tx.balances.transferAllowDeath(receiverAddr, amount).paymentInfo(senderAddr);
	}
  return info.partialFee.toString();
}

async function sendTx(network, transaction, privateKey) {
	try {
		const buf = okxcry.base.fromBase64(privateKey);
		const privateKeyStr = Buffer.from(buf).toString('utf-8');
		const ss58Format = getSs58Format(network);
		const keyring = new Keyring({ type: 'sr25519', ss58Format: ss58Format });
		await cryptoWaitReady();
		const sender = keyring.createFromUri(privateKeyStr, { name: '0' });
		const apiClient = await getClient(network);
		let txHash;
		if (network == networkType.main) {
			txHash = await apiClient.tx.balances.transfer(transaction.receiverAddr, transaction.amount).signAndSend(sender);
		} else {
			txHash = await apiClient.tx.balances.transferAllowDeath(transaction.receiverAddr, transaction.amount).signAndSend(sender);
		}
		return { success: true, txid: txHash.toString() };
	} catch (error) {
		return { success: false, errorMsg: error.message };
	}
}

export default {
	getBalance,
	buildTx,
	sendTx,
}
