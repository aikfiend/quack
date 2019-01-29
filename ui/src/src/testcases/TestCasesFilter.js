import React, { Component } from 'react';
import SubComponent from '../common/SubComponent'
import LaunchForm from '../launches/LaunchForm'
import { Link } from 'react-router-dom';
import axios from "axios";
import { withRouter } from 'react-router';
import Select from 'react-select';
import queryString from 'query-string';
import $ from 'jquery';

class TestCasesFilter extends Component {
    constructor(props) {
        super(props);

        this.defaultFilters = [{
              title: "Select an attribute",
              values: []
        }]

        this.state = {
             groupsToDisplay: [],
             projectAttributes: [],
             createdLaunch: {
                  name: "",
                  testSuite: {filter: {}},
                  properties: []
             },
             testSuite: {
                name: "",
                filter: {
                     groups: [],
                     filters: this.defaultFilters
                 }
             },
             testSuiteNameToDisplay: ""
         };

        this.changeGrouping = this.changeGrouping.bind(this);
        this.getValuesByAttributeId = this.getValuesByAttributeId.bind(this);
        this.changeFilterAttributeId = this.changeFilterAttributeId.bind(this);
        this.changeFilterAttributeValues = this.changeFilterAttributeValues.bind(this);
        this.handleFilter = this.handleFilter.bind(this);
        this.getAttributeName = this.getAttributeName.bind(this);
        this.createLaunchModal = this.createLaunchModal.bind(this);
        this.saveSuite = this.saveSuite.bind(this);
        this.showSuiteModal = this.showSuiteModal.bind(this);
        this.suiteAttrChanged = this.suiteAttrChanged.bind(this);
        this.updateAttributesNames = this.updateAttributesNames.bind(this);
    }

    componentWillReceiveProps(nextProps) {
      if (nextProps.projectAttributes){
        this.state.projectAttributes = nextProps.projectAttributes;
        this.updateAttributesNames();
      }
      this.setState(this.state);
    }

    updateAttributesNames(){
        this.state.testSuite.filter.filters.forEach(function(filter){
            filter.name = this.getAttributeName(filter.id);
        }.bind(this))

        this.state.groupsToDisplay.forEach(function(groupToDisplay){
            groupToDisplay.label = this.getAttributeName(groupToDisplay.value);
        }.bind(this))
    }

    componentDidMount(){
        var params = queryString.parse(this.props.location.search);

        if (params.testSuite){
            axios
              .get("/api/" + this.props.match.params.project + "/testsuite/" + params.testSuite)
              .then(response => {
                   this.state.testSuite = response.data;
                   this.state.testSuiteNameToDisplay = this.state.testSuite.name;
                   this.updateAttributesNames();
                   this.setState(this.state);
                   this.refreshTree();
              })
              .catch(error => console.log(error));
        } else {
            if (params.groups){
                if(!Array.isArray(params.groups)){
                    params.groups = [params.groups];
                }
                this.state.testSuite.filter.groups = params.groups;
                this.state.groupsToDisplay = params.groups.map(function(attrId){
                    return {value: attrId, label:this.getAttributeName(attrId)};
                }.bind(this))
            }
            if (params.attribute){
                if(!Array.isArray(params.attribute)){
                    params.attribute = [params.attribute];
                }
                var map = {}
                params.attribute.forEach(function(pair){
                    var key = pair.split(":")[0];
                    var value = pair.split(":")[1];
                    if (!map[key]){
                        map[key] = [];
                    }
                    map[key].push(value);
                })

                Object.keys(map).forEach(function(key) {
                    this.state.testSuite.filter.filters.push({
                        id: key,
                        values: map[key],
                        title: this.getAttributeName(key)

                    });
                }.bind(this))

                if (!this.state.testSuite.filter.filters[0].id){
                    var emptyFilter = this.state.testSuite.filter.filters[0];
                    this.state.testSuite.filter.filters.push(emptyFilter);
                    this.state.testSuite.filter.filters.shift();
                }

            }

        }

        this.setState(this.state);
        this.props.onFilter(this.state.testSuite.filter);

    }

    changeFilterAttributeId(index, value){
        var oldId = this.state.testSuite.filter.filters[index].id;
        this.state.testSuite.filter.filters[index].id = value.value;
        this.state.testSuite.filter.filters[index].name = value.label;
        if (oldId !== value.value){
            this.state.testSuite.filter.filters[index].values = [];
        }
        if (!oldId){
            this.state.testSuite.filter.filters.push({
                id: null,
                title: "Select an attribute",
                values: []
            })
        }

        this.setState(this.state);
    }

    changeFilterAttributeValues(index, values){
        this.state.testSuite.filter.filters[index].values = values.map(function(value){return value.value});
        this.setState(this.state);
    }

    changeGrouping(values){
        this.state.testSuite.filter.groups = values.map(function(value){return value.value});
        this.state.groupsToDisplay = values;
        this.setState(this.state);
    }

    getValuesByAttributeId(id){
        if(!id) return [];
        return (this.state.projectAttributes.find(function(attribute){return attribute.id === id}) || {values: []}).values;
    }

    handleFilter(){
        this.props.onFilter(this.state.testSuite.filter);
    }

    getAttributeName(id){
        return (this.state.projectAttributes.find(function(attribute){return attribute.id === id}) || {values: []}).name;
    }

    createLaunchModal(){
        this.state.createdLaunch = {
             name: "",
             testSuite: {filter: {}},
             properties: []
        }
        this.setState(this.state);
        $("#launch-modal").modal('toggle');
    }

    saveSuite(event){
        var suiteToSave = JSON.parse(JSON.stringify(this.state.testSuite));
        (suiteToSave.filter.filters || []).forEach(function(filter){
            delete filter.title;
        })
        axios.post('/api/' + this.props.match.params.project + '/testsuite/', suiteToSave)
            .then(response => {
                this.state.testSuite = response.data;
                this.state.testSuiteNameToDisplay = this.state.testSuite.name;
                this.setState(this.state);
                $("#suite-modal").modal('toggle');
                this.props.history.push('/' + this.props.match.params.project + '/testcases?testSuite=' + this.state.testSuite.id)
            })
        event.preventDefault();
    }

    showSuiteModal(){
        $("#suite-modal").modal('toggle');
    }

    suiteAttrChanged(event){
        this.state.testSuite[event.target.name] = event.target.value;
        this.setState(this.state);
    }

    render() {
        return (
            <div>
                <h2>{this.state.testSuiteNameToDisplay}</h2>
                <div>
                    <div className="row">
                        <div className="col-1">Grouping</div>
                        <div className="col-3">
                            <Select value={this.state.groupsToDisplay}
                                    isMulti
                                    onChange={this.changeGrouping}
                                    options={this.state.projectAttributes.map(function(val){return {value: val.id, label: val.name}})}
                                   />
                        </div>
                    </div>
                    <div className="row">
                        <div className="col-1">Filter</div>
                            {
                                this.state.testSuite.filter.filters.map(function(filter, i){
                                    return(
                                    <div className="col-5" key={i}>
                                        <div className="row">
                                            <Select className="col-5 filter-attribute-id-select" value={{value: filter.id, label: filter.name}}
                                                    onChange={(e) => this.changeFilterAttributeId(i, e)}
                                                    options={this.state.projectAttributes.map(function(val){return {value: val.id, label: val.name}})}
                                                   />
                                            <Select className="col-7 filter-attribute-val-select" value={filter.values.map(function(value){return {value: value, label: value}})}
                                                    isMulti
                                                    onChange={(e) => this.changeFilterAttributeValues(i, e)}
                                                    options={this.getValuesByAttributeId(filter.id).map(function(val){return {value: val, label: val}})}
                                                   />
                                        </div>
                                    </div>
                                    )
                                }.bind(this))

                            }

                    </div>
                    <button type="button" className="btn btn-primary" onClick={this.handleFilter}>Filter</button>
                    <button type="button" className="btn btn-primary" onClick={this.showSuiteModal}>Save</button>
                    <button type="button" className="btn btn-primary" onClick={this.createLaunchModal}>Launch</button>
                </div>
                <div className="modal fade" id="launch-modal" tabIndex="-1" role="dialog" aria-labelledby="launchLabel" aria-hidden="true">
                    <LaunchForm filter={this.state.testSuite.filter} launch={this.state.createdLaunch}/>
                </div>

                <div className="modal fade" id="suite-modal" tabIndex="-1" role="dialog" aria-labelledby="suiteLabel" aria-hidden="true">
                    <div className="modal-dialog" role="document">
                        <div className="modal-content">
                          <div className="modal-header">
                            <h5 className="modal-title" id="editAttributeLabel">Attribute</h5>
                            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                              <span aria-hidden="true">&times;</span>
                            </button>
                          </div>

                          <div>
                            <div className="modal-body" id="suite-save-form">
                                <form>
                                  <label>
                                    Name:
                                    <input type="text" name="name" onChange={this.suiteAttrChanged} />
                                  </label>
                                </form>
                            </div>
                          </div>

                          <div className="modal-footer">
                            <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
                            <button type="button" className="btn btn-primary" onClick={this.saveSuite}>Save</button>
                          </div>
                        </div>
                     </div>
                </div>


            </div>
        );
      }


}

export default withRouter(TestCasesFilter);
