import { markSpentUtxo, unSupportTestnet, wrapFetch, fetchSafServer } from '@src/util'
import { bsvWallet } from '@src/wallets'

const usatoshi = 100000000
const enpointApiPrefix = 'https://api.whatsonchain.com/v1/bsv/main'

export async function getBalance(network, address) {
  unSupportTestnet(network);
  return wrapFetch(`${enpointApiPrefix}/address/${address}/balance`).then(data => {
    return `${(data.confirmed + data.unconfirmed) / usatoshi}`
  })
}

export async function getGasFeeList(network) {
  unSupportTestnet(network);
  return fetchSafServer({
    url: 'bca/fees',
    paramObj: {
      chain: 'bsv',
      network
    }
  }).then(res => {
    const obj = res || {}
    return {
      fastestFee: +obj.fast,
      minimumFee: +obj.standard,
      economyFee: +obj.slow,
    }
  })
}

async function estimateGasFee(transaction) {
  let signParams = {
    privateKey: '',
    data: transaction
  }
  let estFee = await bsvWallet.estimateFee(signParams)
  return estFee
}

async function getUtxos(address) {

  return wrapFetch(`${enpointApiPrefix}/address/${address}/unspent/all`).then(res => {
    const list = res.result || []
    console.info('[getUtxo]unspent/all:', list)
    return list.filter(obj => obj.isSpentInMempoolTx === false)
  })
}

function convertUtxo(utxos) {
  if (!utxos || utxos.length === 0) {
    throw new Error('No available UTXO')
  }
  let total = 0
  const utxoArr = []
  utxos.forEach(utxo => {
    let amount = utxo.value
    total += amount
    utxoArr.push({
      txId: utxo.tx_hash,
      amount,
      vOut: utxo.tx_pos
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
  const bsvAmount = maxMode ? totalSat : Number((amount * usatoshi).toFixed(1))
  const outputs = [{ address: receiverAddr, amount: bsvAmount }]
  const transaction = {
    inputs,
    outputs,
    address: senderAddr,
    feePerB: Math.floor(feePerB),
  }
  const transactionFeeSat = await estimateGasFee(transaction)
  const transactionFee = transactionFeeSat / usatoshi

  let avaAmountSat = totalSat - transactionFeeSat
  if (avaAmountSat > bsvAmount) {
    avaAmountSat = bsvAmount
  } else {
    transaction.outputs[0].amount = avaAmountSat
  }
  const avaAmount = avaAmountSat / usatoshi

  return {
    transaction,
    transactionFee,
    utxos,
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
  let tx = await bsvWallet.signTransaction(signParams)
  let result = await broadcast(tx)
  if (result) {
    markSpentUtxo(network, utxos, 'bsv')
    return { success: true, txid: result };
  }
  return { success: false, errorMsg: result };
}

async function broadcast(txHex) {
  return wrapFetch(`${enpointApiPrefix}/tx/raw`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ 'txhex': txHex })
  })
}

export default {
  getBalance,
  getGasFeeList,
  buildTx,
  sendTx
}