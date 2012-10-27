(function($) {
  var methods = {
    init: function(options) {
      var $this = $(this)
      var div = $("<div class='ui-widget-content ui-corner-all'></div>").css("display", "none").css("background-color",
          "#fff").css("position", "fixed").css("z-index", "30")
      div.data('instance', $this)
      $this.after(div)
      $this.focus(function() {
        div.css("top", $this.offset().top + $this.outerHeight()).css("left", $this.offset().left)
        div.show('fast')
      })
      $(document).mousedown(function(e) {
        var hide = true
        $(e.target).parents().each(function(i, p) {
          if ($(p).data('instance') == $this) {
            hide = false
          }
        })
        if (hide) { div.hide('fast'); }
      })

      div.append("<input type='search' name='address.lines.0' placeholder='Line 1'>")
      div.append("<input type='search' name='address.lines.1' placeholder='Line 2'><br/>")

      var postalWidth = div.outerWidth()
      postalWidth -= $this.outerWidth() / 3
      postalWidth -= $this.outerWidth()
      postalWidth -= ($this.outerWidth() - $this.width()) * 2

      div.append("<input type='search' name='address.lines.2' placeholder='Line 3'>")
      div.append("<input type='search' name='address.lines.3' placeholder='Line 4'><br/>")
      div.append("<input type='search' name='address.city' placeholder='City'>")
      div.append("<input type='search' name='address.state' placeholder='State'>")
      div.append("<input type='search' name='address.postal' placeholder='Postal'><br/>")
      div.append("<input type='search' name='address.county' placeholder='County'>")
      div.append("<input type='search' name='address.country' placeholder='Country'><br/>")
      div.find("input[name=address\\.state]").width($this.width() / 3)
      div.find("input[name=address\\.postal]").width(postalWidth)
      div.find("input").change(function() {
        var msg = []
        div.find("input").each(function(index, input) {
          if ($(input).val()) {
            msg.push($(input).attr('placeholder'))
          }
        })
        $this.val(msg.join(", "))
      })
      div.css("padding", "0.2em") // this is at end because postalWidth calculation breaks with padding
    }
  }

  $.fn.address = function(method) {
    if (methods[method]) {
      return methods[method].apply(this, Array.prototype.slice.call(arguments, 1));
    } else if (typeof method === 'object' || !method) {
      return methods.init.apply(this, arguments);
    } else {
      $.error('Method ' + method + ' does not exist on jQuery.address');
    }
  }
})(jQuery)
