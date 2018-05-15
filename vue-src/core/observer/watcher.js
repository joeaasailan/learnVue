/* @flow */

import { queueWatcher } from './scheduler'
import Dep, { pushTarget, popTarget } from './dep'

import {
  warn,
  remove,
  isObject,
  parsePath,
  _Set as Set,
  handleError
} from '../util/index'

import type { ISet } from '../util/index'

let uid = 0

/**
 * A watcher parses an expression, collects dependencies,
 * and fires callback when the expression value changes.
 * This is used for both the $watch() api and directives.
 */
/**
 *  一个解析表达式，进行依赖收集的观察者，同时在表达式数据变更时触发回调函数。
 * 它被用于$watch api以及指令
 */
export default class Watcher {
  vm: Component;
  expression: string;
  cb: Function;
  id: number;
  // 是否深度watch
  deep: boolean;
  // 是否是用户定义的watcher
  user: boolean;
  // lazy watcher
  lazy: boolean;
  sync: boolean;
  dirty: boolean;
  active: boolean;
  deps: Array<Dep>;
  newDeps: Array<Dep>;
  // 
  depIds: ISet;
  // watcher内新依赖的id set集合
  newDepIds: ISet;
  getter: Function;
  value: any;

  /**
   * 以new Vue({
   *    data: {
   *      count: 0
   *    },
   *    computed: {
   *      maxCount: function() {
   *         return this.count + 10;
   *      }
   *    },
   *    watch: {
   *      count: {
   *         handler: function(newVal, oldVal) {
   *            ....
   *         },
   *         deep: true
   *      }
   *    }
   * })
   * 为例
   * new watcher的各个参数如下
   * 1、计算属性computed: 针对computed对象的每一个key，new一个watcher。调用时各个参数如下：
   *    vm: 当前vue实例
   *    expOrFn: computed.maxCount 函数。
   *    cb: noop（一个自定义的空函数）
   *    options: {
   *      lazy: true,
   *      deep: false,
   *      sync: false,
   *      user: false
   *      ...
   *    }
   *    
   * 2、使用vm.$watch方法，或者options.watch属性对象创建。其最终的options一般如下：
   *   vm: 当前vue实例
   *   expOrFn: 'count'
   *   cb: watch.count 函数
   *   options: {
   *      lazy: true,
   *      deep: true, // true or false 由用户传入决定
   *      sync: false,
   *      user: true,
   *      ...
   *   }
   * 
   * 3、检测render函数的实例：options如下：
   *   vm: 当前vue实例
   *   expOrFn: () => vm._update(vm._render(), hydrating) // hydrating应该是false，意义不明
   *   cb: noop 
   *   options: {
   *      lazy: false,
   *      deep: false,
   *      sync: false,
   *      user: false
   *   }
   * @param {*} vm 当前vue实例
   * @param {*} expOrFn 需要被watch的function 或者 express
   * @param {*} cb 回调函数
   * @param {*} options 选项
   */
  constructor (
    vm: Component,
    expOrFn: string | Function,
    cb: Function,
    options?: Object
  ) {
    this.vm = vm
    /*_watchers存放订阅者实例*/
    vm._watchers.push(this)
    // options
    if (options) {
      // !!可以将一些假意真假的值变为true or false，比如!!0 会变为false
      this.deep = !!options.deep
      this.user = !!options.user
      this.lazy = !!options.lazy
      this.sync = !!options.sync
    } else {
      this.deep = this.user = this.lazy = this.sync = false
    }
    this.cb = cb
    this.id = ++uid // uid for batching
    this.active = true
    this.dirty = this.lazy // for lazy watchers

    this.deps = []
    this.newDeps = []
    this.depIds = new Set()
    this.newDepIds = new Set()
    
    this.expression = process.env.NODE_ENV !== 'production'
      ? expOrFn.toString()
      : ''
    // parse expression for getter
    /*把表达式expOrFn解析成getter*/
    if (typeof expOrFn === 'function') {
      this.getter = expOrFn
    } else {
      this.getter = parsePath(expOrFn)
      if (!this.getter) {
        this.getter = function () {}
        process.env.NODE_ENV !== 'production' && warn(
          `Failed watching path: "${expOrFn}" ` +
          'Watcher only accepts simple dot-delimited paths. ' +
          'For full control, use a function instead.',
          vm
        )
      }
    }

    /**
     * 检测render函数的watcher，其lazy为false，可以在new watcher时立即运行一次this.get()方法，进行第一次依赖收集
     * 其余情况lazy都是true，不会在new watcher时进行依赖收集
     */
    this.value = this.lazy ? undefined : this.get()
  }

  /**
   * Evaluate the getter, and re-collect dependencies.
   */
  /**
   * 0、被调用的时机： 构造函数、this.run()方法、this.evaluate()方法。
   * 1、获得getter的值（getter其实就是被watch的表达式或者函数）
   * 2、重新进行依赖收集
   */
  get () {
    /*将自身watcher观察者实例设置给Dep.target，用以依赖收集。*/
    pushTarget(this)

    let value
    const vm = this.vm
    /*
      执行了getter操作，看似执行了渲染操作，其实是执行了依赖收集。
      在将Dep.target设置为自生观察者实例以后，执行getter操作。
      譬如说现在的的data中可能有a、b、c三个数据，getter渲染需要依赖a跟c，
      那么在执行getter的时候就会触发a跟c两个数据的getter函数，
      在getter函数中即可判断Dep.target是否存在然后完成依赖收集，
      将该观察者对象放入闭包中的Dep的subs中去。
    */
    if (this.user) {
      // 如果是用户自定义的getter函数，可能会throw error 
      try {
        value = this.getter.call(vm, vm)
      } catch (e) {
        handleError(e, vm, `getter for watcher "${this.expression}"`)
      }
    } else {
      value = this.getter.call(vm, vm)
    }
    // "touch" every property so they are all tracked as
    // dependencies for deep watching
    /*如果存在deep，则触发每个深层对象的依赖，追踪其变化*/
    if (this.deep) {
      /*递归每一个对象或者数组，触发它们的getter，使得对象或数组的每一个成员都被依赖收集，形成一个“深（deep）”依赖关系*/
      traverse(value)
    }

    /*将观察者实例从target栈中取出并设置给Dep.target*/
    popTarget()
    this.cleanupDeps()
    return value
  }

  /**
   * Add a dependency to this directive.
   */
   /*添加一个依赖关系到Deps集合中*/
  addDep (dep: Dep) {
    const id = dep.id
    if (!this.newDepIds.has(id)) {
      // watcher没有添加过这个dep，将其id添加到set中存储
      this.newDepIds.add(id)
      // 存储这个dep实例
      this.newDeps.push(dep)
      if (!this.depIds.has(id)) {
        // 把watcher添加到dep里面
        dep.addSub(this)
      }
    }
  }

  /**
   * Clean up for dependency collection.
   */
  /**
   * @description 清理依赖收集。
   * 0、把this.deps中不包含在this.newDepIds中的dep实例清理掉
   * 1、把this.newDepIds 保存到 this.depIds，然后把this.newDepIds 设置成一个空set
   * 2、把this.newDeps 保存到 this.deps，然后把this.newDeps 设置成一个空array
   * @memberof Watcher
   */
  cleanupDeps () {
    /*移除所有观察者对象*/
    let i = this.deps.length
    while (i--) {
      const dep = this.deps[i]
      if (!this.newDepIds.has(dep.id)) {
        dep.removeSub(this)
      }
    }

    let tmp = this.depIds
    this.depIds = this.newDepIds
    this.newDepIds = tmp
    this.newDepIds.clear()

    tmp = this.deps
    this.deps = this.newDeps
    this.newDeps = tmp
    this.newDeps.length = 0
  }

  /**
   * Subscriber interface.
   * Will be called when a dependency changes.
   */
   /*
      在dep的notify方法中被调用。
      调度者接口，当依赖发生改变的时候进行回调。
      注意，watcher的update方法，不是单纯的调用callback函数
   */
  update () {
    /* istanbul ignore else */
    if (this.lazy) {
      // 如果是lazy的，则设置该watcher为dirty，然后由nextnick来处理
      this.dirty = true
    } else if (this.sync) {
      /*同步则执行run直接渲染视图*/
      this.run()
    } else {
      /*异步推送到观察者队列中，下一个tick时调用。（重要） */
      queueWatcher(this)
    }
  }

  /**
   * Scheduler job interface.
   * Will be called by the scheduler.
   */
   /*
      调度者工作接口，将被调度者回调。
    */
  run () {
    if (this.active) {
      /**
       * 重要步骤，几个重要作用：
       * 1、被watch的表达式改变后，获取最新的value。
       * 2、针对data对象，被watch的是vm._update和vm._render函数，在运行this.get()时，render函数跟update
       *    函数都会重新运行一遍，达到了更新视图的目的
       * 3、针对被watch的表达式，重新收集依赖。
       */
      const value = this.get()
      if (
        value !== this.value ||
        // Deep watchers and watchers on Object/Arrays should fire even
        // when the value is the same, because the value may
        // have mutated.
        /*
            即便值相同，拥有Deep属性的观察者以及在对象／数组上的观察者应该被触发更新，因为它们的值可能发生改变。
        */
        isObject(value) ||
        this.deep
      ) {
        // set new value
        const oldValue = this.value
        /*设置新的值*/
        this.value = value

        /*触发回调*/
        if (this.user) {
          try {
            this.cb.call(this.vm, value, oldValue)
          } catch (e) {
            handleError(e, this.vm, `callback for watcher "${this.expression}"`)
          }
        } else {
          this.cb.call(this.vm, value, oldValue)
        }
      }
    }
  }

  /**
   * Evaluate the value of the watcher.
   * This only gets called for lazy watchers.
   */
   /**
    * 获取观察者的值，这个方法被lazy watcher
    * 使用，用来获取value，但是不弄脏watcher
    */
  evaluate () {
    this.value = this.get()
    this.dirty = false
  }

  /**
   * Depend on all deps collected by this watcher.
   */
   /*收集该watcher的所有deps依赖*/
  depend () {
    let i = this.deps.length
    while (i--) {
      this.deps[i].depend()
    }
  }

  /**
   * Remove self from all dependencies' subscriber list.
   */
   /*将自身从所有依赖收集订阅列表删除*/
  teardown () {
    if (this.active) {
      // remove self from vm's watcher list
      // this is a somewhat expensive operation so we skip it
      // if the vm is being destroyed.
      /*从vm实例的观察者列表中将自身移除，由于该操作比较耗费资源，所以如果vm实例正在被销毁则跳过该步骤。*/
      if (!this.vm._isBeingDestroyed) {
        remove(this.vm._watchers, this)
      }
      let i = this.deps.length
      while (i--) {
        this.deps[i].removeSub(this)
      }
      this.active = false
    }
  }
}

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
 /*递归每一个对象或者数组，触发它们的getter，使得对象或数组的每一个成员都被依赖收集，形成一个“深（deep）”依赖关系*/

 /*用来存放Oberser实例等id，避免重复读取*/
const seenObjects = new Set()
function traverse (val: any) {
  seenObjects.clear()
  _traverse(val, seenObjects)
}

function _traverse (val: any, seen: ISet) {
  let i, keys
  const isA = Array.isArray(val)
  /*非对象或数组或是不可扩展对象直接return，不需要收集深层依赖关系。*/
  if ((!isA && !isObject(val)) || !Object.isExtensible(val)) {
    return
  }
  if (val.__ob__) {
    /*避免重复读取*/
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }

  /*递归对象及数组*/
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
