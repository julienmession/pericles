require 'test_helper'

class AttributesResourceRepresentationTest < ActiveSupport::TestCase
  test "A resource_representation shouldn't be associated with the same attribute twice" do
    resource_representation = create(:resource_representation)
    attribute = create(:attribute, parent_resource: resource_representation.resource)
    create(:attributes_resource_representation, resource_attribute: attribute,
     parent_resource_representation: resource_representation)
    assert_not build(:attributes_resource_representation, resource_attribute: attribute,
     parent_resource_representation: resource_representation).valid?
  end

  test "An attributes_resource_representation with an attribute that has a resource type shouldn't have a custom_enum" do
    attribute = create(:attribute_with_resource)
    assert_not build(:attributes_resource_representation, resource_attribute: attribute, custom_enum: "not, valid").valid?
  end

  test "An attributes_resource_representation with an attribute that is a boolean shouldn't have a custom_enum" do
    attribute = create(:attribute, primitive_type: :boolean)
    assert_not build(:attributes_resource_representation, resource_attribute: attribute, custom_enum: "not, valid").valid?
  end

  test "An attributes_resource_representation with an attribute that is not a string shouldn't have a custom_pattern" do
    attribute_with_resource = create(:attribute_with_resource)
    boolean_attribute = create(:attribute, primitive_type: :boolean)
    assert_not build(:attributes_resource_representation, resource_attribute: attribute_with_resource, custom_pattern: "[a]").valid?
    assert_not build(:attributes_resource_representation, resource_attribute: boolean_attribute, custom_pattern: "[a]").valid?
  end
end
