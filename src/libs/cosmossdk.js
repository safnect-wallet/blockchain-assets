import { atomWallet } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://rest.cosmos.directory/cosmoshub";
const clientMainnet = "https://rest.cosmos.directory/cosmoshub";
const SUBMIT_TX_URL = `https://docs-demo.cosmos-mainnet.quiknode.pro/cosmos/tx/v1beta1/txs`;// rest.cosmos.directory tx API no implemented

const unit = 1000000;

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

async function getBalance(network, address) {
	const endpoint = getClient(network);
	const balances = await fetch(`${endpoint}/cosmos/bank/v1beta1/balances/${address}`)
		.then(res => res.json())
	  .then(res => { return res.balances; });
	let balance = 0;
	for (let index in balances) {
		if (balances[index].denom == 'uatom') {
			balance = balances[index].amount;
			break;
		}
	}
	return balance / unit;
}

async function getAccount(network, address) {
	const endpoint = getClient(network);
	const info = await fetch(`${endpoint}/cosmos/auth/v1beta1/account_info/${address}`)
		.then(res => res.json())
	  .then(res => { return res.info; });
	return info;
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	amount = Number((amount * unit).toFixed(1))
	const account = await getAccount(network, senderAddr);
	const transaction = {
    type: "transfer",
    chainId: "cosmoshub-4",
    sequence: account.sequence,
    accountNumber: account.account_number,
    feeDemon: "uatom",
    feeAmount: 1000,
    gasLimit: 200000,
    memo: '',
    data: {
      fromAddress: senderAddr,
      toAddress: receiverAddr,
      demon: "uatom",
      amount: amount
    }
  };
	
	return { transaction, transactionFee: 0.001 };
}

async function sendTx(network, transaction, privateKey) {
	let signParam = { 
		privateKey: privateKey, 
    data: transaction
	}
	let tx = await atomWallet.signTransaction(signParam);
	const re = await submitTx(network, tx);
	if (re.code == 0) {
		return { success: true, txid: re.txhash };
	} else {
		return { success: false, errorMsg: re.raw_log, txid: re.txhash };
	}
}

async function submitTx(network, tx) {
	const param = {
		tx_bytes: tx,
		mode: 'BROADCAST_MODE_SYNC' // default value is BROADCAST_MODE_UNSPECIFIED
	};
	const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify(param)
	};
	const re = await fetch(SUBMIT_TX_URL, option)
		.then(res => res.json())
	  .then(res => { return res.tx_response; });
	return re;
}

export default {
	getBalance,
	buildTx, 
	sendTx,
}
