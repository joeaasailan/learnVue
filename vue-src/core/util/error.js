/* @flow */

import config from '../config'
import { warn } from './debug'
import { inBrowser } from './env'
/**
 * @description 处理错误函数
 * @export
 * @param {Error} err 
 * @param {*} vm 
 * @param {string} info 
 */
export function handleError (err: Error, vm: any, info: string) {
  if (config.errorHandler) {
    config.errorHandler.call(null, err, vm, info)
  } else {
    if (process.env.NODE_ENV !== 'production') {
      warn(`Error in ${info}: "${err.toString()}"`, vm)
    }
    /* istanbul ignore else */
    if (inBrowser && typeof console !== 'undefined') {
      console.error(err)
    } else {
      throw err
    }
  }
}
