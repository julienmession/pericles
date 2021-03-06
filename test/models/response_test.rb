require 'test_helper'

class ResponseTest < ActiveSupport::TestCase
  test "shouldn't exist without a status_code" do
    assert_not build(:response, status_code: nil).valid?
  end

  test "shouldn't exist without a route" do
    assert_not build(:response, route: nil).valid?
  end

  test "json_schema should be nil if response has no resource_representation" do
    assert_nil build(:response, resource_representation: nil).json_schema
  end

  test "shoud have json_schema if response has resource_representation" do
    assert build(:response, resource_representation: build(:resource_representation)).json_schema
  end

  test "have a project" do
    assert build(:response).project
  end

  test "have metadata reflected in json_schema" do
    response = build(:response,
      root_key: 'root',
      resource_representation: build(:resource_representation)
    )
    response.metadata << build(:metadatum, name: 'metadatakey')
    assert response.json_schema[:properties].key? :metadatakey
  end
end
