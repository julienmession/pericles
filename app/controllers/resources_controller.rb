class ResourcesController < ApplicationController
  include ProjectRelated

  lazy_controller_of :resource, belongs_to: :project
  decorates_method :resource

  def index
    respond_to do |format|
      format.html {}
      format.json do
        resources_query = project.resources.includes(
          :resource_instances,
          :request_routes,
          :responses,
          :used_resources,
          resource_representations: {
            attributes_resource_representations: :resource_attribute
          }
        )
        render(
          json: resources_query,
          include: 'used_resources',
          each_serializer: ResourceIndexSerializer
        )
      end
    end
  end

  def show
    respond_to do |format|
      format.html {}
      %i(swift java kotlin).each do |language|
        format.send(language) do
          render body: CodeGenerator.new(language).from_resource(resource).generate
        end
      end
      format.json { render json: resource, include: '**' }
    end
  end

  def new
  end

  def edit_attributes
    render layout: 'no_navbar_layout'
  end

  def edit_resource
    render layout: 'no_navbar_layout'
  end

  def create
    check_valid_json_object_param(params[:json_instance]) unless params[:json_instance].blank?
    if @json_instance_error.blank? && resource.save
      resource.try_create_attributes_from_json(params[:json_instance]) if params[:json_instance]
      redirect_to project_resource_path(project, resource)
    else
      @json_instance = params[:json_instance]
      render 'new', status: :unprocessable_entity
    end
  end

  def update
    if resource.update(resource_params)
      redirect_to project_resource_path(project, resource)
    else
      if resource_params.key? :resource_attributes_attributes
        template = 'edit_attributes'
      else
        template = 'edit_resource'
      end
      render template, status: :unprocessable_entity, layout: 'no_navbar_layout'
    end
  end

  def destroy
    begin
      resource.destroy
      redirect_to project_resources_path(project)
    rescue ActiveRecord::InvalidForeignKey
      flash.now[:error] = t('activerecord.errors.models.resource.attributes.base.destroy_failed_foreign_key')
      render 'show', status: :conflict
    end
  end

  private

  def check_valid_json_object_param(json_string)
    begin
      parsed_json = JSON.parse(json_string)
    rescue JSON::ParserError
      @json_instance_error = 'could not parse JSON'
      return
    end

    @json_instance_error = 'JSON is not an object' unless parsed_json.is_a? Hash
  end

  def resource_params
    return @resource_params if @resource_params

    @resource_params = params.require(:resource).permit(
      :name,
      :description,
      resource_attributes_attributes: [
        :id,
        :name,
        :description,
        :type,
        :is_array,
        :enum,
        :scheme_id,
        :minimum,
        :maximum,
        :min_items,
        :max_items,
        :nullable,
        :_destroy
      ],
      routes_attributes: [
        :id,
        :name,
        :description,
        :http_method,
        :url,
        :_destroy
      ]
    )
    @resource_params[:resource_attributes_attributes]&.each do |_, attribute|
      type = attribute.delete(:type)
      type_as_int = type.to_i.positive? ? type.to_i : nil
      attribute[:resource_id] = type_as_int
      attribute[:primitive_type] = type_as_int ? nil : type
    end
    @resource_params
  end

  def available_types
    return @available_types if defined? @available_types

    selectable_resources = project.resources.select(&:persisted?)
    primitive_types = Attribute.primitive_types.keys.to_a.map { |k| [k.capitalize, k]}
    resource_types = selectable_resources.sort_by(&:name).collect { |r| [ r.name, r.id ] }
    @available_types = primitive_types + resource_types
  end
  helper_method :available_types
end
