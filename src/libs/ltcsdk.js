import { oklinkFetchGet, markSpentUtxo, wrapFetch, oklinkFetchPost, unSupportTestnet } from '@src/util'
import { ltcWallet } from '@src/wallets'
import { TATUM_API_ENDPOINT, getTatumOption } from '@src/constants'

const ulitoshi = 100000000
const chainShortName = 'LTC'

export async function getBalance(network, address, cache = 30) {
  unSupportTestnet(network);
  const re = await fetch(`${TATUM_API_ENDPOINT}/v3/litecoin/address/balance/${address}`, getTatumOption())
    .then(res => res.json())
    .then(res => { return res; });
  return Number(re.incoming) + Number(re.incomingPending) - Number(re.outgoing) - Number(re.outgoingPending);
}


export async function getGasFeeList(network) {
  unSupportTestnet(network);
  const mainnet_rpc_prefix = 'https://litecoinspace.org/api'
  return wrapFetch(mainnet_rpc_prefix + '/v1/fees/recommended').then(resData => {
    return resData
  })
}

async function estimateGasFee(transaction) {
  let signParams = {
    privateKey: '',
    data: transaction
  }
  let estFee = await ltcWallet.estimateFee(signParams)
  return estFee
}

async function getUtxos(address, amount) {
  const re = await fetch(`${TATUM_API_ENDPOINT}/v4/data/utxos?chain=litecoin&address=${address}&totalValue=${amount}`, getTatumOption())
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
    const amountLit = Number((utxo.unspentAmount * ulitoshi).toFixed())
    total += amountLit
    utxoArr.push({
      txId: utxo.txid,
      amount: amountLit,
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
  const utxos = await getUtxos(senderAddr, amount)
  const { total: totalSat, utxoArr: inputs } = convertUtxo(utxos)
  const ltcAmount = maxMode ? totalSat : Number((amount * ulitoshi).toFixed(1))
  const outputs = [{ address: receiverAddr, amount: ltcAmount }]
  const transaction = {
    inputs,
    outputs,
    address: senderAddr,
    feePerB: Math.floor(feePerB)
  }
  const transactionFeeSat = await estimateGasFee(transaction)
  const transactionFee = transactionFeeSat / ulitoshi

  let avaAmountSat = totalSat - transactionFeeSat
  if (avaAmountSat > ltcAmount) {
    avaAmountSat = ltcAmount
  } else {
    transaction.outputs[0].amount = avaAmountSat
  }
  const avaAmount = avaAmountSat / ulitoshi

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
  let tx = await ltcWallet.signTransaction(signParams)
  let result = await broadcast(tx)
  if (result.success == true) {
    markSpentUtxo(network, utxos, 'ltc')
  }
  return result;
}

async function broadcast(txHex) {
  try {
    const re = await fetch(`${TATUM_API_ENDPOINT}/v3/litecoin/broadcast`, getTatumOption('POST', { txData: txHex }))
      .then(res => res.json())
      .then(res => { return res; });
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