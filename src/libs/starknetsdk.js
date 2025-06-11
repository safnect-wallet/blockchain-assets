import { web3, starknetSdk, STARKNET_OZ_CLASSHASH } from '@src/wallets';
import { networkType } from '@src/constants';

const clientTestnet = "https://starknet-mainnet.blastapi.io/builder";
const clientMainnet = "https://starknet-mainnet.blastapi.io/builder";

const RPC_ENDPOINT_MAINNET = 'https://starknet-mainnet.blastapi.io/';
const RPC_ENDPOINT_TESTNET = 'https://starknet-sepolia.blastapi.io/';

const STRK_CONTRACT_ADDR = '';

const web3js = new web3.Web3();

const testnetProvider = new starknetSdk.RpcProvider({ nodeUrl: RPC_ENDPOINT_TESTNET });
const mainnetProvider = new starknetSdk.RpcProvider({ nodeUrl: RPC_ENDPOINT_MAINNET });

function getClient(network) {
	if (network == networkType.main) {
		return clientMainnet;
	}
	return clientTestnet;
}

function getRpcProvider(network) {
	if (network == networkType.main) {
		return mainnetProvider;
	}
	return testnetProvider;
}

async function getBalance(network, address) {
	const endpoint = getClient(network);
	let balance = 0;
	const re = await fetch(`${endpoint}/getWalletTokenBalances?walletAddress=${address}`)
		.then(res => res.json())
	  .then(res => { return res.tokenBalances; });
	re.forEach(da => {
		if (da.contractSymbol == 'STRK') {
			balance = da.balance / Math.pow(10, da.contractDecimals);
		}
	});
	return balance;
}

async function getTokenBalance(network, address) {
	const endpoint = getClient(network);
	const re = await fetch(`${endpoint}/getWalletTokenBalances?walletAddress=${address}`)
		.then(res => res.json())
	  .then(res => { return res.tokenBalances; });
	const arr = [];
	re.forEach(da => {
		if (da.contractSymbol != 'STRK') {
			arr.push({
				balance: da.balance / Math.pow(10, da.contractDecimals),
				symbol: da.contractSymbol,
				contractAddress: da.contractAddress,
				tokenType: '',
				decimals: da.contractDecimals,
				icon: '',
				name: da.contractName
			});
		}
	});
	return arr;
}

async function deployAccount({ network, privateKey }) {
	const provider = getRpcProvider(network);
	const starkKeyPub = starknetSdk.ec.starkCurve.getStarkKey(privateKey);
	const OZaccountConstructorCallData = starknetSdk.CallData.compile({ publicKey: starkKeyPub });
	const OZcontractAddress = starknetSdk.hash.calculateContractAddressFromHash(
	  starkKeyPub, STARKNET_OZ_CLASSHASH, OZaccountConstructorCallData, 0
	);
	let version = '0x3';
	const OZaccount = new starknetSdk.Account(provider, OZcontractAddress, privateKey, null, version);
	try {
		const { transaction_hash } = await OZaccount.deployAccount({
			classHash: STARKNET_OZ_CLASSHASH,
			constructorCalldata: OZaccountConstructorCallData,
			addressSalt: starkKeyPub,
			contractAddress: OZcontractAddress
		});
		await provider.waitForTransaction(transaction_hash);
		return { success: true, txid: transaction_hash };
	} catch (error) {
		console.error(error);
		return { success: false, errorMsg: error.message };
	}
}

async function buildTx(network, senderAddr, receiverAddr, amount) {
	amount = web3js.utils.toWei(amount, "ether");
	return await buildTokenTx(network, senderAddr, receiverAddr, amount, STRK_CONTRACT_ADDR);
}

async function buildTokenTx(network, senderAddr, receiverAddr, amount, contractAddress) {
	let version = '0x3';
	let transactionFee = 0.00029;
	const transaction = {
		senderAddr,
		receiverAddr,
		amount: amount.toString(),
		contractAddress,
		version
	};
	return { transaction, transactionFee };
}

async function sendTx(network, transaction, privateKey) {
	const provider = getRpcProvider(network);
	const address = transaction.senderAddr;
	const account = new starknetSdk.Account(
	  provider,
	  address,
	  privateKey,
	  undefined,
	  transaction.version
	);
	try {
		const result = await account.execute({
		  contractAddress: transaction.contractAddress,
		  entrypoint: 'transfer',
		  calldata: starknetSdk.CallData.compile({
		    recipient: transaction.receiverAddr,
		    amount: starknetSdk.cairo.uint256(transaction.amount),
		  }),
		});
		await provider.waitForTransaction(result.transaction_hash);
		return { success: true, txid: result.transaction_hash };
	} catch (error) {
		return { success: false, errorMsg: error.message };
	}
}

export default {
	getBalance,
	getTokenBalance,
	deployAccount,
	buildTx,
	buildTokenTx,
	sendTx,
}