module RoutesHelper
  def format_json_schema(json_schema)
    return if json_schema.blank?
    JSON.pretty_generate(JSON.parse(json_schema))
  end

  def route_includes_json_schema(route)
    return true unless route.request_body_schema.blank?
    route.responses.each do |response|
      return true unless response.body_schema.blank?
    end
    return false
  end

  def query_param_is_optional_to_string(query_param)
    query_param.is_optional ? t('optional') : t('required')
  end
end