import { solSdk, solWallet, okxcry } from '@src/wallets';
import { SafServerBaseUrl, networkType, getMoralisKey } from '@src/constants';
import { wrapFetch, toSafHttpToken } from '@src/util'

const solunit = 1_000_000_000;

const sol_programId = 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA';
const sol_programId_2022 = 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb';

const TOKEN_API_ENDPOINT = 'https://solana-gateway.moralis.io';

async function _solFetch(url, options) {
  return wrapFetch(url, options).then(res => {
    if (res.data.error) {
      const error = res.data.error
      throw new Error(`${error.code}|${error.message}`)
    } else {
      return res
    }
  })
}

function getOption(network, method, param, type) {
	const fetchParam = {
		chain: 'SOLANA',
		network,
		method
	};
	const formData = new URLSearchParams();
	formData.append('chain', fetchParam.chain);
	formData.append('network', network);
	formData.append('method', method);
	if (param) {
		formData.append('param', param);
		formData.append('type', type);
		fetchParam.param = param;
		fetchParam.type = type;
	}
	const token = toSafHttpToken(fetchParam)
	const option = {
		method: 'POST', 
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
			'token': token
		},
	  body: formData
	};
	return option;
}

async function getBalance(network, address) {
	const option = getOption(network, 'getBalance', address, 'String');
	const val = await _solFetch(`${SafServerBaseUrl}/bca/rpc-api`, option)
	  .then(res => { return res.data.result.value; });
	return val / solunit;
}

async function getTokenAccountsByOwner(network, address, programId, type) {
	const paramArr = [ address, { "programId": programId }, { "encoding": "jsonParsed" } ];
	const option = getOption(network, 'getTokenAccountsByOwner', JSON.stringify(paramArr) , 'Array');
	const val = await _solFetch(`${SafServerBaseUrl}/bca/rpc-api`, option)
	  .then(res => { return res.data.result.value; });
	const arr = [];
	val.forEach(da => {
		arr.push({
  		balance: da.account.data.parsed.info.tokenAmount.uiAmount,
  		symbol: '',
  		contractAddress: da.account.data.parsed.info.mint,
  		tokenType: type,
  		decimals: da.account.data.parsed.info.tokenAmount.decimals,
  		icon: '',
  		name: ''
  	});
	});
	return arr;
}

function getNetworkLabel(network) {
  if (network != networkType.main) {
    return 'devnet';
  }
  return networkType.main;
}

async function getTokenBalance(network, address) {
	const networkLabel = getNetworkLabel(network);
	const option = { headers: { 'X-API-Key': getMoralisKey() } };
	const re = await fetch(`${TOKEN_API_ENDPOINT}/account/${networkLabel}/${address}/tokens`, option)
		.then(res => res.json())
		.then(res => { return res; });
	const arr = [];
	if (re.message) {
		return new Error(re.message);
	}
	re.forEach(da => {
		arr.push({
			balance: Number(da.amount),
			symbol: da.symbol,
			contractAddress: da.mint,
			tokenType: 'token2022',
			decimals: da.decimals,
			icon: da.logo,
			name: da.name
		});
	});
	return arr;
}

async function getLatestBlock(network) {
	const option = getOption(network, 'getLatestBlockhash');
	const val = await _solFetch(`${SafServerBaseUrl}/bca/rpc-api`, option)
	  .then(res => { return res.data.result.value; });
	return val;
}

async function getRecentFee(network) {
	const option = getOption(network, 'getRecentPrioritizationFees');
	return await _solFetch(`${SafServerBaseUrl}/bca/rpc-api`, option)
	  .then(res => { return res.data.result; });
}

async function getFeeForMessage(network, rawMsg) {
	const paramArr = [ rawMsg, { "commitment": 'processed' } ];
	const option = getOption(network, 'getFeeForMessage', JSON.stringify(paramArr) , 'Array');
	const val = await _solFetch(`${SafServerBaseUrl}/bca/rpc-api`, option)
	  .then(res => { return res.data.result.value; });
	return val;
}

async function getBaseFee(network, from, blockhash) {
	const re = solSdk.api.createRawTransaction(from, blockhash);
	const msgBuf = re.serializeMessage();
	const base64Msg = okxcry.base.toBase64(msgBuf);
	const feeVal = await getFeeForMessage(network, base64Msg);
	return feeVal;
}

async function buildTx(network, from, to, solAmount) { 
	const amount = Number((solAmount * solunit).toFixed(1));
	const latestBlock = await getLatestBlock(network);
	const data = {
		type: "transfer",
		payer: from,
		blockHash: latestBlock.blockhash,
		from: from,
		to: to,
		amount: amount,
		computeUnitLimit: 140000,
		computeUnitPrice: 10
	};
	const feeVal = await getBaseFee(network, from, latestBlock.blockhash);
	const transactionFee = (feeVal + 2) / solunit;
	return { transaction: data, transactionFee };
}

async function getCreateAssociatedAddress(network, to, tokenContractAddress, programId) {
	const tokenArr = await getTokenAccountsByOwner(network, to, programId);
	let createAssociatedAddress = true;
	for (var i=0; i<tokenArr.length; i++) {
		const da = tokenArr[i];
		if (da.contractAddress == tokenContractAddress) {
			createAssociatedAddress = false;
			break;
		}
	};
	return createAssociatedAddress;
}

async function buildTokenTx(network, from, to, amount, tokenContractAddress, tokenType, decimals) { 
	if (tokenType == 'token2022') {
		return await buildToken2022Tx(network, from, to, amount, tokenContractAddress, decimals);
	} else {
		const latestBlock = await getLatestBlock(network);
		const createAssociatedAddress = await getCreateAssociatedAddress(network, to, tokenContractAddress, sol_programId);
		const data = {
			type: "tokenTransfer",
	    payer: from,
	    blockHash: latestBlock.blockhash,
	    from: from,
	    to: to,
	    amount: amount,
	    mint: tokenContractAddress,
	    createAssociatedAddress: createAssociatedAddress,
	    token2022: false,
		};
		const feeVal = await getBaseFee(network, from, latestBlock.blockhash);
		const transactionFee = (feeVal + 2) / solunit;
		return { transaction: data, transactionFee };
	}
	
}

async function buildToken2022Tx(network, from, to, amount, tokenContractAddress, decimals) { 
	const latestBlock = await getLatestBlock(network);
	const createAssociatedAddress = await getCreateAssociatedAddress(network, to, tokenContractAddress, sol_programId_2022);
	const data = {
		type: "tokenTransfer",
		payer: from,
		blockHash: latestBlock.blockhash,
		from: from,
		to: to,
		amount: amount,
		mint: tokenContractAddress,
		createAssociatedAddress: createAssociatedAddress,
		token2022: true,
		decimal: decimals,
		computeUnitLimit: 140000,
		computeUnitPrice: 10
	};
	
	const feeVal = await getBaseFee(network, from, latestBlock.blockhash);
	const transactionFee = (feeVal + 2) / solunit;
	return { transaction: data, transactionFee };
}

async function sendTx(network, transaction, privateKey) {
	let params = { privateKey: privateKey, data: transaction };
	let tx = await solWallet.signTransaction(params);
	const option = getOption(network, 'sendTransaction', tx, 'String');
	const val = await _solFetch(`${SafServerBaseUrl}/bca/rpc-api`, option)
	  .then(res => {
      return { success: true, txid: res.data.result };
    }).catch(error => {
      return { success: false, errorMsg: error.message };
    });
	return val
}

export default {
	getBalance,
	buildTx,
	sendTx,
	buildTokenTx,
	getTokenBalance,
	buildToken2022Tx,
}