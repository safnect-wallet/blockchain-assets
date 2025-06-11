import { web3, okxcry } from '@src/wallets';
import { networkType, getMoralisKey, MORALIS_API_ENDPOINT } from '@src/constants';

const provider = "https://sepolia.infura.io/v3/";

const web3Provider = new web3.Web3.providers.HttpProvider(provider);
const testweb3 = new web3.Web3(web3Provider);

const mainprovider = "https://mainnet.infura.io/v3/";
const mainweb3Provider = new web3.Web3.providers.HttpProvider(mainprovider);
const mainweb3 = new web3.Web3(mainweb3Provider);

const TOKEN_TRANSFER_FUNCTION_SIGNATURE = '0xa9059cbb';

function getWeb3(network) {
  if (network == 'mainnet') {
    return mainweb3;
  }
  return testweb3;
}

function getChainName(network) {
	if (network == 'mainnet') {
		return 'ETH';
	} else {
		return 'SEPOLIA_TESTNET';
	}
}

function getChainId(network) {
	if (network == 'mainnet') {
		return 1;
	} else {
		return 11155111;
	}
}

async function getBalance(network, address) {
  const amount = await getWeb3(network).eth.getBalance(address);
  const ethBalance = getWeb3(network).utils.fromWei(amount, "ether");
  return Number(ethBalance);
}

async function getGasPrice(network) {
  const gasPriceNum = await getWeb3(network).eth.getGasPrice();
  return parseInt(Number(gasPriceNum) * 1.4);
}

async function buildTx(network, from, to, amount, isMax = 0) {
  const weiAmount = getWeb3(network).utils.toWei(amount, "ether");
  const param = { from: from, to: to, value: weiAmount };
  const gasLimit = await getWeb3(network).eth.estimateGas(param, "latest", web3.ETH_DATA_FORMAT);
  const priorityGasPrice = await getGasPrice(network);
  
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
  if (isMax == 1) { // max amount send
    const newAmount = BigInt(weiAmount) - gasFeeNum;
    tx.value = newAmount;
  }
  const gasFee = getWeb3(network).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee: gasFee };
}

async function buildTokenTx(network, from, to, amount, tokenContractAddress) {
  const chainId = getChainId(network);
	// FIXME gasLimit value is fixed
  const gasLimit = 84000;
  const priorityGasPrice = await getGasPrice(network);
  
  const data = TOKEN_TRANSFER_FUNCTION_SIGNATURE + Array.prototype.map
    .call(okxcry.abi.RawEncode(['address', 'uint256'], [to, amount],),
        (x) => `00${x.toString(16)}`.slice(-2),
    ).join('');
  
  amount = '0';
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
  const gasFeeNum = BigInt(gasLimit) * (BigInt(priorityGasPrice))
  const gasFee = getWeb3(network).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee: gasFee };
}

async function getTokenBalance(network, address, tokenContractAddress = '', cache = 30) {
  if (network == networkType.main) {
    const url = `https://eth.blockscout.com/api/v2/addresses/${address}/token-balances`;
    const re = await fetch(url).then(res => res.json()).then(res => { return res; });
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
    const option = { headers: { 'X-API-Key': getMoralisKey() } };
    const re = await fetch(`${MORALIS_API_ENDPOINT}/api/v2.2/${address}/erc20?chain=sepolia`, option)
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
}

async function sendTx(network, tx, privateKey) {
  try {
    const signer = getWeb3(network).eth.accounts.privateKeyToAccount(privateKey);
    getWeb3(network).eth.accounts.wallet.add(signer);
    
    let signedTx = await getWeb3(network).eth.accounts.signTransaction(tx, signer.privateKey);
    await getWeb3(network).eth.sendSignedTransaction(signedTx.rawTransaction);
    if (signedTx.transactionHash) {
      return { success: true, txid: signedTx.transactionHash };
    } else {
      return { success: false, errorMsg: JSON.stringify(signedTx) };
    }
  } catch (err) {
    return { success: false, errorMsg: err.message };
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