/* @flow */

import config from '../config'
import Dep from '../observer/dep'
import Watcher from '../observer/watcher'
/*Github:https://github.com/answershuto*/
import {
  set,
  del,
  observe,
  observerState,
  defineReactive
} from '../observer/index'

import {
  warn,
  bind,
  noop,
  hasOwn,
  isReserved,
  handleError,
  validateProp,
  isPlainObject
} from '../util/index'

const sharedPropertyDefinition = {
  enumerable: true,
  configurable: true,
  get: noop,
  set: noop
}

/*通过proxy函数将_data（或者_props等）上面的数据代理到vm上，这样就可以用app.text代替app._data.text了。*/
export function proxy (target: Object, sourceKey: string, key: string) {
  sharedPropertyDefinition.get = function proxyGetter () {
    return this[sourceKey][key]
  }
  sharedPropertyDefinition.set = function proxySetter (val) {
    this[sourceKey][key] = val
  }
  // 使用defineProperty方法调用sharedPropertyDefinition参数时，sharedPropertyDefinition被深度copy了一份，
  // 以后修改sharedPropertyDefinition对象也不会有影响。其实很好理解，defineProperty里面涉及到了native代码，
  // sharedPropertyDefinition参数在对native代码进行了配置以后，native代码就被配置好了，修改sharedPropertyDefinition参数
  // 不会对native代码造成重新配置
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/**
 * 初始化props、methods、data、computed与watch
 * 1、initProps方法，将prop设置成响应式的
 * 2、initMethods方法，将method代理到vue实例
 * 3、initData将data对象设置成响应式的
 * 4、initComputed将data对象设置成响应式的
 * 5、initWatch将watch对象设置成响应式的
 * @param {*} vm 
 */
export function initState (vm: Component) {
  vm._watchers = []
  const opts = vm.$options
  /*初始化props*/
  if (opts.props) initProps(vm, opts.props)
  /*初始化方法*/
  if (opts.methods) initMethods(vm, opts.methods)
  /*初始化data*/
  if (opts.data) {
    initData(vm)
  } else {
    /*该组件没有data的时候绑定一个空对象*/
    observe(vm._data = {}, true /* asRootData */)
  }
  /*初始化computed*/
  if (opts.computed) initComputed(vm, opts.computed)
  /*初始化watchers*/
  if (opts.watch) initWatch(vm, opts.watch)
}

const isReservedProp = {
  key: 1,
  ref: 1,
  slot: 1
}

/*初始化props*/
function initProps (vm: Component, propsOptions: Object) {
  const propsData = vm.$options.propsData || {}
  const props = vm._props = {}
  // cache prop keys so that future props updates can iterate using Array
  // instead of dynamic object key enumeration.
  /*缓存属性的key，使得将来能直接使用数组的索引值来更新props来替代动态地枚举对象*/
  const keys = vm.$options._propKeys = []
  /*根据$parent是否存在来判断当前是否是根结点*/
  const isRoot = !vm.$parent
  // root instance props should be converted
  /*根结点会给shouldConvert赋true，根结点的props应该被转换*/
  observerState.shouldConvert = isRoot
  for (const key in propsOptions) {
    /*props的key值存入keys（_propKeys）中*/
    keys.push(key)
    /*验证prop,不存在用默认值替换，类型为bool则声称true或false，当使用default中的默认值的时候会将默认值的副本进行observe*/
    const value = validateProp(key, propsOptions, propsData, vm)
    /* istanbul ignore else */
    if (process.env.NODE_ENV !== 'production') {
      /*判断是否是保留字段，如果是则发出warning*/
      if (isReservedProp[key] || config.isReservedAttr(key)) {
        warn(
          `"${key}" is a reserved attribute and cannot be used as component prop.`,
          vm
        )
      }
      defineReactive(props, key, value, () => {
        /*
          由于父组件重新渲染的时候会充血prop的值，所以应该直接使用prop来作为一个data或者计算属性的依赖
          https://cn.vuejs.org/v2/guide/components.html#字面量语法-vs-动态语法
        */
        if (vm.$parent && !observerState.isSettingProps) {
          warn(
            `Avoid mutating a prop directly since the value will be ` +
            `overwritten whenever the parent component re-renders. ` +
            `Instead, use a data or computed property based on the prop's ` +
            `value. Prop being mutated: "${key}"`,
            vm
          )
        }
      })
    } else {
      defineReactive(props, key, value)
    }
    // static props are already proxied on the component's prototype
    // during Vue.extend(). We only need to proxy props defined at
    // instantiation here.
    /*Vue.extend()期间，静态prop已经在组件原型上代理了，我们只需要在这里进行代理prop*/
    if (!(key in vm)) {
      proxy(vm, `_props`, key)
    }
  }
  observerState.shouldConvert = true
}

/**
 * 1、设置vm的_data属性，将options里面data对象赋值到_data属性
 * 2、将_data属性指向的data对象，代理到vm实例
 * 3、将data对象进行observe。
 * @param {*} vm 
 */
function initData (vm: Component) {

  /*得到data数据*/
  let data = vm.$options.data
  data = vm._data = typeof data === 'function'
    ? getData(data, vm)
    : data || {}

  /*对对象类型进行严格检查，只有当对象是纯javascript对象的时候返回true*/
  if (!isPlainObject(data)) {
    data = {}
    process.env.NODE_ENV !== 'production' && warn(
      'data functions should return an object:\n' +
      'https://vuejs.org/v2/guide/components.html#data-Must-Be-a-Function',
      vm
    )
  }
  // proxy data on instance
  /*遍历data对象*/
  const keys = Object.keys(data)
  const props = vm.$options.props
  let i = keys.length

  //遍历data中的数据
  while (i--) {

    /*保证data中的key不与props中的key重复，props优先，如果有冲突会产生warning*/
    if (props && hasOwn(props, keys[i])) {
      process.env.NODE_ENV !== 'production' && warn(
        `The data property "${keys[i]}" is already declared as a prop. ` +
        `Use prop default value instead.`,
        vm
      )
    } else if (!isReserved(keys[i])) {
      /*判断是否是保留字段*/

      /*这里是我们前面讲过的代理，将data上面的属性代理到了vm实例上*/
      proxy(vm, `_data`, keys[i])
    }
  }
  // observe data
  /*从这里开始我们要observe了，开始对数据进行绑定，这里有尤大大的注释asRootData，这步作为根数据，下面会进行递归observe进行对深层对象的绑定。*/
  observe(data, true /* asRootData */)
}

function getData (data: Function, vm: Component): any {
  try {
    return data.call(vm)
  } catch (e) {
    handleError(e, vm, `data()`)
    return {}
  }
}

const computedWatcherOptions = { lazy: true }

/**
 * 初始化computed
 * 1、添加vm._computedWatchers 对象，用来保存每一个计算属性的watcher。
 * 2、为每一个计算属性new 一个watcher，并且设置为lazy的watcher
 * @param {*} vm 
 * @param {*} computed opt.computed
 */
function initComputed (vm: Component, computed: Object) {
  const watchers = vm._computedWatchers = Object.create(null)

  for (const key in computed) {
    const userDef = computed[key]
    /*
      计算属性可能是一个function，也有可能设置了get以及set的对象。
      可以参考 https://cn.vuejs.org/v2/guide/computed.html#计算-setter
    */
    let getter = typeof userDef === 'function' ? userDef : userDef.get
    if (process.env.NODE_ENV !== 'production') {
      /*getter不存在的时候抛出warning并且给getter赋空函数*/
      if (getter === undefined) {
        warn(
          `No getter function has been defined for computed property "${key}".`,
          vm
        )
        getter = noop
      }
    }
    // create internal watcher for the computed property.
    /*
      为每一个计算属性创建一个内部的监视器Watcher，保存在vm实例的_computedWatchers中
      这里的computedWatcherOptions参数传递了一个lazy为true，会使得watch实例的dirty为true
      所以为什么说计算属性时lazy的
    */
    watchers[key] = new Watcher(vm, getter, noop, computedWatcherOptions)

    // component-defined computed properties are already defined on the
    // component prototype. We only need to define computed properties defined
    // at instantiation here.
    /*组件正在定义的计算属性已经定义在现有组件的原型上则不会进行重复定义*/
    if (!(key in vm)) {
      /*定义计算属性*/
      defineComputed(vm, key, userDef)
    } else if (process.env.NODE_ENV !== 'production') {
      /*如果计算属性与已定义的data或者props中的名称冲突则发出warning*/
      if (key in vm.$data) {
        warn(`The computed property "${key}" is already defined in data.`, vm)
      } else if (vm.$options.props && key in vm.$options.props) {
        warn(`The computed property "${key}" is already defined as a prop.`, vm)
      }
    }
  }
}

/*定义计算属性*/
export function defineComputed (target: any, key: string, userDef: Object | Function) {
  if (typeof userDef === 'function') {
    /*创建计算属性的getter*/
    sharedPropertyDefinition.get = createComputedGetter(key)
    /*
      当userDef是一个function的时候是不需要setter的，所以这边给它设置成了空函数。
      因为计算属性默认是一个function，只设置getter。
      当需要设置setter的时候，会将计算属性设置成一个对象。参考：https://cn.vuejs.org/v2/guide/computed.html#计算-setter
    */
    sharedPropertyDefinition.set = noop
  } else {
    /*get不存在则直接给空函数，如果存在则查看是否有缓存cache，没有依旧赋值get，有的话使用createComputedGetter创建*/
    sharedPropertyDefinition.get = userDef.get
      ? userDef.cache !== false
        ? createComputedGetter(key)
        : userDef.get
      : noop
    /*如果有设置set方法则直接使用，否则赋值空函数*/
    sharedPropertyDefinition.set = userDef.set
      ? userDef.set
      : noop
  }
  /*defineProperty上getter与setter，在设置计算属性的getter和setter的同时，也将计算属性代理到vm实例*/
  Object.defineProperty(target, key, sharedPropertyDefinition)
}

/*创建计算属性的getter*/
function createComputedGetter (key) {
  return function computedGetter () {
    const watcher = this._computedWatchers && this._computedWatchers[key]
    if (watcher) {
      /*实际是脏检查，在计算属性中的依赖发生改变的时候dirty会变成true，在get的时候重新计算计算属性的输出值*/
      if (watcher.dirty) {
        watcher.evaluate()
      }
      /*依赖收集*/
      if (Dep.target) {
        watcher.depend()
      }
      return watcher.value
    }
  }
}

/**
 * 初始化方法，主要做了两件事：
 * 1、将所有的method上下文替换成当前vue实例，绑定this
 * 2、将所有方法代理到vue实例
 * @param {*} vm 
 * @param {*} methods 
 */
function initMethods (vm: Component, methods: Object) {
  const props = vm.$options.props
  for (const key in methods) {
    /*在为null的时候写上空方法，有值时候将上下文替换成vm*/
    vm[key] = methods[key] == null ? noop : bind(methods[key], vm)
    if (process.env.NODE_ENV !== 'production') {
      if (methods[key] == null) {
        warn(
          `method "${key}" has an undefined value in the component definition. ` +
          `Did you reference the function correctly?`,
          vm
        )
      }
      /*与props名称冲突报出warning*/
      if (props && hasOwn(props, key)) {
        warn(
          `method "${key}" has already been defined as a prop.`,
          vm
        )
      }
    }
  }
}

/*初始化watchers*/
function initWatch (vm: Component, watch: Object) {
  for (const key in watch) {
    const handler = watch[key]
    /*数组则遍历进行createWatcher*/
    if (Array.isArray(handler)) {
      for (let i = 0; i < handler.length; i++) {
        createWatcher(vm, key, handler[i])
      }
    } else {
      createWatcher(vm, key, handler)
    }
  }
}

/*创建一个观察者Watcher*/
function createWatcher (vm: Component, key: string, handler: any) {
  let options
  /*对对象类型进行严格检查，只有当对象是纯javascript对象的时候返回true*/
  if (isPlainObject(handler)) {
    /*
      这里是当watch的写法是这样的时候
      watch: {
          test: {
              handler: function () {},
              deep: true
          }
      }
    */
    options = handler
    handler = handler.handler
  }
  if (typeof handler === 'string') {
    /*
        当然，也可以直接使用vm中methods的方法
    */
    handler = vm[handler]
  }
  /*用$watch方法创建一个watch来观察该对象的变化*/
  vm.$watch(key, handler, options)
}

/**
 * 1、向 Vue.prototype 对象添加$date代理和$props代理 vm.$date、 vm.$props
 * 2、向 Vue.prototype 对象添加$set方法 $delete方法 vm.$delete
 * 3、向 Vue.prototype 对象添加$watch方法 vm.$watch
 * @param {*} Vue 
 */
export function stateMixin (Vue: Class<Component>) {
  // flow somehow has problems with directly declared definition object
  // when using Object.defineProperty, so we have to procedurally build up
  // the object here.
  // 在Vue.prototype 设置$date属性 成为 vue实例的 _data 的代理。
  const dataDef = {}
  dataDef.get = function () { 
    // 这个this会指向 调用代理的vue实例。具体参见原型链方法继承中，this的指向问题。
    return this._data 
  }
  const propsDef = {}
  propsDef.get = function () { return this._props }
  if (process.env.NODE_ENV !== 'production') {
    dataDef.set = function (newData: Object) {
      warn(
        'Avoid replacing instance root $data. ' +
        'Use nested data properties instead.',
        this
      )
    }
    propsDef.set = function () {
      warn(`$props is readonly.`, this)
    }
  }
  Object.defineProperty(Vue.prototype, '$data', dataDef)
  Object.defineProperty(Vue.prototype, '$props', propsDef)

  /*
    https://cn.vuejs.org/v2/api/#vm-set
    用以将data之外的对象绑定成响应式的
  */
  Vue.prototype.$set = set
  /*
    https://cn.vuejs.org/v2/api/#vm-delete
    与set对立，解除绑定
  */
  Vue.prototype.$delete = del

  /**
   * https://cn.vuejs.org/v2/api/#vm-watch
   * $watch方法
   * 用以为对象建立观察者监视变化
   * 注意，在这个地方调用了new Watcher方法
   * @param {*} expOrFn 
   * @param {*} cb 
   * @param {*} options 
   */
  Vue.prototype.$watch = function (
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ): Function {
    const vm: Component = this
    options = options || {}
    options.user = true
    // 这里创建出来的watcher的lazy选项是false。所以$watch创建的watcher并不是lazy的。
    // 计算属性创建的watcher是lazy的。这是最重要的区别。
    const watcher = new Watcher(vm, expOrFn, cb, options)
    /*有immediate参数的时候会立即执行*/
    if (options.immediate) {
      cb.call(vm, watcher.value)
    }
    /*返回一个取消观察函数，用来停止触发回调*/
    return function unwatchFn () {
      /*将自身从所有依赖收集订阅列表删除*/
      watcher.teardown()
    }
  }
}
