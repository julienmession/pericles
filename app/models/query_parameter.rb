class QueryParameter < ApplicationRecord
  enum primitive_type: [:integer, :string, :boolean]

  belongs_to :route

  validates :name, presence: true
  validates :primitive_type, presence: true
  validates :route, presence: true

  audited associated_with: :route
end
