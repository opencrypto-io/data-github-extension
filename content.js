
var s = document.createElement('script');
s.src = chrome.extension.getURL("script.js");
(document.head||document.documentElement).appendChild(s);
s.parentNode.removeChild(s);

function getMapping() {
  return {
    'string': JSONSchemaString,
    'number': JSONSchemaNumber,
    'object': JSONSchemaObject,
    'array': JSONSchemaArray,
    'boolean': JSONSchemaBoolean
  }
}

var JSONSchemaNumber = {
  view: (vnode) => {
    let fpath = vnode.attrs.ocpath.join('')
    return m('input.form-control.input-block', { 
      type: 'text', 
      value: vnode.attrs.data, 
      oninput: m.withAttr("value", function(val) {
        return vnode.attrs.state.updateData(Number(val), fpath)
      }) 
    })
  }
}

var JSONSchemaString = {
  view: (vnode) => {
    let fpath = vnode.attrs.ocpath.join('')
    let schema = vnode.attrs.schema

    if(schema.enum) {

      let options = schema.enum.map((en) => {
        return m('option', { value: en }, en)
      })
      options.push(m('option', { value: '' }, "(undefined)"))
      return m('select.form-control', { 
        value: vnode.attrs.data || '', 
        oninput: m.withAttr("value", function(val) {
          return vnode.attrs.state.updateData(val, fpath)
        }) 
      }, options)
    }

    return m('input.form-control.input-block', { 
      type: 'text', 
      value: vnode.attrs.data, 
      oninput: m.withAttr("value", function(val) {
        return vnode.attrs.state.updateData(val, fpath)
      }) 
    })
  }
}


var JSONSchemaBoolean = {
  view: (vnode) => {
    let fpath = vnode.attrs.ocpath.join('')
    let click = function() {
      return m.withAttr("value", function(val) {
        console.log(val, typeof val)
        let out = ""
        if (val === "true") {
          out = true
        }
        if (val === "false") {
          out = false
        }
        vnode.attrs.state.updateData(out, fpath)
      })
    }
    let lb = fpath.replace(/\./,'-')
    return [
      m('.OCRadio', [ 
        m('input', { id: lb+'-true', type: 'radio', checked: vnode.attrs.data === true, oninput: click(), value: "true" }),
        m('label', { for: lb+'-true' },' Yes'),
      ]),
      m('.OCRadio', [ 
        m('input', { id: lb+'-false', type: 'radio', checked: vnode.attrs.data === false, oninput: click(), value: "false" }),
        m('label', { for: lb+'-false' },' No'),
      ]),
      m('.OCRadio', [ 
        m('input', { id: lb+'-undef', type: 'radio', checked: vnode.attrs.data === undefined, oninput: click(), value: "undefined" }),
        m('label', { for: lb+'-undef' },' Undefined'),
      ]),
    ]
  }
}

var JSONSchemaArray = {
  view: (vnode) => {
    let data = vnode.attrs.data
    let schema = vnode.attrs.schema
    let path = vnode.attrs.ocpath

    let arr = []
    if (data) {
      arr = data
    }

    let mapping = getMapping()
    let model = JSONSchemaObject

    if (mapping[schema.items.type]) {
      model = mapping[schema.items.type]
    }

    console.log(arr)

    let i = 0
    let items = arr.map((v) => {
      i++
      let val = null
      if (v) {
        val = v
      }
      return m('div', [
        m('div.row', [
          'Item #'+i + ' ',
          m('a.oc_action', { onclick: function() {
            vnode.attrs.state.deleteItem(i-1, path.join(''))
          }}, 'Delete')
        ]),
        m(model, { schema: schema.items, data: val, ocpath: path.concat(['['+(i-1)+']']) , state: vnode.attrs.state })
      ])
    })
    return m('div', [
      m('div.items', items),
      m('div.oc_action', m('a', { onclick: function() {
        vnode.attrs.state.addItem(null, path.join(''), model)
      }}, '+ Add item')),
    ])
  }
}

var JSONSchemaObject = {
  view: (vnode) => {
    let data = vnode.attrs.data
    let schema = vnode.attrs.schema
    let path = vnode.attrs.ocpath

    if (schema === null) return m('div', 'Loading schema ..')

    if (!schema.properties) {
      return null
    }

    let items = Object.keys(schema.properties).map((p) => {
      let value = null
      if (data) {
        value = data[p]
      }
      let po = schema.properties[p]
      let children = null
      let mapping = getMapping()

      if (po['opencrypto-generated'] && po['opencrypto-generated'] === true) {
        return null
      }

      if (po.type && mapping[po.type]) {
        children = m(mapping[po.type], { data: value, schema: po, ocpath: path.concat(['.'+p]), state: vnode.attrs.state })
      }

      /*return m('dl.form-group.JSONTypeObject', [
        m('dt.input-label', m('label', po.title || p)),
        m('dd', children)
      ])*/
      return m('tr', [
        m('th', m('label', po.title || p)),
        m('td', [
          children,
          m('p.note', po.description)
        ])
      ])
    })
    return m('table.JSONTypeObject', { cellpadding: 2 }, items)
  }
}

function ensurePath(data, path) {
  let segs = path.split('.')
  segs.shift()
  console.log(segs)
}

var Schema = null
var OCForm = {
  oninit: () => {
    return m.request('https://schema.opencrypto.io/build/deref/project.json').then(out => {
      Schema = out
    })
  },
  view: (vnode) => {
    if (!Schema) {
      return m('div', 'Loading OCForm ..')
    }
    let state = {
      data: vnode.attrs.data,
      updateData: function(val, x) {
        //let cmd = "state.data" + x + " = " + "'"+ val +"';"
        //eval(cmd)
        if (val === "") {
          _.unset(state.data, x.substr(1))
        } else {
          _.set(state.data, x.substr(1), val)
        }
        window.dispatchEvent(new CustomEvent("UpdateCodeMirrorData", { detail: jsyaml.safeDump(state.data) }))
      },
      addItem: function(val, x, model) {
        let v = "{}"
        if (model === JSONSchemaString) {
          v = '""'
        }

        let cmd = "if(!state.data"+x+") { state.data"+x+" = []; }; state.data" + x + '.push('+v+')'
        eval(cmd)
        window.dispatchEvent(new CustomEvent("UpdateCodeMirrorData", { detail: jsyaml.safeDump(state.data) }))
      },
      deleteItem: function(val, x) {
        let vari = "state.data" + x
        let cmd = `${vari}.splice(${val}, 1); if(${vari}.length === 0) { delete ${vari}; };`
        console.log(cmd)
        eval(cmd)
        window.dispatchEvent(new CustomEvent("UpdateCodeMirrorData", { detail: jsyaml.safeDump(state.data) }))
      }
    }

    return m('div', m(JSONSchemaObject, { schema: Schema, data: state.data, ocpath: [], state }))
  }
}


window.addEventListener("CodeMirrorData", function(evt) {
  let data = jsyaml.safeLoad(evt.detail)

  $('.CodeMirror').parent().append("<div id='OCForm'>Opencrypto Form loading ..</div>")
  $('.CodeMirror').hide()

  var root = document.getElementById('OCForm')
  if (!data) {
    data = {}
  }
  m.mount(root, { view() { return m(OCForm, { data })}})
})

$('.breadcrumb').append("<div id='OCReload'>(<a id='OCReload'>OCReload</a>)</div>")
$('.breadcrumb #OCReload a').click(() => {
  window.dispatchEvent(new CustomEvent("OCDataRecheck", {detail: null}));
})

