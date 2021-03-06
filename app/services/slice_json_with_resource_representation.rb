class SliceJSONWithResourceRepresentation
  def initialize(json, resource_representation)
    @json = json.deep_symbolize_keys
    @resource_representation = resource_representation
  end

  def execute
    sliced_json = {}

    @resource_representation.attributes_resource_representations.each do |attr_res_rep|
      key = attr_res_rep.key_name.to_sym

      next unless @json.key? key
      if attr_res_rep.is_null
        sliced_json[key] = nil
        next
      end

      if attr_res_rep.resource_representation
        if attr_res_rep.resource_attribute.is_array
          sliced_json[key] = @json[key].map { |e| SliceJSONWithResourceRepresentation.new(e, attr_res_rep.resource_representation).execute }
        else
          sliced_json[key] = SliceJSONWithResourceRepresentation.new(@json[key], attr_res_rep.resource_representation).execute
        end
      else
        sliced_json[key] = @json[key]
      end
    end
    sliced_json
  end
end