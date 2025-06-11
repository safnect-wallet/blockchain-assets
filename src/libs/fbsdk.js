import { SafServerBaseUrl } from '@src/constants';
import { bitcore, btcWallet } from '@src/wallets';

const mainnet = 'mainnet';

const endpoint_prefix = 'https://open-api-fractal-testnet.unisat.io';

const main_endpoint_prefix = 'https://open-api-fractal.unisat.io';

function getPostHeaders(network) {
  return new Headers({
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + getApiKey(network)
  });
}

function getGetHeaders(network) {
  return new Headers({
    'Authorization': 'Bearer ' + getApiKey(network)
  });
}

const usatoshi = 100000000;

const main_key_arr = [
];

const test_key_arr = [
];

let keyIndex = 0;
function getApiKey(network) {
  let keyArr = main_key_arr;
  if (network != mainnet) {
    keyArr = test_key_arr;
  }
  if (keyIndex >= keyArr.length) {
    keyIndex = 0;
  }
  return keyArr[keyIndex ++];
}

async function getBalance(network, address) {
  let url = main_endpoint_prefix;
  let header = getGetHeaders(network);
  if (network !== mainnet) {
    url = endpoint_prefix;
  }
  const re = await fetch(url + '/v1/indexer/address/' + address + '/balance', { method: 'GET', headers: header}).then(response => {
    if (!response.ok) {
      throw new Error(`${response.status}|${response.statusText}`);
    } else {
      return response.json()
    }
  });
  const obj = re.data;
  return (obj.satoshi + obj.pendingSatoshi) / usatoshi;
}

async function getUtxos(network, address, amount = 0) {
	const option = {  };
  const response = await fetch(`${SafServerBaseUrl}/bca/fb-utxo?network=${network}&address=${address}&amount=${amount}`, option);
  const re = await response.json();
  return re.data;
}

async function getGasFeeList(network) {
	const option = {  };
  return fetch(`${SafServerBaseUrl}/fetch-data/fb-fee-recomm?network=${network}`, option)
  .then(re => {
    if (re.ok) {
      return re.json();
    } else {
      throw new Error(`SafServer fetch Error:${re.status}|${re.statusText}`)
    }
  }).then(re => {
    if (network != mainnet) {
      re.fastestFee = re.fastestFee * 1.2;
    }
    return re
  })
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

async function markSpentUtxo(network, utxos) {
  const param = {
		network,
		utxoJson: JSON.stringify(utxos),
	};
	const formData = new URLSearchParams();
	formData.append('utxoJson', param.utxoJson);
	const option = {
		method: 'POST', 
		headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
	  body: formData
	};
  const response = await fetch(`${SafServerBaseUrl}/bca/fb-utxo-mark?network=${network}`, option);
  const re = await response.json();
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
  let unisatPrefix = main_endpoint_prefix;
  let header = getPostHeaders(network);;
  if (network != mainnet) {
	  unisatPrefix = endpoint_prefix;
  };
  const url = `${unisatPrefix}/v1/indexer/local_pushtx`;
  const options = {
    method: 'POST',
    headers: header,
    body: JSON.stringify({ txHex: txHex})
  };
  return fetch(url, options)
    .then(res => res.json())
	  .then(res => { return res });
}

export default {
  getBalance,
  getGasFeeList,
  buildTx,
  sendTx,
}
