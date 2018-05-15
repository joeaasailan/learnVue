/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants'
import builtInComponents from '../components/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

/**
 * @description 向Vue中添加一些全局api接口
 * @export
 * @param {GlobalAPI} Vue 
 */
export function initGlobalAPI (Vue: GlobalAPI) {
  // config
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  Object.defineProperty(Vue, 'config', configDef)

  // exposed util methods.
  // NOTE: these are not considered part of the public API - avoid relying on
  // them unless you are aware of the risk.
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  Vue.set = set
  Vue.delete = del
  Vue.nextTick = nextTick

  /**
   * 添加Vue.options = {
   *  component: Object.create(null),
   *  directive: Object.create(null),
   *  filter: Object.create(null)
   * }
   * 在new Vue(options)的时候，会自动将Vue.options与options合并，这样可以确保合并出来的options.component、
   * options.directive、options.filter都是有值的。
   */
  Vue.options = Object.create(null)
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // this is used to identify the "base" constructor to extend all plain-object
  // components with in Weex's multi-instance scenarios.
  /*_base被用来标识基本构造函数（也就是Vue），以便在多场景下添加组件扩展*/
  Vue.options._base = Vue

  extend(Vue.options.components, builtInComponents)
  // 定义Vue.use方法。通常用来安装插件
  initUse(Vue)
  // 定义Vue.mixin方法。
  initMixin(Vue)
  // 定义Vue.extend方法
  initExtend(Vue)
  // 定义Vue.component方法、定义Vue.directive方法、定义Vue.filter方法
  initAssetRegisters(Vue)
}
