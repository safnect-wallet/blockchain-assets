import { web3, okxcry } from '@src/wallets';
import { networkType, getMoralisKey, MORALIS_API_ENDPOINT } from '@src/constants'

const provider = "https://bsc-testnet-dataseed.bnbchain.org/";
const web3Provider = new web3.Web3.providers.HttpProvider(provider);
const testweb3 = new web3.Web3(web3Provider);

const mainprovider = "https://bsc-dataseed.bnbchain.org/";
const mainweb3Provider = new web3.Web3.providers.HttpProvider(mainprovider);
const mainweb3 = new web3.Web3(mainweb3Provider);

const TOKEN_TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

function getWeb3(network) {
  if (network === networkType.main) {
    return mainweb3;
  }
  return testweb3;
}

export async function getBalance(network, address) {
	const amount = await getWeb3(network).eth.getBalance(address);
	const bnbBalance = getWeb3(network).utils.fromWei(amount, "ether");
	return bnbBalance;
}

export async function getGasPrice(network) {
	const gasPriceNum = await getWeb3(network).eth.getGasPrice();
	return Number(gasPriceNum);
}

function getMoralisChainName(network) {
  if (network != networkType.main) {
    return 'bsc testnet';
  }
  return 'bsc';
}

export async function getTokenBalance(network, address, tokenContractAddress = '', cache = 30) {
  const moralisChainName = getMoralisChainName(network);
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
}

export async function buildTx(network, from, to, amount, isMax = 0) {
	
	const tempweiAmount = getWeb3(network).utils.toWei(0.000001, "ether");
	const param = { from: from, to: to, value: tempweiAmount };
  const gasLimit = await getWeb3(network).eth.estimateGas(param, "latest", web3.ETH_DATA_FORMAT);
  
  const priorityGasPrice = await getGasPrice(network);
  
  const weiAmount = getWeb3(network).utils.toWei(amount, "ether");
  const chainId = getChainId(network);
  const tx = {
    from: from,
    to: to,
    value: weiAmount,
    gas: gasLimit,
    nonce: await getWeb3(network).eth.getTransactionCount(from, undefined, { number: web3.FMT_NUMBER.NUMBER , bytes: web3.FMT_BYTES.HEX }),
    maxPriorityFeePerGas: priorityGasPrice.toString(),
    maxFeePerGas: priorityGasPrice.toString(),
    chainId: chainId,
    type: 0x2,
  };
  
  const gasFeeNum = BigInt(gasLimit) * (BigInt(priorityGasPrice))
  const gasFee = getWeb3(network).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee: gasFee };
}

export async function buildTokenTx(network, from, to, amount, tokenContractAddress) {
	const chainId = getChainId(network);
  let gasLimit = 204_139;
  const priorityGasPrice = await getGasPrice(network);
  
  const data = TOKEN_TRANSFER_FUNCTION_SIGNATURE + Array.prototype.map
    .call(okxcry.abi.RawEncode(['address', 'uint256'], [to, amount],),
        (x) => `00${x.toString(16)}`.slice(-2),
    ).join('');
  
  const param = { from: from, to: tokenContractAddress, data: data };
  const estGasLimit = await getWeb3(network).eth.estimateGas(param);
  if (estGasLimit > gasLimit) { // add gas limit
  	gasLimit = estGasLimit + 100_000;
  }
  amount = 0;
  to = tokenContractAddress;
  
  const tx = {
    from: from,
    to: to,
    value: getWeb3(network).utils.toWei(amount, "ether"),
    gas: gasLimit,
    nonce: await getWeb3(network).eth.getTransactionCount(from, 'pending'),
    maxPriorityFeePerGas: priorityGasPrice.toString(),
    maxFeePerGas: priorityGasPrice.toString(),
    chainId: chainId,
    type: 0x2,
    data: data
  };
  const gasFeeNum = BigInt(estGasLimit) * (BigInt(priorityGasPrice))
  const gasFee = getWeb3(network).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee: gasFee };
}

export async function sendTx(network, transaction, privateKey) {
  const signer = getWeb3(network).eth.accounts.privateKeyToAccount(privateKey);
  getWeb3(network).eth.accounts.wallet.add(signer);
  try {
	  const signedTx = await getWeb3(network).eth.accounts.signTransaction(transaction, signer.privateKey);
	  await getWeb3(network).eth.sendSignedTransaction(signedTx.rawTransaction);
	  return { success: true, txid: signedTx.transactionHash };
	} catch (error) {
		return { success: false, errorMsg: error.message };
	}
}

function getChainName(network) {
	if (network == networkType.main) {
		return 'BSC';
	} else {
		return 'BSC_TESTNET';
	}
}

function getChainId(network) {
	if (network == networkType.main) {
		return 56;
	} else {
		return 97;
	}
}

export default {
	getBalance,
	buildTx,
	sendTx,
	buildTokenTx,
	getTokenBalance,
	getGasPrice,
}