require 'net/https'

module HttpClient
  def self.get(url, &block)
    Session.new(url, nil,  nil, &block)
  end

  def self.post(url, params={}, &block)
    Session.new(url, nil, params, &block)
  end

  class Session
    attr_accessor :cookies, :response, :body, :status, :location

    def initialize(url, session=nil, params={}, &block)
      if session.nil?
        @cookies = {}
      else
        @cookies = session.cookies
      end
      handle_url(url, params, &block)
    end

    def redirect
      handle_url(location, nil)
    end

    def get(url, &block)
      handle_url(url, nil, &block)
    end

    def post(url, params={}, &block)
      handle_url(url, params, &block)
    end

    private
    def process_cookie_piece(token)
      pattern = Regexp.compile(/(.+?)=(.*)/)
      if token.start_with?('expires=')
        # TODO: Add support for cookie deletions. This is broken right now
        # since deleted cookies are actually being 'added' instead.
      elsif token.start_with?('path=')
      elsif token.start_with?('domain=')
      else
        match = token.match(pattern)
        @cookies[match[1]] = match[2] unless match.nil?
      end
    end

    def handle_url(url, params={}, &block)
      uri = URI.parse(url)
      http = Net::HTTP.new(uri.host, uri.port)
      http.open_timeout = 10
      http.use_ssl = true if uri.scheme == 'https'
      http.verify_mode = OpenSSL::SSL::VERIFY_NONE

      cookieList = []
      @cookies.each {|key, value| cookieList << "#{key}=#{value}" }
      headers = {}
      headers['Cookie'] = cookieList.join('; ') unless cookieList.length == 0

      path = uri.path == '' ? '/' : uri.path
      path = "#{path}?#{uri.query}" unless uri.query.nil?
      if params.nil?
        req = Net::HTTP::Get.new(path, headers)
      else
        req = Net::HTTP::Post.new(path, headers)
        req.form_data = params
      end

      http.start {
        @response = http.request(req)
        @body = @response.body
        @status = @response.code.to_i
        @location = @response['Location'] if @status >= 300 and @status < 400
        unless @location.nil?
          @location = "#{uri.scheme}://#{uri.host}:#{uri.port}/#{@location}" if @location.start_with?('/')
        end
        cookie = @response['set-cookie']
        unless cookie.nil?
          cookie.split(/; /).each {|token|
            if token.count('=') > 1
              token.split(/, /).each {|t| process_cookie_piece t }
            else
              process_cookie_piece token
            end
          }
        end
        self.instance_eval(&block) if block_given?
      }
    end
  end
end
