import { web3, okxcry } from '@src/wallets';
import { SafServerBaseUrl, getMoralisKey, MORALIS_API_ENDPOINT } from '@src/constants';
import { toSafHttpToken } from '@src/util'

const TOKEN_TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

function getWeb3(rpcUrl) {
	const web3ProviderObj = new web3.Web3.providers.HttpProvider(rpcUrl);
	const web3Obj = new web3.Web3(web3ProviderObj);
	return web3Obj;
}

async function getChainId(rpcUrl) {
	return await getWeb3(rpcUrl).eth.getChainId();
}

async function getBalance(rpcUrl, address) {
	const amount = await getWeb3(rpcUrl).eth.getBalance(address);
	const balance = getWeb3(rpcUrl).utils.fromWei(amount, "ether");
	return balance;
}

async function getGasPrice(rpcUrl) {
	const gasPriceNum = await getWeb3(rpcUrl).eth.getGasPrice();
	return Number(gasPriceNum);
}

async function buildTx(rpcUrl, from, to, amount, isMax = 0) {
	
	const tempweiAmount = getWeb3(rpcUrl).utils.toWei(0.000001, "ether");
	const param = { from: from, to: to, value: tempweiAmount };
  const gasLimit = await getWeb3(rpcUrl).eth.estimateGas(param, "latest", web3.ETH_DATA_FORMAT);
  
  const priorityGasPrice = await getGasPrice(rpcUrl);
  
  const weiAmount = getWeb3(rpcUrl).utils.toWei(amount, "ether");
  const rpcChainId = await getChainId(rpcUrl);
  const tx = {
    from: from,
    to: to,
    value: weiAmount,
    gas: gasLimit,
    nonce: await getWeb3(rpcUrl).eth.getTransactionCount(from),
    maxPriorityFeePerGas: priorityGasPrice.toString(),
    maxFeePerGas: priorityGasPrice.toString(),
    rpcUrl: rpcChainId,
    type: 0x2,
  };
  
  const gasFeeNum = BigInt(gasLimit) * (BigInt(priorityGasPrice))
  if (isMax == 1) { // max amount send
  	const newAmount = BigInt(weiAmount) - BigInt(gasFeeNum) - BigInt(10000);
  	tx.value = newAmount.toString();
  }
  const gasFee = getWeb3(rpcUrl).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee: gasFee };
}

async function buildTokenTx(rpcUrl, from, to, amount, tokenContractAddress) {
	const rpcChainId = await getChainId(rpcUrl);
  let gasLimit = 204_139;
  const priorityGasPrice = await getGasPrice(rpcUrl);
  
  const data = TOKEN_TRANSFER_FUNCTION_SIGNATURE + Array.prototype.map
    .call(okxcry.abi.RawEncode(['address', 'uint256'], [to, amount],),
        (x) => `00${x.toString(16)}`.slice(-2),
    ).join('');
  
  const param = { from: from, to: tokenContractAddress, data: data };
  const estGasLimit = await getWeb3(rpcUrl).eth.estimateGas(param);
  if (estGasLimit > gasLimit) { // add gas limit
  	gasLimit = estGasLimit + 100_000;
  }
  amount = 0;
  to = tokenContractAddress;
  
  const tx = {
    from: from,
    to: to,
    value: getWeb3(rpcUrl).utils.toWei(amount, "ether"),
    gas: gasLimit,
    nonce: await getWeb3(rpcUrl).eth.getTransactionCount(from, 'pending'),
    maxPriorityFeePerGas: priorityGasPrice.toString(),
    maxFeePerGas: priorityGasPrice.toString(),
    rpcUrl: rpcChainId,
    type: 0x2,
    data: data
  };
  const gasFeeNum = BigInt(estGasLimit) * (BigInt(priorityGasPrice))
  const gasFee = getWeb3(rpcUrl).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee: gasFee };
}

async function sendTx(rpcUrl, transaction, privateKey) {
	try {
		const signer = getWeb3(rpcUrl).eth.accounts.privateKeyToAccount(privateKey);
	  getWeb3(rpcUrl).eth.accounts.wallet.add(signer);
	  
	  const signedTx = await getWeb3(rpcUrl).eth.accounts.signTransaction(transaction, signer.privateKey);
	  await getWeb3(rpcUrl).eth.sendSignedTransaction(signedTx.rawTransaction);
	  return { success: true, txid: signedTx.transactionHash };
	} catch (error) {
		return { success: false, errorMsg: error.message };
	}
}

const oklinkChainIds = ['196', '43114', '250', '56', '2222', '9001', '59144', '11501', '7700', '33139', '204', '5545', '169', '238', '60808', '200901', '66', '2020', '1625', '513100', '8217'];// oklink api chains

function getOklinkChainShortName(chainId) {
	switch (chainId) {
	case '196': return 'XLAYER';
	case '43114': return 'AVAXC';
	case '250': return 'FTM';
	case '56': return 'BSC';
	case '2222': return 'KAVA';
	case '9001': return 'EVMOS';
	case '59144': return 'LINEA';
	case '11501': return 'BEVM';
	case '7700': return 'CANTO';
	case '33139': return 'APE';
	case '204': return 'OPBNB';
	case '5545': return 'DUCKCHAIN';
	case '169': return 'MANTA';
	case '238': return 'BLAST';
	case '60808': return 'BOB';
	case '200901': return 'BITLAYER';
	case '66': return 'OKTC';
	case '2020': return 'RONIN';
	case '1625': return 'GRAVITY';
	case '513100': return 'DIS';
	case '8217': return 'KAIA';
	default: 
		break;
	}
}

function getMoralisChainName(chainId) {
	switch (chainId) {
		case '43114': return 'avalanche';
		case '25': return 'cronos';
		case '250': return 'fantom';
		case '88888': return 'chiliz';
		//case '1284': return 'moonbeam';
		//case '369': return 'pulse';
	default: 
		break;
	}
}

async function getTokenBalance(chainId, restApi, address) {
	const moralisChainName = getMoralisChainName(chainId);
	if (moralisChainName) {
		const option = { headers: { 'X-API-Key': getMoralisKey() } };
		const re = await fetch(`${MORALIS_API_ENDPOINT}/api/v2.2/${address}/erc20?chain=${moralisChainName}`, option)
			.then(res => res.json())
			.then(res => { return res; });
		const arr = [];
		if (re.message) {
			return new Error(re.message);
		}
		re.forEach(da => {
			arr.push({
				balance: da.balance / Math.pow(10, da.decimals),
				symbol: da.symbol,
				contractAddress: da.token_address,
				tokenType: 'token_20',
				decimals: da.decimals,
				icon: da.logo,
				name: da.name
			});
		});
		return arr;
	} else if (restApi) {
		const response = await fetch(`${restApi}api/v2/addresses/${address}/token-balances`);
		const re = await response.json();
		const arr = [];
		if (re.message) {
			return arr;
		}
		re.forEach(da => {
			arr.push({
				balance: parseFloat(da.value) / Math.pow(10, da.token.decimals),
				symbol: da.token.symbol,
				contractAddress: da.token.address,
				tokenType: da.token.type,
				decimals: da.token.decimals,
				icon: da.token.icon_url,
				name: da.token.name
			});
		});
		return arr;
	} else {
		return [];
	}
}

export default {
	getBalance,
	buildTx,
	buildTokenTx,
	sendTx,
	getTokenBalance,
}