import { web3 } from '@src/wallets';
import { networkType } from '@src/constants';

const provider = "https://testnet.evm.nodes.onflow.org";
const web3Provider = new web3.Web3.providers.HttpProvider(provider);
const testweb3 = new web3.Web3(web3Provider);

const mainprovider = "https://mainnet.evm.nodes.onflow.org";
const mainweb3Provider = new web3.Web3.providers.HttpProvider(mainprovider);
const mainweb3 = new web3.Web3(mainweb3Provider);

function getWeb3(network) {
  if (network == networkType.main) {
    return mainweb3;
  }
  return testweb3;
}

async function getBalance(network, address) {
	const amount = await getWeb3(network).eth.getBalance(address);
	const bnbBalance = getWeb3(network).utils.fromWei(amount, "ether");
	return bnbBalance;
}

async function getGasPrice(network) {
	const gasPriceNum = await getWeb3(network).eth.getGasPrice();
	return Number(gasPriceNum);
}

async function buildTx(network, from, to, amount, isMax = 0) {
	
	const tempweiAmount = getWeb3(network).utils.toWei(0.000001, "ether");
	const param = { from: from, to: to, value: tempweiAmount };
  const gasLimit = await getWeb3(network).eth.estimateGas(param, "latest", web3.ETH_DATA_FORMAT);
  
  const priorityGasPrice = await getGasPrice(network);
  
  const weiAmount = getWeb3(network).utils.toWei(amount, "ether");
  const chainId = await getWeb3(network).eth.getChainId();
  const tx = {
    from: from,
    to: to,
    value: weiAmount,
    gas: gasLimit,
    nonce: await getWeb3(network).eth.getTransactionCount(from, 'pending'),
    maxPriorityFeePerGas: priorityGasPrice.toString(),
    maxFeePerGas: priorityGasPrice.toString(),
    chainId: chainId,
    type: 0x2,
  };
  
  const gasFeeNum = BigInt(gasLimit) * (BigInt(priorityGasPrice))
  if (isMax == 1) { // max amount send
  	const newAmount = BigInt(weiAmount) - BigInt(gasFeeNum) - BigInt(10000);
  	tx.value = newAmount.toString();
  }
  const gasFee = getWeb3(network).utils.fromWei(gasFeeNum, "ether");
  return { transaction: tx, transactionFee:gasFee };
}

async function sendTx(network, transaction, privateKey) {
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

export default {
	getBalance,
	buildTx,
	sendTx,
	getGasPrice,
}