class Swagger::ProjectDecorator < Draper::Decorator
  delegate_all

  def to_swagger
    {
      openapi: "3.0.0",
      info: {
        description: description,
        title: title,
        version: '1.0.0'
      },
      servers: servers,
      tags: tags,
      paths: paths,
      components: components,
    }.deep_stringify_keys.to_json
  end

  def components
    {
      schemas: resource_representation_definitions.merge(response_definitions)
    }
  end

  def resource_representation_definitions
    resource_representations.reduce({}) do |hash, r|
      representation = JSONSchema::ResourceRepresentationDecorator.new(
        r, context: context
      )

      hash.merge!({
        representation.uid => representation.json_schema_without_definitions
      })
    end
  end

  def response_definitions
    responses.select(&:json_schema).reduce({}) do |hash, r|
      response = JSONSchema::ResponseDecorator.new(
        r, context: context
      )
      uid = Swagger::ResponseDecorator.new(r, context: context).uid

      hash.merge!({
        uid => response.json_schema.except(:definitions)
      })
    end
  end

  def servers
    if proxy_configuration
      [
        {
          url: proxy_configuration.target_base_url,
          description: 'Proxied server'
        }
      ]
    else
      []
    end
  end

  def tags
    routes.map(&:resource).uniq.map do |r|
      {
        name: r.name,
        description: r.description
      }.select { |_, v| !v.blank? }
    end
  end

  def paths
    routes_by_url = routes.group_by do |r|
      r.url.starts_with?('/') ? r.url : "/#{r.url}"
    end

    routes_by_url.reduce({}) do |hash, (url, routes)|
      routes_by_method = routes.reduce({}) do |h, r|
        r = Swagger::RouteDecorator.new(r, context: context)

        h.merge!({
          r.http_method.to_s.downcase => r.to_swagger
        })
      end

      hash.merge!({
        url => routes_by_method
      })
    end
  end

  def context
    {
      base_href: "#/components/schemas/",
      use_nullable: true
    }.merge(super)
  end
end
