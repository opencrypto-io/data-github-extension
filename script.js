

function check() {
  if (document.getElementById('OCForm')) {
    return console.log('OCForm found, aborting')
  }

  console.log('Checking for OCData ..')
  let fn = document.getElementsByClassName('js-blob-filename')[0].value

  if (fn.match(/project\.yaml$/)) {

    console.log('Project YAML detected, making OCForm ..')

    let cm = document.getElementsByClassName('CodeMirror')[0].CodeMirror
    let text = cm.getValue()

    window.dispatchEvent(new CustomEvent("CodeMirrorData", {detail: text}));

    window.addEventListener('UpdateCodeMirrorData', function(evt) {
      //console.log('inject have data!', evt)
      console.log('Updating YAML ..')

      cm.setValue(evt.detail)
    })
  }
}

check()

window.addEventListener('OCDataRecheck', function(evt) {
  console.log('Get OCData recheck signal ..')
  check()
})
