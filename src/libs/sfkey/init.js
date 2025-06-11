import SFKey from './sdk'
import { connectWebViewJavascriptBridge } from '@src/bridge'
import { parseClientParam, isFunction, noop, isArray, isValidNumber, isEmptyStr, handleError } from '@src/util'
import { invalidParamError, retCode, blockChainName } from '@src/constants'

const _LogTag = '[SFKey]:'

function generateMnemonic(data, callback) {
  const str = SFKey.generateMnemonic(data.num)
  callback({
    code: retCode.success,
    mnemonic: str
  });
}

function shardingMnemonic(data, callback) {
  try {
    const arr = SFKey.sharding(data.mnemonic, data.totalNum, data.requireNum)
    callback({
      code: retCode.success,
      shardings: arr
    });
  } catch (error) {
    console.error(_LogTag, error);
    callback({
      code: retCode.sharding,
      err: error.message
    })
  }
}

function recoveryMnemonic(data, callback) {
  if (!isArray(data.shardings)) {
    callback(invalidParamError);
  } else {
    const mnemonic = SFKey.shardRecovery(data.shardings);
    callback({
      code: retCode.success,
      mnemonic
    })
  }
}

function getAccountAddrs(data, callback) {
  if (!isValidNumber(data.index)) return callback(invalidParamError);
  SFKey.getAllAddr(data.mnemonic, data.index)
    .then(addObj => {
      callback({
        code: retCode.success,
        addressObj: addObj
      })
    })
    .catch(e => {
      callback({
        code: retCode.accountAddrs,
        err: e && e.message || e
      })
    })
}

async function getChainPrivateKey(data, callback) {
  if (isEmptyStr(data.mnemonic) || !isValidNumber(data.index)) return callback(invalidParamError);
  try {
    let key = '-1'
    switch (data.chain) {
      case blockChainName.bitcoin: {
        key = await SFKey.getBitcoinPrivateKey(data.network, data.mnemonic, data.index, data.segwitType)
        break;
      }
      case blockChainName.fractalBitcoin: {
        key = await SFKey.getBitcoinPrivateKey('mainnet', data.mnemonic, data.index, data.segwitType);
        break;
      }
      case blockChainName.bsc:
      case blockChainName.ethereum: {
        key = await SFKey.getEthereumPrivateKey(data.mnemonic, data.index)
        break;
      }
      case blockChainName.tron: {
        key = await SFKey.getTronPrivateKey(data.mnemonic, data.index)
        break
      }
      case blockChainName.flow: {
        key = await SFKey.getEthereumPrivateKey(data.mnemonic, data.index)
        break;
      }
      case blockChainName.evm: {
        key = await SFKey.getEthereumPrivateKey(data.mnemonic, data.index)
        break;
      }
      default:
      	key = await SFKey.getChainPrivateKey(data.chain, data.mnemonic, data.index)
        break;
    }
    if (key === '-1') {
      callback({
        code: retCode.unsupport,
        err: 'unsupport chain'
      })
    } else {
      callback({
        code: retCode.success,
        key
      })
    }
  } catch(e) {
    console.log(_LogTag, e);
    callback({
      code: retCode.addrPrivateKey,
      err: e.message
    })
  }
}

function toOriginPrivateKey(data, callback) {
  if (isEmptyStr(data.priKeyStr)) return callback(invalidParamError);
  const pri = SFKey.toOrigPrivateKey(data.priKeyStr)
  if (pri === 'unkonwn') {
    callback({
      code: retCode.unsupport,
      err: 'unsupport format'
    })
  } else {
    callback({
      code: retCode.success,
      data: pri
    })
  }
}

function getPublicKey(data, callback) {
  if (isEmptyStr(data.pwd)) return callback(invalidParamError);
  try {
    const pubKey = SFKey.getPublicKey(data.pwd)
    callback({
      code: retCode.success,
      data: pubKey
    })
  } catch(e) {
    console.error(_LogTag, e)
    callback({
      code: retCode.pwdToPubKey,
      err: handleError(e)
    })
  }
}

function verifyAddress(data, callback) {
  SFKey.verifyAddress(data.chain, data.network, data.address).then(isValid => {
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
  generateMnemonic,
  shardingMnemonic,
  recoveryMnemonic,
  getAccountAddrs,
  getChainPrivateKey,
  toOriginPrivateKey,
  getPublicKey,
  verifyAddress
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
})

export default {
  name: 'SFKey',
  version: '0.0.1',
}