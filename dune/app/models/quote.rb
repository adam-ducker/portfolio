class Quote < ApplicationRecord
  validates :by, presence: true
  validates :content, presence: true
end
