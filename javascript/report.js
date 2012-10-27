(function($) {
  function exportSearch(settings, type, criteria) {
    var display = {}
    $.each(settings.display, function(key, value) {
      display[key] = value
      display[key].render = value.render.toString()
    })
    Auth.ajax(settings.url + "/export/" + type, settings.authz, {
      data: JSON.stringify({
        query: criteria.query,
        sort: criteria.sort,
        display: settings.display
      }),
      type: 'POST',
      error: settings.error,
      success: function(data) {
        // TODO: Need to pass in auth credentials ...
        window.location = settings.url + "/download/" + data
      }
    })
  }

  function renderValue(row, config) {
    var value = row
    if (config.field) {
      var fields = config.field.split('.')
      for (var index in fields) {
        if (value == null) {
          break
        }
        var arrayIndex = fields[index].indexOf('[')
        if (arrayIndex > -1) {
          var arrayIndexValue = fields[index].substring(arrayIndex + 1, fields[index].indexOf(']'))
          value = eval("value." + fields[index].substring(0, arrayIndex))
          if (value != null) {
            if ($.isNumeric(arrayIndexValue)) {
              var i = parseInt(arrayIndexValue)
              if (i < 0) {
                value = value[value.length + i] // negative number means i from last
              } else {
                value = value[i]
              }
            } else {
              value = value[arrayIndexValue]
            }
          }
        } else {
          value = eval("value." + fields[index])
        }
      }
    }

    if (config.render) {
      return config.render(value, config)
    }
    return ReportRender.string(value, config)
  }

  function renderResults(settings, session, results) {
    var maxPages = Math.floor(session.maxEntries / settings.criteria.rows)
    session.content.find('[name=pageButton] span').text((settings.criteria.page + 1) + " of " + (maxPages + 1))
    var table = session.content.find("[name=results] table")
    var thead = table.find("thead")
    var tbody = table.find("tbody")
    thead.children().remove()
    tbody.children().remove()

    var totalWidth = 0;
    var header = $("<tr></tr>")
    thead.append(header)
    $.each(settings.display, function(column, value) {
      var width = 200
      if (value.width) {
        width = value.width
      }
      totalWidth += width
      var th = $("<th>" + column + "</th>").css('font-size', '1em').css('width', width)
      header.append(th)
    })
    table.css("width", totalWidth + "px")

    $.each(results, function(row, result) {
      var tr = $("<tr></tr>")
      if (settings.click) {
        tr.click(function() {
          settings.click(result, settings)
        })
      }
      tbody.append(tr)
      $.each(settings.display, function(column, value) {
        tr.append("<td>" + renderValue(result, value) + "</td>")
      })
    })
    tbody.find("tr:even").css("background-color", "#fff9e5") // TODO, this should be a css property not hardcoded
  }

  var methods = {
    init: function(options) {
      var $this = $(this)

      // Initialize Options
      var settings = $.extend({
        display: {},
        name: 'Unspecified',
        url: null, // required
        defaultColumnWidth: 200,
        error: function(xhr, status, err) {
          $this.report('notification', xhr.status + " - " + xhr.statusText + "<br/>" + xhr.responseText, 10000)
        }
      }, options)

      // Request the default criteria settings
      var result = Auth.ajax(settings.url + "/criteria", settings.authz, {
        async: false
      })
      if (!result) {
        $.error("Unable to retrieve default criteria for report")
      }
      var defaultCriteria = $.parseJSON(result.responseText)
      var defaultFields = $.extend(defaultCriteria.fields, options.criteria.fields)
      var defaultSort = $.extend(defaultCriteria.sort, options.criteria.sort)
      settings.criteria = $.extend(defaultCriteria, options.criteria)
      settings.criteria.fields = defaultFields
      settings.criteria.sort = defaultSort

      this.html('')
      this.data('settings', settings)
      this.data('session', {
        allFields: [],
        content: $("<div class='ui-widget ui-widget-content ui-corner-all'></div>"),
        dialog: $("<div name='dialog' title='Search Criteria'></div>"),
        maxEntries: 0
      })
      var session = this.data('session')
      this.append(session.content)
      $.each(defaultFields, function(field, value) {
        session.allFields.push(field)
      })

      // Initialize Layout
      var navigation = $("<div name='navigation'></div>").css("float", "left").css("width", "100%").addClass(
          'ui-widget ui-widget-header ui-state-active ui-corner-top')
      navigation.append($("<span style='font-size: 1.5em; margin-left: 0.25em;'>" + settings.name + "</span>"))
      session.content.append(navigation)

      var height = navigation.height()
      var toolbar = $("<div></div>").css("float", "right").css("height", height).css("padding", "0 .1em 0 .1em")
          .addClass('ui-state-hover ui-corner-all').css('margin-right', '0.1em')
      navigation.append(toolbar)
      navigation.append($("<div></div>").attr('name', 'elapsedTime').css("float", "right").css("padding", ".25em").css(
          "vertical-align", "bottom"))

      var notification = $("<div name='notification' style='ui-widget ui-widget-content'></div>")
      session.content.append(notification)
      var msg = this.report('notification', 'Initializing Report')

      var results = $("<div name='results' style='ui-widget ui-widget-content ui-corner-bottom'></div>").css(
          "overflow", "auto").css("clear", "both")
      session.content.append(results)
      var results_table = $("<table style='margin: 0px; padding: 0px;'><thead class='ui-widget-header'></thead></table>")
      results.append(results_table.append($("<tbody></tbody>")))

      var dialog = session.dialog
      session.content.append(dialog)
      dialog.append("<div><span>Rows:</span> <input name='rows' type='text' value='0' /></div>")
      dialog.append("<div><span>Page:</span> <input name='page' type='text' value='0' /></div>")
      var accordion = $("<div></div>").css("font-size", "smaller")
      dialog.append(accordion)
      accordion.append("<h3><a href='#'>Criteria</a></h3>").append($("<div><textarea name='query'></textarea></div>"))
      accordion.append("<h3><a href='#'>Fields</a></h3>").append($("<div name='dialog_fields'></div>"))
      accordion.append("<h3><a href='#'>Sort</a></h3>").append($("<div name='dialog_sort'></textarea></div>"))
      dialog.find("textarea").attr('rows', '5').attr('cols', '40')
      dialog.find('span').css('width', '3em');
      dialog.find('input').css('width', '4em');

      // Register Toolbar Button Behaviors
      toolbar.addButton = function(name, icon, click) {
        var button = $("<button>" + name + "</button>").click(click).css("height", height).css("width", height)
        if (icon) {
          button.button({
            icons: {
              primary: icon
            },
            text: false
          })
        } else {
          button.button()
        }
        toolbar.append(button)
        return button
      }

      toolbar.addButton('Search', 'ui-icon-search', function() {
        dialog.dialog('open')
      })
      toolbar.addButton('First Page', 'ui-icon-seek-prev', function() {
        settings.criteria.page = 0
        $this.report('search')
      })
      toolbar.addButton('Previous Page', 'ui-icon-arrowthick-1-w', function() {
        if (settings.criteria.page <= 0) {
          alert("Unable to page before 1")
        } else {
          settings.criteria.page--
          $this.report('search')
        }
      })
      toolbar.addButton('x of y', null, function() {
        alert("TODO: What to do with this button exactly that search doesn't offer already?")
      }).attr('name', 'pageButton').css("width", '').css('vertical-align', 'top').find(".ui-button-text").css(
          'line-height', '').css('padding', '0 1em')
      toolbar.addButton('Next Page', 'ui-icon-arrowthick-1-e', function() {
        var maxPages = Math.floor(session.maxEntries / settings.criteria.rows)
        if (settings.criteria.page + 1 > maxPages) {
          alert("Unable to go beyond the last page")
        } else {
          settings.criteria.page++
          $this.report('search')
        }
      })
      toolbar.addButton('Last Page', 'ui-icon-seek-next', function() {
        settings.criteria.page = Math.floor(session.maxEntries / settings.criteria.rows)
        $this.report('search')
      })

      // Initialize jquery ui elements
      accordion.accordion({
        active: false,
        autoHeight: false,
        //clearStyle: true,
        collapsible: true,
        //heightStyle: 'content',
        //fillSpace: true
      })

      dialog.dialog({
        autoOpen: false,
        resizable: true,
        modal: true,
        width: $(window).width() * .7,
        height: $(window).height() * .7,
        buttons: {
          "Search": function() {
            var criteria = $this.report('criteriaFromUi')
            $this.report('search', criteria)
            $(this).dialog("close")
          },
          "Excel": function() {
            var criteria = $this.report('criteriaFromUi')
            exportSearch(settings, 'xls', criteria)
          },
          "Cancel": function() {
            // Reset the dialog settings as well
            $this.report('criteria', settings.criteria)
            $(this).dialog("close")
          }
        }
      })

      // UI initialization complete
      msg.remove()

      // For now go ahead and search automagically
      this.report('search')
      return this
    },
    notification: function(message, duration) {
      var session = this.data('session')
      var display = $("<div>" + message + "</div>")
      session.content.find("[name=notification]").prepend(display)
      if (!(duration === undefined)) {
        display.show("highlight", {}, duration, function() {
          display.remove()
        })
      }
      return display
    },
    openDialog: function() {
      this.data('settings').dialog.dialog('open')
    },
    search: function(criteria) { // criteria is optional parameter
      var $settings = this.data('settings')
      var $session = this.data('session')
      if (!(criteria === undefined)) {
        this.report('criteria', criteria)
      }
      var $msg = this.report('notification', 'Retrieving Report Data')
      var $this = this

      var $startTime = new Date().getTime()
      Auth.ajax($settings.url + "/search", $settings.authz, {
        data: JSON.stringify($settings.criteria),
        type: 'POST',
        error: $settings.error,
        success: function(data) {
          var elapsedTime = new Date().getTime() - $startTime
          $session.content.find("[name=elapsedTime]").text("(data: " + elapsedTime + "ms)")
          $msg.remove()
          $msg = $this.report('notification', 'Rendering Report Data ...')
          $session.maxEntries = data.count
          $this.report('criteria', data.criteria)
          $startTime = new Date().getTime()
          renderResults($settings, $session, data.results)
          elapsedTime = new Date().getTime() - $startTime
          $session.content.find("[name=elapsedTime]").append(
              " (draw: " + elapsedTime + "ms) (found: " + data.count + ")")
          $msg.remove()
        }
      })
    },
    criteriaFromUi: function() {
      var dialog = this.data('session').dialog
      var criteria = {
        rows: dialog.find("[name=rows]").val(),
        page: dialog.find("[name=page]").val(),
        query: dialog.find("[name=query]").val(),
        fields: {},
        sort: {}
      }
      displayConfiguration = {}
      var useall = false
      $.each(dialog.find("[name=dialog_fields] ul li"), function(index, element) {
        var key = $(element).find("[key=key]").val()
        displayConfiguration[key] = {}
        $(element).find("[tag]").each(function(index, input) {
          var tag = $(input).attr('tag')
          displayConfiguration[key][tag] = $(input).val()
        })

        if (displayConfiguration[key].field) {
          var field = displayConfiguration[key].field
          var arrayIndex = field.indexOf('[')
          while (arrayIndex > -1) {
            field = field.substring(0, arrayIndex) + field.substring(field.indexOf(']') + 1)
            arrayIndex = field.indexOf('[')
          }
          criteria.fields[field] = 1
        } else {
          useall = true
        }

        displayConfiguration[key].width = parseInt(displayConfiguration[key].width)
        if (displayConfiguration[key].render == 'number') {
          displayConfiguration[key].render = ReportRender.number
        } else if (displayConfiguration[key].render == 'date') {
          displayConfiguration[key].render = ReportRender.date
        } else if (displayConfiguration[key].render == 'string') {
          displayConfiguration[key].render = ReportRender.string
        } else {
          eval("displayConfiguration[\"" + key + "\"].render = " + displayConfiguration[key].code)
        }
      })

      if (useall) {
        criteria.fields = {}
      } else { // cleanup fields requesting subparts and all parts simultaneously
        $.each(criteria.fields, function(key, value) {
          var chunk = key
          var previous = 0
          var i = chunk.indexOf('.', previous)
          while (i > previous) {
            var chunk = chunk.substring(0, i)
            if (criteria.fields[chunk] == 1) {
              delete criteria.fields[key]
              break;
            }
            previous = i
            i = chunk.indexOf('.', previous)
          }
        })
      }

      this.data('settings').display = displayConfiguration
      $.each(dialog.find("[name=dialog_sort] ul [name=sort]"), function(index, input) {
        var key = $(input).attr('key')
        criteria.sort[key] = parseInt($(input).val())
      })
      return criteria
    },
    criteria: function(criteria) { // getter or setter for the criteria
      var settings = this.data('settings')
      var session = this.data('session')
      if (!(criteria === undefined)) {
        settings.criteria = criteria
        var dialog = session.dialog
        dialog.find('[name=rows]').val(settings.criteria.rows)
        dialog.find('[name=page]').val(settings.criteria.page)
        dialog.find('[name=query]').val(settings.criteria.query)
        dialog.find('[name=sort]').val(JSON.stringify(settings.criteria.sort))
        var fields = dialog.find('[name=dialog_fields]')
        fields.children().remove()
        var fieldSort = $("<ul></ul>").css("list-style-type", "none").css("margin", "0").css("padding", "0")
        fields.append(fieldSort)

        var fieldsList = session.allFields.slice()
        fieldsList.unshift("")

        var lineItemFunction = function(key, value) {
          var item = $("<li></li>").addClass("ui-widget-content").css("padding", "0.4em")
          var closeButton = $("<button></button>").css("float", "right").css('width', '1.5em').css('height', '1.5em')
          closeButton.button({
            icons: {
              primary: 'ui-icon-closethick'
            },
            text: false
          }).click(function() {
            item.remove()
          })
          item.append(closeButton)

          item.append($("<span></span>").addClass('ui-icon ui-icon-arrowthick-2-n-s').css("display", "inline-block"))

          var fieldName = $("<input key='key' type='text' value='" + key + "' />").css("width", '15em')
          item.append(fieldName)

          var fieldSelect = $("<input tag='field' type='text' />").css("width", "10em")
          fieldSelect.autocomplete({
            minLength: 0,
            source: fieldsList
          })
          fieldSelect.val(value.field)
          item.append(fieldSelect)

          var columnWidth = $("<input tag='width' type='number' />").css("width", "3em")
          if (value.width) {
            columnWidth.val(value.width)
          } else {
            columnWidth.val(settings.defaultColumnWidth)
          }
          item.append(columnWidth)

          var renderOption = $("<input tag='pattern' type='text' value='' />").css("width", "8em").css('display',
              'none')
          var renderCode = $("<textarea tag='code'></textarea>").css("width", "37em").css('height', "6em").css(
              'display', 'none')
          var renderSelect = $("<select tag='render'></select>")
          renderSelect.append("<option value='string'>String</option>")
          renderSelect.append("<option value='date'>Date</option>")
          renderSelect.append("<option value='number'>Number</option>")
          renderSelect.append("<option value='javascript'>JavaScript</option>")
          if (value.render == ReportRender.number) {
            renderSelect.val('number')
            renderOption.val(value.pattern)
            renderOption.css('display', 'inline')
            renderCode.css('display', 'none')
          } else if (value.render == ReportRender.date) {
            renderSelect.val('date')
            renderOption.val(value.pattern)
            renderOption.css('display', 'inline')
            renderCode.css('display', 'none')
          } else if (value.render && value.render != ReportRender.string) {
            renderSelect.val('javascript')
            renderOption.css('display', 'none')
            renderCode.val(value.render.toString())
            renderCode.css('display', 'block')
          } else {
            renderSelect.val('string')
            renderOption.css('display', 'none')
            renderCode.css('display', 'none')
          }
          item.append(renderSelect)
          item.append(renderOption)
          item.append(renderCode)

          renderSelect.change(function() {
            var type = $(this).val()
            renderOption.val('')
            if (type == 'number') {
              renderOption.css('display', 'inline')
              renderCode.css('display', 'none')
            } else if (type == 'date') {
              renderOption.css('display', 'inline')
              renderCode.css('display', 'none')
            } else if (type == 'javascript') {
              if (renderCode.val() == '') {
                if (value.render) {
                  renderCode.val(value.render.toString())
                }
                renderCode.val("function (value, config) {\n  return value;\n}")
              }
              renderOption.css('display', 'none')
              renderCode.css('display', 'block')
            } else {
              renderOption.css('display', 'none')
              renderCode.css('display', 'none')
            }
          })
          fieldSort.append(item)
        }
        $.each(settings.display, lineItemFunction)
        fieldSort.sortable({
          helper: 'clone'
        })

        var addButton = $("<button></button>").css('height', '2em').css('margin-top', '0.5em')
        addButton.button({
          icons: {
            primary: 'ui-icon-plusthick'
          },
          text: false
        }).click(function() {
          lineItemFunction('Name of Column', {})
          fieldSort.sortable('refresh')
        })
        fields.append(addButton)

        fieldsList.shift() // Remove the blank field
        var sort = dialog.find('[name=dialog_sort]')
        sort.children().remove()
        var orderSort = $("<ul></ul>").css("list-style-type", "none").css("margin", "0").css("padding", "0")
        sort.append(orderSort)
        var sortFields = []
        $.each(settings.criteria.sort, function(key, value) {
          sortFields.push(key)
          var item = $("<li></li>").addClass("ui-widget-content").css("padding", "0.4em")
          item.append($("<span></span>").addClass('ui-icon ui-icon-arrowthick-2-n-s').css("display", "inline-block"))
          var direction = $("<select key='" + key + "' name='sort'></select>")
          direction.append("<option value='-1'>Descending</option>")
          direction.append("<option value='0'>Natural</option>")
          direction.append("<option value='1'>Ascending</option>")
          direction.val(value)
          item.append(direction)
          item.append($("<span> " + key + " </span>"))
          orderSort.append(item)
        })
        orderSort.sortable()

        sortFields = arrayDiff(fieldsList, sortFields)
        $.each(sortFields, function(index, name) {
          var item = $("<li></li>").addClass("ui-widget-content").css("padding", "0.4em")
          item.append($("<span></span>").addClass('ui-icon ui-icon-arrowthick-2-n-s').css("display", "inline-block"))
          var direction = $("<select key='" + name + "' name='sort'></select>")
          direction.append("<option value='-1'>Descending</option>")
          direction.append("<option value='0' selected='selected'>Natural</option>")
          direction.append("<option value='1'>Ascending</option>")
          item.append(direction)
          item.append($("<span> " + name + " </span>"))
          orderSort.append(item)
        })
      }
      return settings.criteria
    }
  }

  $.fn.report = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.report');
    }
  }
})(jQuery)

ReportRender = {
  string: function(value, config) {
    if (value == null) {
      return ''
    }
    return value
  },
  number: function(value, config) {
    if (value == null) {
      return ''
    }
    return parseInt(value)
  },
  date: function(value, config) {
    if (value == null) {
      return ''
    }
    
    var date = new Date(value)
    var timezone = /\b(?:[PMCEA][SDP]T|(?:Pacific|Mountain|Central|Eastern|Atlantic) (?:Standard|Daylight|Prevailing) Time|(?:GMT|UTC)(?:[-+]\d{4})?)\b/g
    var timezoneClip = /[^-+\dA-Z]/g
    var pad = function(val, len) {
      val = String(val);
      len = len || 2;
      while (val.length < len)
        val = "0" + val;
      return val;
    };
    var i18n = {
      dayNames: [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday",
          "Friday", "Saturday" ],
      monthNames: [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec", "January",
          "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ]
    };
    var _ = "get", d = date[_ + "Date"](), D = date[_ + "Day"](), m = date[_ + "Month"](), y = date[_
        + "FullYear"](), H = date[_ + "Hours"](), M = date[_ + "Minutes"](), s = date[_ + "Seconds"](), L = date[_
        + "Milliseconds"](), o = date.getTimezoneOffset(), flags = {
      d: d,
      dd: pad(d),
      ddd: i18n.dayNames[D],
      dddd: i18n.dayNames[D + 7],
      m: m + 1,
      mm: pad(m + 1),
      mmm: i18n.monthNames[m],
      mmmm: i18n.monthNames[m + 12],
      yy: String(y).slice(2),
      yyyy: y,
      h: H % 12 || 12,
      hh: pad(H % 12 || 12),
      H: H,
      HH: pad(H),
      M: M,
      MM: pad(M),
      s: s,
      ss: pad(s),
      l: pad(L, 3),
      L: pad(L > 99 ? Math.round(L / 10) : L),
      t: H < 12 ? "a" : "p",
      tt: H < 12 ? "am" : "pm",
      T: H < 12 ? "A" : "P",
      TT: H < 12 ? "AM" : "PM",
      Z: (String(date).match(timezone) || [ "" ]).pop().replace(timezoneClip, ""),
      o: (o > 0 ? "-" : "+") + pad(Math.floor(Math.abs(o) / 60) * 100 + Math.abs(o) % 60, 4),
      S: [ "th", "st", "nd", "rd" ][d % 10 > 3 ? 0 : (d % 100 - d % 10 != 10) * d % 10]
    };
    var mask = String(config.pattern)
    return mask.replace(/d{1,4}|m{1,4}|yy(?:yy)?|([HhMsTt])\1?|[LloSZ]|"[^"]*"|'[^']*'/g, function($0) {
      return $0 in flags ? flags[$0] : $0.slice(1, $0.length - 1);
    });
  }
}