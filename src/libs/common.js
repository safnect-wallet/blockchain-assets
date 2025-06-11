import { connectWebViewJavascriptBridge } from '@src/bridge'
import SFKey from './sfkey/sdk'
import Bsc from './bscsdk'
import Cardano from './cardanosdk';
import Aptos from './aptossdk';
import Bch from './bchsdk';
import Bell from './bellsdk';
import Bsv from './bsvsdk';
import Cosmos from './cosmossdk';
import Doge from './dogesdk';
import Evm from './evmsdk';
import Flow from './flowsdk';
import Kaspa from './kaspasdk';
import Ltc from './ltcsdk';
import Near from './nearsdk';
import Sol from './solsdk';
import Stacks from './stackssdk';
import Starknet from './starknetsdk';
import Stellar from './stellarsdk';
import Sui from './suisdk';
import Ton from './tonsdk';
import Xrp from './xrpsdk';
import Eos from './eossdk';
import Wax from './waxsdk';
import Polkadot from './polkadotsdk';
import Ethereum from './ethsdk';
import Bitcoin from './btcsdk';
import FractalBitcoin from './fbsdk';
import Tron from './tronsdk';
import { parseClientParam, isFunction, noop, isEmptyStr, handleError, isObject } from '@src/util'
import { invalidParamError, retCode } from '@src/constants'

const _LOGTAG = '[Common]:'

function getChainObj(code) {
  switch (code) {
    case 'BSC': return Bsc;
    case 'CARDANO': return Cardano;
    case 'APTOS': return Aptos;
    case 'BCH': return Bch;
    case 'BELL': return Bell;
    case 'BSV': return Bsv;
    case 'COSMOS': return Cosmos;
    case 'DOGE': return Doge;
    case 'FLOW': return Flow;
    case 'KASPA': return Kaspa;
    case 'LTC': return Ltc;
    case 'NEAR': return Near;
    case 'SOLANA': return Sol;
    case 'STACKS': return Stacks;
    case 'STARKNET': return Starknet;
    case 'STELLAR': return Stellar;
    case 'SUI': return Sui;
    case 'TON': return Ton;
    case 'XRP': return Xrp;
    case 'EOS': return Eos;
    case 'WAX': return Wax;
    case 'POLKADOT': return Polkadot;
    case 'bitcoin': return Bitcoin;
    case 'ethereum': return Ethereum;
    case 'fractalBitcoin': return FractalBitcoin;
    case 'tron': return Tron;
    default: return null;
  }
} 

function isEvm(code) {
	return code == 'EVM';
}

function getCommonBalance(data, callback) {
  if (isEmptyStr(data.address) || isEmptyStr(data.code)) return callback(invalidParamError);
  const chainObj = getChainObj(data.code);
  if (!isEvm(data.code)) {
  	chainObj.getBalance(data.network, data.address, data.cache).then(res => {
  		callback({ code: retCode.success, data: Number(res) });
    }).catch(e => {
    	callback({ code: retCode.balance, data: handleError(e) })
    })
  } else {
  	Evm.getBalance(data.rpcUrl, data.address).then(res => {
      callback({ code: retCode.success, data: Number(res) });
    }).catch(e => {
      callback({ code: retCode.balance, data: handleError(e) })
    })
  }
}

async function _buildTx(data) {
  if (isEmptyStr(data.senderAddr) || isEmptyStr(data.receiverAddr)) return {
    fail: true,
    err: invalidParamError.err
  };
  const chainObj = getChainObj(data.code);
  try {
  	let res;
  	if (!isEvm(data.code)) {
  		res = await chainObj.buildTx(data.network, data.senderAddr, data.receiverAddr, data.amount, data.feePerB, data.isMax);
  	} else {
  		res = await Evm.buildTx(data.rpcUrl, data.senderAddr, data.receiverAddr, data.amount, data.isMax);
  	}
    if (data.isMax && data.isMax == 1) {
      if (!data.maxReserveAmount) {
        data.maxReserveAmount = 0.0;
      }
      data.amount -= (Number(res.transactionFee) + data.maxReserveAmount);
      data.isMax = 0;
      return await _buildTx(data);
    } 
    return {
      fail: false,
      transaction: res.transaction,
      transactionFee: res.transactionFee
    }
  } catch(e) {
    console.error(_LOGTAG, e)
    return {
      fail: true,
      err: e
    }
  }
}

async function buildCommonTx(data, callback) {
	let buildRet = await _buildTx(data);
  if (buildRet.fail) {
    callback({
      code: retCode.buildTx,
      err: handleError(buildRet.err)
    })
    return ;
  }
  callback({
    code: retCode.success,
    transaction: {},
    transactionFee: buildRet.transactionFee
  })
}

async function _sendTx(data, callback) {
  try {
    const chainObj = getChainObj(data.code);
    let res;
  	if (!isEvm(data.code)) {
  		res = await chainObj.sendTx(data.network, data.transaction, data.priKey, data.utxos);
  	} else {
  		res = await Evm.sendTx(data.rpcUrl, data.transaction, data.priKey);
  	}
    if (res && res.success && res.success === true) {
      callback({ code: retCode.success, data: res.txid });
    } else {
      callback({ code: retCode.sendTx, err: res.errorMsg });
    }
  } catch(e) {
    console.error(_LOGTAG, e)
    callback({
      code: retCode.sendTx,
      err: handleError(e)
    })
  }
}

async function sendCommonTx(data, callback) {
  if (isEmptyStr(data.priKey)) return callback(invalidParamError);
  let buildRet;
  if (data.contractAddress) { // Token transafer
  	buildRet = await _buildTokenTx(data);
  } else { // Native coin transafer
  	buildRet = await _buildTx(data);
  }
  if (buildRet.fail) return callback({
    code: retCode.buildTx,
    err: handleError(buildRet.err)
  });
  _sendTx({
    network: data.network,
    priKey: data.priKey,
    transaction: buildRet.transaction,
    code: data.code,
    rpcUrl: data.rpcUrl,
    utxos: buildRet.utxos,
  }, callback)
}

async function _buildTokenTx(data) {
  if (isEmptyStr(data.senderAddr) || isEmptyStr(data.receiverAddr) || isEmptyStr(data.contractAddress)) return {
    fail: true,
    err: invalidParamError.err
  };
  try {
    const chainObj = getChainObj(data.code);
    let res;
  	if (!isEvm(data.code)) {
  		res = await chainObj.buildTokenTx(data.network, data.senderAddr, data.receiverAddr, 
        data.amount, data.contractAddress, data.tokenType, data.decimals);
  	} else {
  		res = await Evm.buildTokenTx(data.rpcUrl, data.senderAddr, data.receiverAddr, data.amount, data.contractAddress);
  	}
    return {
      fail: false,
      transaction: res.transaction,
      transactionFee: res.transactionFee
    }
  } catch(e) {
    console.error(_LOGTAG, e)
    return {
      fail: true,
      err: e
    }
  }
}

async function buildCommonTokenTx(data, callback) {
  const buildRet = await _buildTokenTx(data)
  if (buildRet.fail) {
    callback({
      code: retCode.buildTx,
      err: handleError(buildRet.err)
    })
    return ;
  }
  callback({
    code: retCode.success,
    transaction: {},
    transactionFee: buildRet.transactionFee
  })
}

async function sendCommonTokenTx(data, callback) {
  if (isEmptyStr(data.priKey)) return callback(invalidParamError);
  const buildRet = await _buildTokenTx(data)
  if (buildRet.fail) return callback({
    code: retCode.buildTx,
    err: handleError(buildRet.err)
  });
  _sendTx({
    network: data.network,
    priKey: data.priKey,
    transaction: buildRet.transaction,
    code: data.code,
    rpcUrl: data.rpcUrl
  }, callback)
}

async function getCommonRecommFee(data, callback) {
	if (isEmptyStr(data.code) || isEmptyStr(data.network)) return callback({
    fail: true, err: invalidParamError.err
  });
  const chainObj = getChainObj(data.code);
  try {
  	const re = await chainObj.getGasFeeList(data.network);
    callback({
      code: retCode.success,
      data: re
    });
  } catch (e) {
  	console.error(_LOGTAG, e)
    callback({
      code: retCode.feeList,
      err: handleError(e)
    })
  }
}

async function getCommonTokenBalance(data, callback) {
	if (isEmptyStr(data.code) || isEmptyStr(data.network) || isEmptyStr(data.address)) return callback({
    fail: true, err: invalidParamError.err
  });
  const chainObj = getChainObj(data.code);
  try {
  	let re;
  	if (!isEvm(data.code)) {
  		re = await chainObj.getTokenBalance(data.network, data.address, data.tokenContractAddress, data.cache);
  	} else {
  		re = await Evm.getTokenBalance(data.chainId, data.restApi, data.address);
  	}
    callback({
      code: retCode.success,
      data: re
    });
  } catch (e) {
  	console.error(_LOGTAG, e)
    callback({
      code: retCode.tokenBalance,
      err: handleError(e)
    })
  }
}

async function deployCommonAccount(data, callback) {
	if (isEmptyStr(data.code) || isEmptyStr(data.network)) return callback({
    fail: true, err: invalidParamError.err
  });
  const chainObj = getChainObj(data.code);
  try {
  	const re = await chainObj.deployAccount(data);
    callback({
      code: retCode.success,
      data: re
    });
  } catch (e) {
  	console.error(_LOGTAG, e)
    callback({
      code: retCode.deployAccount,
      err: handleError(e)
    })
  }
}

async function verifyCommonAddress(data, callback) {
  SFKey.verifyAddress2(data.code, data.network, data.address).then(isValid => {
      callback({
        code: retCode.success,
        data: isValid
      })
    }).catch(e => {
      console.error(_LogTag, e)
      callback({
        code: retCode.verifyAddr,
        err: handleError(e)
      })
    })
}

const fnHandlerMap = {
  getCommonBalance, buildCommonTx, buildCommonTokenTx, sendCommonTx, sendCommonTokenTx, 
  getCommonRecommFee, getCommonTokenBalance, deployCommonAccount, verifyCommonAddress
}

connectWebViewJavascriptBridge(function(bridge) {
  Object.keys(fnHandlerMap).forEach(fnName => {
    bridge.registerHandler(fnName, (data, responseCallback) => {
      const { valid, value } = parseClientParam(data);
      if (!responseCallback || !isFunction(responseCallback)) {
        responseCallback = noop;
      }
      if (!valid) {
        responseCallback(invalidParamError);
      } else {
        fnHandlerMap[fnName](value, responseCallback);
      }
    })
  })
});

export default {
  name: 'Common',
  version: '0.0.1',
}