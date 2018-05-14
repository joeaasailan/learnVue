/* @flow */

/**
 * vnode基础类，vnode示例：
 * {
    tag: 'div'
    data: {
        class: 'test'
    },
    children: [
        {
            tag: 'span',
            data: {
                class: 'demo'
            }
            text: 'hello,VNode'
        }
    ]
}
 */
export default class VNode {
  // 当前vnode的标签名
  tag: string | void;
  // 当前vnode各种属性集合对象
  data: VNodeData | void;
  // 当前vnode的子节点
  children: ?Array<VNode>;
  // 当前节点的文本
  text: string | void;
  // 当前节点对应的真实dom节点
  elm: Node | void;
  // 当前节点的名字空间
  ns: string | void;
  // 编译作用域
  context: Component | void; // rendered in this component's scope
  // 函数化组件作用域
  functionalContext: Component | void; // only for functional component root nodes
  // 节点的key属性，被当作节点的标志，用以优化，v-for的时候特别有用
  key: string | number | void;
  // 组件的options选项
  componentOptions: VNodeComponentOptions | void;
  // 当前vnode对应的组件实例
  componentInstance: Component | void; // component instance
  // 父节点
  parent: VNode | void; // component placeholder node
  // 简而言之就是是否为原生HTML或只是普通文本，innerHTML的时候为true，textContent的时候为false
  raw: boolean; // contains raw HTML? (server only)
  // 静态节点标志
  isStatic: boolean; // hoisted static node
  // 是否作为跟节点插入
  isRootInsert: boolean; // necessary for enter transition check
  // 是否为注释节点
  isComment: boolean; // empty comment placeholder?
  // 是否为克隆节点
  isCloned: boolean; // is a cloned node?
  // 是否有v-once指令
  isOnce: boolean; // is a v-once node?

  constructor (
    tag?: string,
    data?: VNodeData,
    children?: ?Array<VNode>,
    text?: string,
    elm?: Node,
    context?: Component,
    componentOptions?: VNodeComponentOptions
  ) {
    /*当前节点的标签名*/
    this.tag = tag
    /*当前节点对应的对象，包含了具体的一些数据信息，是一个VNodeData类型，可以参考VNodeData类型中的数据信息*/
    this.data = data
    /*当前节点的子节点，是一个数组*/
    this.children = children
    /*当前节点的文本*/
    this.text = text
    /*当前虚拟节点对应的真实dom节点*/
    this.elm = elm
    /*当前节点的名字空间*/
    this.ns = undefined
    /*当前节点的编译作用域*/
    this.context = context
    /*函数化组件作用域*/
    this.functionalContext = undefined
    /*节点的key属性，被当作节点的标志，用以优化*/
    this.key = data && data.key
    /*组件的option选项*/
    this.componentOptions = componentOptions
    /*当前节点对应的组件的实例*/
    this.componentInstance = undefined
    /*当前节点的父节点*/
    this.parent = undefined
    /*简而言之就是是否为原生HTML或只是普通文本，innerHTML的时候为true，textContent的时候为false*/
    this.raw = false
    /*是否为静态节点*/
    this.isStatic = false
    /*是否作为跟节点插入*/
    this.isRootInsert = true
    /*是否为注释节点*/
    this.isComment = false
    /*是否为克隆节点*/
    this.isCloned = false
    /*是否有v-once指令*/
    this.isOnce = false
  }

  // DEPRECATED: alias for componentInstance for backwards compat.
  /* istanbul ignore next */
  get child (): Component | void {
    return this.componentInstance
  }
}

/*创建一个空VNode节点*/
export const createEmptyVNode = () => {
  const node = new VNode()
  node.text = ''
  node.isComment = true
  return node
}

/*创建一个文本节点*/
export function createTextVNode (val: string | number) {
  return new VNode(undefined, undefined, undefined, String(val))
}

// optimized shallow clone
// used for static nodes and slot nodes because they may be reused across
// multiple renders, cloning them avoids errors when DOM manipulations rely
// on their elm reference.
/*克隆一个VNode节点*/
export function cloneVNode (vnode: VNode): VNode {
  const cloned = new VNode(
    vnode.tag,
    vnode.data,
    vnode.children,
    vnode.text,
    vnode.elm,
    vnode.context,
    vnode.componentOptions
  )
  cloned.ns = vnode.ns
  cloned.isStatic = vnode.isStatic
  cloned.key = vnode.key
  cloned.isCloned = true
  return cloned
}
/*Github:https://github.com/answershuto*/
/*对一个节点数组依次进行clone*/
export function cloneVNodes (vnodes: Array<VNode>): Array<VNode> {
  const len = vnodes.length
  const res = new Array(len)
  for (let i = 0; i < len; i++) {
    res[i] = cloneVNode(vnodes[i])
  }
  return res
}
