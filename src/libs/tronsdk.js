import { web3, okxcry, trxWallet, trxSdk } from '@src/wallets';
import { networkType } from '@src/constants'


// mainnet
const endpoint_mainnet = 'https://api.trongrid.io';
const mainweb3Provider = new web3.Web3.providers.HttpProvider(endpoint_mainnet + '/jsonrpc');
const mainweb3 = new web3.Web3(mainweb3Provider);

// testnet(shasta)
const endpoint_testnet = 'https://api.shasta.trongrid.io';
const web3Provider = new web3.Web3.providers.HttpProvider(endpoint_testnet + '/jsonrpc');
const testweb3 = new web3.Web3(web3Provider);

const TOKEN_ENDPOINT = 'https://apilist.tronscanapi.com';
const TESTNET_USDT_CONTRACT = 'TG3XXyExBkPp9nzdajDZsozEu4BkaSJozs';

function getWeb3(network) {
  if (network == networkType.main) {
    return mainweb3;
  }
  return testweb3;
}

export async function getBalance(network, address) {
	const endpoint = getEndpoint(network);
	const response = await fetch(`${endpoint}/v1/accounts/${address}`);
	if (!response.ok) throw new Error(`${response.status}|${response.statusText}`);
  	const re = await response.json();
	const reData = re.data[0] || {}
	let balance
	if (reData.balance === undefined) {
		balance = '0'
	} else {
		balance = getWeb3(network).utils.fromWei(reData.balance, "mwei")
	}
	return Number(balance);
}

function getEndpoint(network) {
	if (network == networkType.main) {
		return endpoint_mainnet;
	}
	return endpoint_testnet;
}

export async function buildTx(network, from, to, amount) {
	amount = getWeb3(network).utils.toWei(amount, "mwei");
	const latestBlock = await getWeb3(network).eth.getBlock('latest');
	const latestBlockNumber = new okxcry.BN(latestBlock.number);
	const latestBlockHash = okxcry.base.fromHex(latestBlock.hash);
	const refBlockBytes = latestBlockNumber.toBuffer('be', 8)

	const timeStamp = Date.parse(new Date().toString())
	const data = {
    type: "transfer",
    data: {
      fromAddress: from,
      refBlockBytes: okxcry.base.toHex(refBlockBytes.slice(6,8)),
      refBlockHash: okxcry.base.toHex(latestBlockHash.slice(8,16)),
      expiration: timeStamp + 3600 * 1000,
      timeStamp: timeStamp,
      toAddress: to,
      amount: amount,
    }
  };
  const re = await estimateGasFee(network, data);

  return { transaction: data, transactionFee: Number(re.networkFee) };
}

export async function estimateGasFee(network, data) {
	const size = JSON.stringify(data).length + 10;
	const res = await getAccountResource(network, data.data.fromAddress);
	const netRemainder = res.freeNetLimit - (res.freeNetUsed || 0);
	if (netRemainder > size) {
		return { res, networkFee: 0 };
	} else {
		const netPrice = await getNetPrice(network);
		const netPriceTrx = getWeb3(network).utils.fromWei(netPrice, "mwei");
		return { res, networkFee: size * netPriceTrx };
	}
}

export async function estimateTokenGasFee(network, data) {
	const re = await estimateGasFee(network, data);
	const param1 = {
		toAddress: data.data.toAddress,
		amount: data.data.amount
	};
	const uint8Array = trxSdk.getTransferData(param1);
	const hexString = Array.from(uint8Array)
	  .map(byte => byte.toString(16).padStart(2, '0'))
	  .join('');
	const param2 = {
			owner_address: data.data.fromAddress,
			contract_address: data.data.contractAddress,
			data: hexString,
			visible: true,
	};
	const energyRequired = await estimateEnergy(network, param2);
	const energy = (re.res.EnergyLimit || 0) - (re.res.EnergyUsed || 0)
	if (energy > energyRequired) {
		return { networkFee: re.networkFee + 0 };
	} else {
		const energyPrice = await getEnergyPrice(network);
		const energyPriceTrx = getWeb3(network).utils.fromWei(energyPrice, "mwei");
		const networkFee = re.networkFee + energyPriceTrx * energyRequired;
		return { networkFee };
	}
}

async function estimateEnergy(network, param) {
	const endpoint = getEndpoint(network);
	const options = {
	  method: 'POST',
	  headers: { 'content-type': 'application/json' },
	  body: JSON.stringify(param)
	};

	return await fetch(`${endpoint}/wallet/triggerconstantcontract`, options)
	  .then(res => res.json())
	  .then(res => { return res.energy_used; });
}

async function getNetPrice(network) {
	const endpoint = getEndpoint(network);
	const res = await fetch(`${endpoint}/wallet/getbandwidthprices`)
  .then(res => res.json())
  .then(res => { return res });
	const arrPrice = res.prices.split(',');
	const arr = arrPrice[arrPrice.length-1].split(':');
	return arr[1];
}

async function getEnergyPrice(network) {
	const endpoint = getEndpoint(network);
	const res = await fetch(`${endpoint}/wallet/getenergyprices`)
	.then(res => res.json())
	.then(res => { return res });
	const arrPrice = res.prices.split(',');
	const arr = arrPrice[arrPrice.length-1].split(':');
	return arr[1];
}

async function getAccountResource(network, address) {
	const endpoint = getEndpoint(network);
	address = trxSdk.toHexAddress(address);
	const options = {
	  method: 'POST',
	  headers: { 'content-type': 'application/json' },
	  body: JSON.stringify({ address: address })
	};

	return fetch(`${endpoint}/wallet/getaccountresource`, options)
	  .then(res => res.json())
	  .then(res => { return res });
}

export async function buildTokenTx(network, from, to, amount, tokenContractAddress) {
	
	const latestBlock = await getWeb3(network).eth.getBlock('latest');
	const latestBlockNumber = new okxcry.BN(latestBlock.number);
	const latestBlockHash = okxcry.base.fromHex(latestBlock.hash);
	const refBlockBytes = latestBlockNumber.toBuffer('be', 8)

	const timeStamp = Date.parse(new Date().toString())
	const data = {
		type: "tokenTransfer",
		data: {
			fromAddress: from,
			refBlockBytes: okxcry.base.toHex(refBlockBytes.slice(6,8)),
			refBlockHash: okxcry.base.toHex(latestBlockHash.slice(8,16)),
			expiration: timeStamp + 3600 * 1000,
			timeStamp: timeStamp,
			feeLimit: 30000000,
			toAddress: to,
			amount: amount.toString(),
			contractAddress: tokenContractAddress,
		}
	};

  const re = await estimateTokenGasFee(network, data);
  return { transaction: data, transactionFee: Number(re.networkFee) };
}

export async function buildAssetTx(network, from, to, amount, assetName) {
	
	const latestBlock = await getWeb3(network).eth.getBlock('latest');
	const latestBlockNumber = new okxcry.BN(latestBlock.number);
	const latestBlockHash = okxcry.base.fromHex(latestBlock.hash);
	const refBlockBytes = latestBlockNumber.toBuffer('be', 8)

	const timeStamp = Date.parse(new Date().toString())
	const data = {
    type: "assetTransfer",
    data: {
      fromAddress: from,
      refBlockBytes: okxcry.base.toHex(refBlockBytes.slice(6,8)),
      refBlockHash: okxcry.base.toHex(latestBlockHash.slice(8,16)),
      expiration: timeStamp + 3600 * 1000,
      timeStamp: timeStamp,
      feeLimit: 0,
      toAddress: to,
      amount: amount.toString(),
      assetName: assetName,
    }
  };
	return data;
}

async function getTokenBalance(network, address) {
	if (network == networkType.main) {
		const re = await fetch(`${TOKEN_ENDPOINT}/api/account/tokens?address=${address}&start=0&limit=100&hidden=1&show=2&sortType=0&sortBy=0&token=`)
			.then(res => res.json())
			.then(res => { return res });
		const retArr = [];
		re.data.forEach(da => {
			retArr.push({
				balance: da.quantity,
				symbol: da.tokenAbbr,
				contractAddress: da.tokenId,
				tokenType: da.tokenType,
				decimals: da.tokenDecimal,
				icon: da.tokenLogo,
				name: da.tokenName
			});
		});
		return retArr;
	} else {
		const endpoint = getEndpoint(network);
		const response = await fetch(`${endpoint}/v1/accounts/${address}`);
		const re = await response.json();
		if (re.data.length > 0) {
			const arr20 = re.data[0].trc20;
			const arr = [];
			arr20.forEach(da => { // testnet is not support get token balance, just only return an USDT token
				const usdtBalance = da[TESTNET_USDT_CONTRACT];
				if (usdtBalance) {
					arr.push({
						balance: usdtBalance / Math.pow(10, 6),
						symbol: 'USDT',
						contractAddress: TESTNET_USDT_CONTRACT,
						tokenType: 'TRC20',
						decimals: 6,
						icon: '',
						name: 'Tether USD'
					});
				}
			});
			return arr;
		} else {
			return [];
		}
	}
}

export async function sendTx(network, data, privateKey) {
	try {
		const params = { privateKey: privateKey, data: data };
		const txHex = await trxWallet.signTransaction(params);
		const re = await broadcast(network, txHex);
		if (re.result == true && re.code == 'SUCCESS') {
			return { success: true, txid: re.txid };
		} else {
			return { success: false, errorMsg: re.message };
		}
	} catch (err) {
		return { success: false, errorMsg: err.message };
	}
}

async function broadcast(network, txHex) {
	const endpoint = getEndpoint(network);
	const options = {
	  method: 'POST',
	  headers: {accept: 'application/json', 'content-type': 'application/json'},
	  body: JSON.stringify({ transaction: txHex })
	};

	return await fetch(`${endpoint}/wallet/broadcasthex`, options)
	  .then(res => res.json())
	  .then(res => { return res });
}

export default {
	getBalance,
	buildTx,
	sendTx,
	buildTokenTx,
	getTokenBalance,
	buildAssetTx,
	estimateGasFee,
	estimateTokenGasFee,
}