class MakeRequestToServerService

  def initialize(server_url, request)
    @server_url = server_url
    @request = request
  end

  def execute
    url = URI.join(@server_url, @request.params[:path]).to_s
    url = URI.join(url, '?' + @request.query_string).to_s unless @request.query_string.blank?

    begin
      RestClient.send(@request.method.downcase, url, body: '')
    rescue RestClient::ExceptionWithResponse => e
      e.response
    end
  end
end
