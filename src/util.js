import CryptoJsSHA1 from 'crypto-js/sha1'
import { SafServerBaseUrl, unsupportNetworkError, networkType } from './constants'

export const LogTag = '[Safnect assets]'

export function noop() {}

export function isFunction(val) {
  return typeof val === 'function'
}

export function isObject(val) {
  if (val === null || val === undefined) return false;
  return Object.prototype.toString.call(val) === '[object Object]';
}

export function notEmptyObject(val) {
  if (!isObject(val)) return false
  for (const k in val) {
    if (val.hasOwnProperty(k)) return true
  }
  return false
}

export function isArray (val) {
  return Object.prototype.toString.call(val) === '[object Array]'
}

export function isValidNumber (val) {
  return /^(0|[1-9][0-9]*)$/.test(val)
}

export function isNullity (val) {
  return val === null || val === undefined
}

export function isEmptyStr (val) {
  return val === null || val === undefined || (typeof val === 'string' && val.trim().length === 0)
}

export function parseClientParam(param) {
  if (param === undefined || param === null) return {
    valid: true,
    value: null
  }
  try {
    return {
      valid: true,
      value: JSON.parse(param)
    };
  } catch(e) {
    console.error(`${LogTag}invalid client param:`, param);
    return { valid: false };
  }
}

export function handleError (err) {
  console.log(JSON.stringify(err.stack));
  if (err === null || err === undefined) return '';
  if (err instanceof Error) {
    let reason = ''
    if (!!err.reason) {
      reason = `|${err.reason}`
    }
    return err.message + reason
  }
  if (typeof err === 'string') return err;
  return JSON.stringify(err);
}

export function formatError(error) {
  if (error instanceof Error && error.stack) {
      const stackLines = error.stack.split('\n');
      return stackLines.map(line => line.trim()).join('\n');
  } else {
      return String(error);
  }
}

export function handleErrorToCallback (orgErr, code, callback) {
  if (orgErr.code && typeof orgErr.err === 'string') {
    callback({
      code: orgErr.code,
      err: orgErr.err
    })
  } else {
    callback({
      code,
      err: handleError(orgErr)
    })
  }
}

export async function fetchSafServer (config) {
  let url = config.url
  if ((!config.method || config.method.toUpperCase() === 'GET') && config.paramObj && isObject(config.paramObj)) {
    const str = Object.keys(config.paramObj).map(k => `${k}=${config.paramObj[k]}`).join('&')
    if (str) {
      url = `${url}?${str}`
    }
  }
  return fetch(`/${url}`, {
    method: config.method || 'GET',
  }).then(resp => {
    if (!resp.ok) {
      throw new Error(`SafServer fetch Error:${resp.status}|${resp.statusText}`)
    } else {
      return resp.json()
    }
  }).then(resData => {
    if (resData.code === 200) {
      return resData.data
    } else {
      throw new Error(`SafServer response ErrorCode:${resData.code}|${resData.msg}`)
    }
  })
}

export async function oklinkFetchGet (paramObj) {
  let paramStr = ''
  if (isObject(paramObj)) {
    paramStr = Object.keys(paramObj).map(k => (`${k}=${paramObj[k]}`)).join('&')
  }
  const url = `/bca/get${!!paramStr ? '?' : ''}${paramStr}`
  const options = {
  }

  return fetch(url, options).then(resp => {
    if (!resp.ok) {
      throw new Error(`common fetch get Error:${resp.status}|${resp.statusText}`)
    } else {
      return resp.json()
    }
  }).then(resData => {
    if (resData.code === 200) {
      return resData.data
    } else {
      throw new Error(`common fetch response ErrorCode:${resData.code}|${resData.msg}`)
    }
  })
}

export async function oklinkFetchPost (paramObj) {
  const url = `/bca/post`
  const formData = new URLSearchParams(paramObj || {})
  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
    },
    body: formData
  }
  return fetch(url, options).then(resp => {
    if (!resp.ok) {
      throw new Error(`fetch post Error:${resp.status}|${resp.statusText}`)
    } else {
      return resp.json()
    }
  }).then(resData => {
    if (resData.code === 200) {
      return resData.data
    } else {
      throw new Error(`fetch post responseError:${resData.code}|${resData.msg}`)
    }
  })
}

export async function wrapFetch (url, options) {
  return fetch(url, options || {}).then(resp => {
    if (!resp.ok) {
      throw new Error(`fetch error:${resp.status}|${resp.statusText}`)
    } else {
      const contentType = resp.headers.get('content-type')
      if (contentType.includes('json')) {
        return resp.json()
      } else {
        return resp.text()
      }
    }
  })
}

export function checkNetwork (unsupport, param) {
  if (unsupport && unsupport === param) {
    throw unsupportNetworkError;
  } else {
    return true
  }
}


export function unSupportTestnet (network) {
  return checkNetwork(networkType.test, network)
}

function feeToSat (val) {
  if (typeof val === 'number') {
    val = val + ''
  }
  const arr = val.trim().split('.')
  if (arr.length === 2) {
    let part1 = arr[0] || ''
    if (part1 === '0') {
      part1 = ''
    }
    let part2 = arr[1] || ''
    if (part2.length < 8) {
      part2 += '0'.repeat(8 - part2.length)
    } else if (part2.length > 8) {
      let p2Arr = part2.split('')
      p2Arr.splice(8, 0, '.')
      part2 = p2Arr.join('')
    }
    if (part1 === '') {
      part2 = part2.replace(/^0*/, '')
      if (part2[0] === '.') {
        part2 = '0' + part2
      }
    }
    return Number(part1 + part2)
  }
  return Number(val)
}

export async function getUTXORecommendFeePerB(chain, network, toInt) {
  return fetchSafServer({
    url: 'bca/fees',
    paramObj: {
      chain,
      network
    }
  }).then(data => {
    const feeObj = {
      fastestFee: data.fast, 
      minimumFee: data.standard,
      economyFee: data.slow,
    }
    Object.keys(feeObj).forEach(k => {
      const val = feeToSat(feeObj[k])
      if (isNaN(val)) {
        throw 'invalid recommended fee return'
      }
      feeObj[k] = toInt !== false ? Math.floor(val) : val
    })
    return feeObj
  })
}