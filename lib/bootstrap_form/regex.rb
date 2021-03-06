module BootstrapForm
  module RegexFormBuilder
    extend ActiveSupport::Concern

    included do
      bootstrap_method_alias :regex_field
    end

    def regex_field_with_bootstrap(name, options = {})
      form_group_builder(name, options) do
        prepend_and_append_input(options) do
          regex_field_without_bootstrap(name, options)
        end
      end
    end
  end
end
