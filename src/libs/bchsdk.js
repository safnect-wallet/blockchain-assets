import { oklinkFetchGet, markSpentUtxo, oklinkFetchPost, unSupportTestnet, getUTXORecommendFeePerB } from '@src/util'
import { bchWallet } from '@src/wallets'

const FULLSTACK_API_ENDPOINT = 'https://api.fullstack.cash';

const usatoshi = 100000000
const chainShortName = 'BCH'

export async function getBalance(network, address, cache = 30) {
  unSupportTestnet(network);
  const re = await fetch(`${FULLSTACK_API_ENDPOINT}/v5/electrumx/balance/${address}`)
    .then(res => res.json())
	  .then(res => { return res; });
  return (re.balance.confirmed + re.balance.unconfirmed) / usatoshi;
}

export async function getGasFeeList(network) {
  unSupportTestnet(network);
  return getUTXORecommendFeePerB('bitcoin-cash', network)
}

async function estimateGasFee(transaction) {
  let signParams = {
    privateKey: '',
    data: transaction
  }
  let estFee = await bchWallet.estimateFee(signParams)
  return estFee
}

async function getUtxos(address) {
  const re = await fetch(`${FULLSTACK_API_ENDPOINT}/v5/electrumx/utxos/${address}`)
    .then(res => res.json())
	  .then(res => { return res; });
  return re.utxos.map(item => {
    return {
      txid: item.tx_hash,
      index: item.tx_pos,
      unspentAmount: item.value
    };
  });
}

function convertUtxo(utxos) {
  if (!utxos || utxos.length === 0) {
    throw new Error('No available UTXO')
  }
  let total = 0
  const utxoArr = []
  utxos.forEach(utxo => {
    const amountBch = utxo.unspentAmount;
    total += amountBch
    utxoArr.push({
      txId: utxo.txid,
      amount: amountBch,
      vOut: +utxo.index
    })
  })
  return { utxoArr, total }
}


export async function buildTx(
  network,
  senderAddr,
  receiverAddr,
  amount,
  feePerB,
  isMax = 0
) {
  unSupportTestnet(network);
  const maxMode = isMax === 1
  const utxos = await getUtxos(senderAddr)
  const { total: totalSat, utxoArr: inputs } = convertUtxo(utxos)
  const bchAmount = maxMode ? totalSat : Number((amount * usatoshi).toFixed(1))
  const outputs = [{ address: receiverAddr, amount: bchAmount }]
  const transaction = {
    inputs,
    outputs,
    address: senderAddr,
    feePerB: Math.floor(feePerB),
  }
  const transactionFeeSat = await estimateGasFee(transaction)
  const transactionFee = transactionFeeSat / usatoshi

  let avaAmountSat = totalSat - transactionFeeSat
  if (avaAmountSat > bchAmount) {
    avaAmountSat = bchAmount
  } else {
    transaction.outputs[0].amount = avaAmountSat
  }
  const avaAmount = avaAmountSat / usatoshi;
  return {
    transaction,
    transactionFee,
    utxos: inputs,
    avaAmount
  }
}

export async function sendTx(
  network,
  transaction,
  wif,
  utxos,
) {
  unSupportTestnet(network);
  const signParams = { privateKey: wif, data: transaction }
  let tx = await bchWallet.signTransaction(signParams)
  let result = await broadcast(tx)
  if (result.success == true) {
    markSpentUtxo(network, utxos, 'bch')
  }
  return result;
}

async function broadcast(txHex) {
  const option = {
		method: 'POST', 
		headers: { 'Content-Type': 'application/json' },
	  body: JSON.stringify({ txHex })
	};
  try {
    const re = await fetch(`${FULLSTACK_API_ENDPOINT}/v5/electrumx/tx/broadcast`, option)
      .then(res => res.json())
      .then(res => { return res; });
    if (re.success == true) {
      return { success: true, txid: re.txid };
    } else {
      return { success: false, errorMsg: re.error.error };
    }
  } catch (err) {
    return { success: false, errorMsg: err.message };
  }
  
}

export default {
  getBalance,
  getGasFeeList,
  buildTx,
  sendTx
}