import HttpClient from '../http/client.js';


export default {
  state: {
    resource: {
      id: '',
      name: '',
      attributes: [],
      representations: [],
    },
    originalResource: {},
    manageMode: false,
    activeRepresentation: null,
    newRepresentationName: '',
    representationsToDelete: new Set(),
    sortMode: localStorage.getItem('sortMode'),
    searchQuery: '',
    projectId: document.location.pathname.split('/')[2],
    resourceId: document.location.pathname.split('/')[4],
  },
  client: new HttpClient(),
  fetchResource: function() {
    return this.client.fetchResource(
      this.state.projectId, this.state.resourceId
    ).then((data) => {
      let viewModel = this.mapDataToViewModel(data);
      Object.assign(this.state.originalResource, JSON.parse(JSON.stringify(viewModel)));
      Object.assign(this.state.resource, viewModel);
      this.setDefaultActiveRepresentation();
    });
  },
  mapDataToViewModel: function(data) {
    let resourceRepresentationsData = data.resource.resource_representations.filter((r) =>
      !this.state.representationsToDelete.has(r.id)
    ).sort((a, b) => a.id - b.id);

    let attributes = data.resource.resource_attributes.map((a) =>
      this.mapResourceAttributeToViewModel(a, resourceRepresentationsData)
    );
    attributes = this.sortAttributes(attributes);

    return {
      id: data.resource.id,
      name: data.resource.name,
      attributes: attributes,
      representations: resourceRepresentationsData.map((r, i) =>
        Object.assign({}, {
          id: r.id,
          name: r.name,
          colorClass: 'color-' + i,
          isSelected: false
        })
      )
    };
  },
  mapResourceAttributeToViewModel: function(attribute, resourceRepresentationsData) {
    return Object.assign({}, {
      id: attribute.id,
      name: attribute.name,
      type: attribute.readable_type,
      displayedType: attribute.readable_type,
      resourceId: attribute.resource_id,
      scheme: attribute.scheme,
      enum: attribute.enum,
      minimum: attribute.minimum,
      maximum: attribute.maximum,
      minItems: attribute.min_items,
      maxItems: attribute.max_items,
      description: attribute.description,
      nullable: attribute.nullable,
      isArray: attribute.is_array,
      availableRepresentations: attribute.available_resource_representations,
      isDisplayed: true,
      representations: resourceRepresentationsData.filter((r) =>
        !this.state.representationsToDelete.has(r.id)
      ).map((r, i) => {
        let association = r.attributes_resource_representations
          .find((arr) => arr.attribute_id === attribute.id);
        return {
          id: r.id,
          associationId: association && association.id,
          customKeyName: association && association.custom_key_name,
          isRequired: (association == null) ? true : association.is_required,
          isNull: association && association.is_null,
          hasAttribute: !!association,
          colorClass: 'color-' + i,
          resourceRepresentationName: association && association.resource_representation_name,
          selectedRepresentationId: this.getDefaultSelectedRepresentationId(attribute, association)
        }
      })
    });
  },
  toggleSelect: function(representationId) {
    let activeRepresentationIsSelected = this.state.activeRepresentation && representationId == this.state.activeRepresentation.id;
    if (this.state.manageMode && !activeRepresentationIsSelected) {
      this.unselectAll();
    }

    let representation = this.state.resource.representations
      .find((r) => r.id === representationId);
    representation.isSelected = !representation.isSelected;

    this.updateStateAfterSelectionChanged();
  },
  unselectAll: function() {
    const resource = this.state.resource;
    resource.representations = resource.representations.map((r) =>
      Object.assign({}, r, {isSelected: false})
    );

    this.updateStateAfterSelectionChanged();
  },
  setManageMode: function(boolean) {
    this.state.manageMode = boolean;
    let representations = this.state.resource.representations
    if (representations.filter((r) => r.isSelected).length > 1) {
      this.unselectAll();
    }
  },
  restoreState: function() {
    Object.assign(this.state.resource, JSON.parse(JSON.stringify(this.state.originalResource)));
    this.setManageMode(false);
    this.state.representationsToDelete.clear();
    this.updateStateAfterSelectionChanged();
  },
  toggleBelongingAttribute: function(attributeId, representationId) {
    let attribute = this.state.resource.attributes.find((a) => a.id === attributeId);
    let representation = attribute.representations.find(
      (r) => r.id === representationId
    );
    representation.hasAttribute = !representation.hasAttribute;
  },
  computeIsDislayedForAttributes: function() {
    let attributes = this.state.resource.attributes;
    let activeRepresentations = this.state.resource.representations.filter(
      (r) => r.isSelected
    );

    if(activeRepresentations.length === 0) {
      attributes.forEach((a) => a.isDisplayed = this.shouldDisplayAttributeBySearchQuery(a));
    }

    attributes.forEach((a) => {
      let representationsWithAttribute = a.representations.filter((r) => r.hasAttribute);
      a.isDisplayed = activeRepresentations.every((activeRep) =>
        representationsWithAttribute.find((r) => r.id === activeRep.id)
      );
      a.isDisplayed &= this.shouldDisplayAttributeBySearchQuery(a);
    });
  },
  computeDisplayedTypeForAttributes: function() {
    let attributes = this.state.resource.attributes;

    if (this.state.activeRepresentation) {
      attributes.forEach((a) => {
        let repViewModel = a.representations.find((r) => r.id === this.state.activeRepresentation.id);
        if (!repViewModel.resourceRepresentationName) {
          return a.displayedType = a.type;
        }

        a.displayedType = repViewModel.resourceRepresentationName;
        if (a.isArray) {
          a.displayedType = 'Array<' + a.displayedType + '>';
        }
      });
    } else {
      attributes.forEach((a) => a.displayedType = a.type);
    }
  },
  computeActiveRepresentation: function() {
    let activeRepresentations = this.state.resource.representations.filter(
      (r) => r.isSelected
    );
    if (activeRepresentations.length === 1) {
      this.state.activeRepresentation = activeRepresentations[0];
    } else {
      this.state.activeRepresentation = null;
    }
  },
  updateStateAfterSelectionChanged: function() {
    this.computeActiveRepresentation();
    this.computeIsDislayedForAttributes();
    this.computeDisplayedTypeForAttributes();
  },
  updateResourceRepresentations: function() {
    let resource = this.state.resource;
    let promises = resource.representations.map((rep) => {
      let id = rep.id;
      let data = Object.assign({}, {
        name: rep.name,
        description: rep.description,
        attributes_resource_representations_attributes: resource.attributes.map(
          (a) => {
            let attributeRepresentation = a.representations.find((r) => r.id === rep.id);
            return {
              id: attributeRepresentation.associationId,
              custom_key_name: attributeRepresentation.customKeyName,
              is_required: attributeRepresentation.isRequired,
              is_null: attributeRepresentation.isNull,
              attribute_id: a.id,
              resource_representation_id: attributeRepresentation.selectedRepresentationId,
              _destroy: !attributeRepresentation.hasAttribute
            };
        })
      });

      return this.client.updateResourceRepresentation(resource.id, id, data);
    });

    promises.concat([...this.state.representationsToDelete].map(
      (id) => this.deleteRepresentation(id)
    ));
    this.state.representationsToDelete.clear();

    // TODO: catch error
    Promise.all(promises).finally(() => {
      let activeRepresentationId = this.state.activeRepresentation && this.state.activeRepresentation.id;
      this.fetchResource().then(() => {
        let activeRepresentation = this.state.resource.representations.find((r) => r.id == activeRepresentationId);
        if (activeRepresentation) {
          activeRepresentation.isSelected = true;
        }
        this.setManageMode(false);
        this.updateStateAfterSelectionChanged();
      });
    });
  },
  getDefaultSelectedRepresentationId: function(attributeData, association) {
    let selectedRepresentationId = association && association.resource_representation_id;
    let availableReps = attributeData.available_resource_representations;
    let defaultRepresentation = availableReps && availableReps[0];
    return selectedRepresentationId || (defaultRepresentation && defaultRepresentation.id);
  },
  setSelectedRepresentation(attributeId, newSelectedRepresentation) {
    let a = this.state.resource.attributes.find((a) => a.id === attributeId);
    let r  = a.representations.find((r) => r.id === this.state.activeRepresentation.id);
    r.selectedRepresentationId = newSelectedRepresentation.id;
  },
  setNewRepresentationName: function(value) {
    this.state.newRepresentationName = value;
  },
  getNewRepresentationName: function() {
    return this.state.newRepresentationName;
  },
  createNewRepresentation: function() {
    let resource = this.state.resource;
    return this.client.createNewRepresentation(
      resource.id, this.state.newRepresentationName
    ).then((data) => {
      this.state.newRepresentationName = null;
      this.fetchResource();
    });
  },
  markRepresentationToBeDeleted(id) {
    let resource = this.state.resource;
    this.state.representationsToDelete.add(id);
    resource.representations = resource.representations.filter(
      (r) => r.id != id
    )
    resource.attributes.forEach((a) => {
      a.representations = a.representations.filter(
        (r) => r.id != id
      )
    });
    if (this.state.activeRepresentation && this.state.activeRepresentation.id == id) {
      this.state.activeRepresentation = null;
    }
  },
  deleteRepresentation: function(id) {
    let resource = this.state.resource;
    return this.client.deleteRepresentation(resource.id, id);
  },
  setDefaultActiveRepresentation: function() {
    let hash = document.location.hash;
    if(!hash || hash.indexOf('rep-') === -1) {
      return;
    }

    let representationId = hash.split('rep-')[1];
    let r  = this.state.resource.representations.find(
      (r) => r.id == representationId
    );
    r.isSelected = true;
    document.location.hash = '';
    this.updateStateAfterSelectionChanged();
  },
  alphabeticalSort: function() {
    this.state.sortMode = (this.state.sortMode === 'alphabetical') ? 'none' : 'alphabetical';
    this.onSortModeChange();
  },
  typeSort: function() {
    this.state.sortMode = (this.state.sortMode === 'type') ? 'none' : 'type';
    this.onSortModeChange();
  },
  onSortModeChange: function() {
    localStorage.setItem('sortMode', this.state.sortMode);
    this.state.resource.attributes = this.sortAttributes(this.state.resource.attributes);
  },
  sortAttributes: function(attributes) {
    if (this.state.sortMode === 'alphabetical') {
      return attributes.sort(
        (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      );
    } else if (this.state.sortMode === 'type') {
      return attributes.sort(
        (a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase())
      ).sort(
        (a, b) => a.displayedType.toLowerCase().localeCompare(b.displayedType.toLowerCase())
      );
    } else {
      return attributes.sort((a, b) => a.id - b.id);
    }
  },
  setSearchQuery: function(newQuery) {
    this.state.searchQuery = newQuery;
    this.computeIsDislayedForAttributes();
  },
  shouldDisplayAttributeBySearchQuery: function(attribute) {
    let query = this.state.searchQuery.toLowerCase();
    if (query.length === 0) {
      return true;
    }

    let isMatchingName = attribute.name.toLowerCase().indexOf(query) != -1;
    if (this.state.activeRepresentation) {
      let attributeRepresentation = attribute.representations.find(
        (r) => r.id === this.state.activeRepresentation.id
      );
      let customKeyName = attributeRepresentation.customKeyName;
      if (customKeyName) {
        isMatchingName |= customKeyName.toLowerCase().indexOf(query) != -1;
      }
    }
    return isMatchingName;
  },
  clone: function(representationId) {
    let resource = this.state.resource;
    return this.client.cloneRepresentation(
      resource.id, representationId
    ).then((data) => {
      this.fetchResource();
    });
  }
}