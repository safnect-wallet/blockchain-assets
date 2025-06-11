import { bitcore } from '@src/wallets';
import { SafServerBaseUrl } from '@src/constants';
import { toSafHttpToken } from '@src/util';

const mainnet = 'mainnet';

const main_endpoint_prefix = 'https://open-api.unisat.io';
const testnet4_endpoint_prefix = 'https://wallet-api-testnet4.unisat.io/v5';

function getPostHeaders() {
  return new Headers({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getApiKey()
  });
}

function getGetHeaders() {
  return new Headers({
    'Authorization': 'Bearer ' + getApiKey()
  });
}

const main_key_arr = [
];

let keyIndex = 0;
function getApiKey() {
  if (keyIndex >= main_key_arr.length) {
    keyIndex = 0;
  }
  return main_key_arr[keyIndex ++];
}
const usatoshi = 100000000;

async function getBalance(network, address) {
  if (network == mainnet) { // mainnet
	  let url = main_endpoint_prefix;
	  let header = getGetHeaders();
	  const response = await fetch(url + '/v1/indexer/address/' + address + '/balance', { method: 'GET', headers: header})
    const re = await response.json();
	  const obj = re.data;
    return (obj.satoshi + obj.pendingSatoshi) / usatoshi;
	} else { // testnet4
	  const response = await fetch(`${testnet4_endpoint_prefix}/address/balance?address=${address}`);
    const re = await response.json();
    if (re.code == 0) {
      const data = re.data;
      return parseFloat(data.amount);
    } else {
      return 0;
    }
	}
}

async function getGasFeeList(network) {
	const token = toSafHttpToken({ network });
	const option = { headers: { 'token': token } };
  return fetch(`${SafServerBaseUrl}/fetch-data/btc-fee-recomm?network=${network}`, option).then(re => {
    if (!re.ok) {
      throw new Error(`SafServer fetch error:${re.status}|${re.statusText}`)
    } else {
      return re.json();
    }
  }).then(re => {
    if (network != mainnet) {
      re.fastestFee = re.fastestFee * 1.2;
    }
    return re
  });
}


function convertUtxo(utxos) {
	if (!utxos || utxos.length == 0) {
		throw new Error(`No available UTXO`);
	}
	const utxoArr = [];
	let totalSatoshi = 0;
  utxos.forEach((utxo) => {
  	utxoArr.push({
			txId: utxo.txid,
			address: utxo.address,
			outputIndex: utxo.vout,
			satoshis: utxo.satoshi,
			script: utxo.scriptPk
		});
  	totalSatoshi += utxo.satoshi;
  });
  return { utxoArr, totalSatoshi };
}

async function getUtxos(network, address, amount = 0) {
	const token = toSafHttpToken({
		network,
		address,
		amount,
	});
	const option = { headers: { 'token': token } };
  const response = await fetch(`${SafServerBaseUrl}/bca/btc-utxo?network=${network}&address=${address}&amount=${amount}`, option);
  const re = await response.json();
  return re.data;
}

async function markSpentUtxo(network, utxos) {
  const param = {
		network: network,
		utxoJson: JSON.stringify(utxos),
	};
  const token = toSafHttpToken(param);
	const formData = new URLSearchParams();
	formData.append('utxoJson', param.utxoJson);
	const option = {
		method: 'POST', 
		headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8',
      'token': token
    },
	  body: formData
	};
  const response = await fetch(`${SafServerBaseUrl}/bca/btc-utxo-mark?network=${network}`, option);
  const re = await response.json();
}

async function buildTx(network, senderAddr, receiverAddr, amount, feePerB, enableRBF = 0) {
  amount = Number((amount * usatoshi).toFixed(1));
  const estbyt = 260;
	const estAmount = amount + parseInt(estbyt * feePerB);
  const utxos = await getUtxos(network, senderAddr, estAmount);
  const { utxoArr } = convertUtxo(utxos);
	const transaction = new bitcore.Transaction()
	  .from(utxoArr).to(receiverAddr, amount) // Add an output with the given amount of satoshis 
	  .feePerByte(feePerB).change(senderAddr);    // Sets up a change address where the rest of the funds will go
	
	if (enableRBF == 1) { // enable RBF
		transaction.enableRBF();
	}
	const transactionFee = transaction.getFee() / usatoshi;
	return { transaction, transactionFee, utxos };
}

async function sendTx(network, transaction, wif, utxos) {
  try {
    transaction.sign(wif);
    const txHex = transaction.serialize();
    const res = await broadcast(network, txHex);
    if (res.code === 0) {
      // mark spent utxo 
      markSpentUtxo(network, utxos);
      return { success: true, txid: res.data };
    } else {
      return { success: false, errorMsg: res.msg };
    }
  } catch (err) {
    return { success: false, errorMsg: err.message };
  }
}

async function broadcast(network, txHex) {
  let url;
	let options;
  if (network == mainnet) {
	  const unisatPrefix = main_endpoint_prefix;
	  const header = getPostHeaders();
	  url = `${unisatPrefix}/v1/indexer/local_pushtx`;
	  options = {
	    method: 'POST',
	    headers: header,
	    body: JSON.stringify({ txHex: txHex})
	  };
  } else { // testnet4
  	url = `${testnet4_endpoint_prefix}/tx/broadcast`;
	  options = {
	    method: 'POST',
	    headers: getPostHeaders(),
	    body: JSON.stringify({ rawtx: txHex})
	  };
  }
  return fetch(url,options).then(async (res) => {
    if (res.ok) {
      const contentType = res.headers.get('content-type');
      if (contentType.includes('json')) {
        return res.json();
      } else {
        return res.text();
      }
    } else {
      throw new Error(`broadcast error:${res.status}|${res.statusText}`)
    }
  }).then(async (data) => {
    return data;
  });
}

export default {
  getBalance,
  getGasFeeList,
  buildTx,
  sendTx,
};
