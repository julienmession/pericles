class AttributesResourceRepresentation < ApplicationRecord
  belongs_to :parent_resource_representation, inverse_of: :attributes_resource_representations,
   class_name: "ResourceRepresentation"
  belongs_to :resource_attribute, inverse_of: :attributes_resource_representations, class_name: "Attribute",
   foreign_key: "attribute_id"
  belongs_to :resource_representation

  validates :parent_resource_representation, presence: true
  validates :resource_attribute, presence: true, uniqueness: { scope: [:parent_resource_representation] }
  validates :custom_enum, absence: true, unless: :attribute_is_enumerable?
  validates :custom_pattern, absence: true, unless: "resource_attribute.string?"

  private

  def attribute_is_enumerable?
    resource_attribute.primitive_type && !resource_attribute.boolean?
  end
end
