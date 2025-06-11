import { oklinkFetchGet, markSpentUtxo, oklinkFetchPost, unSupportTestnet, getUTXORecommendFeePerB } from '@src/util'
import { dogeWallet } from '@src/wallets'
import { TATUM_API_ENDPOINT, getTatumOption } from '@src/constants'

const usatoshi = 100000000
const chainShortName = 'DOGE'



export async function getBalance(network, address, cache = 30) {
  unSupportTestnet(network);
  const re = await fetch(`${TATUM_API_ENDPOINT}/v3/dogecoin/address/balance/${address}`, getTatumOption())
    .then(res => res.json())
	  .then(res => { return res; });
  return Number(re.incoming) + Number(re.incomingPending) - Number(re.outgoing) - Number(re.outgoingPending);
}

export async function getGasFeeList(network) {
  unSupportTestnet(network);
  return getUTXORecommendFeePerB('dogecoin', network)
}

async function estimateGasFee(transaction) {
  let signParams = {
    privateKey: '',
    data: transaction
  }
  let estFee = await dogeWallet.estimateFee(signParams)
  return estFee
}

async function getUtxos(address, amount) {
  const re = await fetch(`${TATUM_API_ENDPOINT}/v4/data/utxos?chain=doge-mainnet&address=${address}&totalValue=${amount}`, getTatumOption())
    .then(res => res.json())
	  .then(res => { return res; });
  return re.map(item => {
    return {
      txid: item.txHash,
      index: item.index,
      address,
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
    const amountDoge = Number((utxo.unspentAmount * usatoshi).toFixed())
    total += amountDoge
    utxoArr.push({
      txId: utxo.txid,
      amount: amountDoge,
      vOut: Number(utxo.index),
      address: utxo.address
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
  const utxos = await getUtxos(senderAddr, amount);
  const { total: totalSat, utxoArr: inputs } = convertUtxo(utxos)
  
  const dogeAmount = maxMode ? totalSat : Number((amount * usatoshi).toFixed(1))
  const outputs = [{ address: receiverAddr, amount: dogeAmount }]
  const transaction = {
    inputs,
    outputs,
    address: senderAddr,
    feePerB: Math.floor(feePerB),
  }
  const transactionFeeSat = await estimateGasFee(transaction)
  const transactionFee = transactionFeeSat / usatoshi

  let avaAmountSat = totalSat - transactionFeeSat
  if (avaAmountSat > dogeAmount) {
    avaAmountSat = dogeAmount
  } else {
    transaction.outputs[0].amount = avaAmountSat
  }
  const avaAmount = avaAmountSat / usatoshi

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
  let tx = await dogeWallet.signTransaction(signParams)
  let result = await broadcast(tx)
  if (result.success == true) {
    markSpentUtxo(network, utxos, 'doge')
  }
  return result;
}

async function broadcast(txHex) {
  try {
    const re = await fetch(`${TATUM_API_ENDPOINT}/v3/dogecoin/broadcast`, getTatumOption('POST', { txData: txHex }))
      .then(res => res.json())
      .then(res => { return res; });
    console.log(JSON.stringify(re));
    if (re.txId) {
      return { success: true, txid: re.txId };
    } else {
      return { success: false, errorMsg: re.message };
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