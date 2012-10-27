function handleReport(div, options) {
  var criteriaDisplay = $("<fieldset> <legend>Criteria</legend> </fieldset>")
  var form = div.find("form")
  form.parent().prepend(criteriaDisplay.append(form))
  div.append("<div class='results'></div>")
  var details = $("<div class='details'></div>")
  div.append(details)
  var reportConfig = $.extend({
    authz: form.attr('authz'),
    name: form.attr('name'),
    url: baseUrl + form.attr('action'),
    criteria: {},
    contentTitle: $("<div class='detailsTitle ui-widget ui-widget-header ui-state-active ui-corner-top'></div>"),
    contentArea: $("<div class='detailsBody ui-widget ui-widget-content ui-corner-bottom'></div>"),
  }, options)
  reportConfig.contentTitle.css("display", "none").css("font-size", "1.5em").css("padding", "0.5em;")
  reportConfig.contentArea.css("display", "none").css("padding", "0.25em;")
  details.append(reportConfig.contentTitle).append(reportConfig.contentArea)
  var originalQuery = reportConfig.criteria.query || '{}'
  reportConfig.contentTitle.text(form.attr('name') + " Details")
  form.submit(function(e) {
    e.preventDefault()
    var query = JSON.parse(originalQuery)
    form.find("input,select").each(function(i, input) {
      $input = $(input)
      var store = query
      if ($input.parent().is("fieldset")) { // it should be grouped
        if ($input.attr('type') == 'hidden' || $input.val() != '') {
          var parent = $input.parent()
          if (!store[parent.attr('name')]) {
            store[parent.attr('name')] = {}
          }
          store = store[parent.attr('name')]
        }
      }

      if (!$input.attr('name')) { // skip it if no key
        return
      } else if ($input.attr('type') == 'hidden') { // special case allowing null
        if ($input.attr('value')) {
          store[$input.attr('name')] = $input.val()
        } else {
          store[$input.attr('name')] = null
        }
      } else if ($input.attr('type') == 'submit' || $input.val() == '') { // skip it
        return
      } else if ($input.attr('type') == 'number') {
        store[$input.attr('name')] = parseInt($input.val())
      } else if ($input.attr('type') == 'date') {
        var val = {
          "$date": $input.datepicker('getDate').getTime()
        }
        store[$input.attr('name')] = val
      } else if ($input.attr('type') == 'search') {
        store[$input.attr('name')] = {
          "$regex": $input.val(),
          "$options": ''
        }
      } else {
        store[$input.attr('name')] = $input.val()
      }
    })
    reportConfig.criteria.query = JSON.stringify(query)
    div.find(".results").report(reportConfig)
  })
  div.find(".results").report(reportConfig)
}

function missing(value, config) {
  return "<span style='color: #888;'>Missing</span>"
}
