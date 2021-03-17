import FileSaver from 'file-saver';
import config from '../config.json';
import jsyaml from "js-yaml"
import fs from "fs";

var example = fs.readFileSync("CodeExample.cpp", 'utf8').toString();

var code;
var clang_options;
var clang_version;

$(document).ready(function(){
	$.ajax({
		url: config.url + '/doc',
		type: 'GET',
		dataType: 'json',
		crossDomain: true,
		success: create_inputs,
		error: handle_ajax_error
	});

	code = ace.edit('code');
	code.setTheme('ace/theme/twilight');
	code.getSession().setMode('ace/mode/c_cpp');
	code.getSession().setUseSoftTabs(false);
	code.getSession().setTabSize(2);
	code.getSession().setUseWrapMode(false);
	code.setOption('showInvisibles', true);
	code.setPrintMarginColumn(80);
	code.$blockScrolling = Infinity;
	code.getSession().setValue(example);


	$('#update_button').on('click', function(evt){
		request_update(clang_options, clang_version);
	});
	$('#save_button').on('click', function(evt){
		save_config(clang_options, clang_version);
	});
	$('#load_button').on('change', load_config);
});

function update_code(data){
	var range = code.selection.getRange();
	code.getSession().setValue(data);
	code.selection.setRange(range);
}

function request_update(clang_options, version){
	var new_config = get_config(clang_options, version);
	code.getSession().setTabSize(new_config.TabWidth || 2);
	code.setPrintMarginColumn(new_config.ColumnLimit || 80);
	var range = code.selection.getRange();

	var options = {
		config: JSON.stringify(new_config),
		version: version,
		code: code.getSession().getValue()
	};

	if(range.start.row != range.end.row && range.start.column != range.end.column)
		options.range = range.start.row + ':' + range.end.row;

	$.ajax({
		url: config.url + '/format',
		type: 'POST',
		dataType: 'json',
		crossDomain: true,
		success: update_code,
		error: handle_ajax_error,
		data: options
	});
}

function load_config(evt){
	_.each(evt.target.files, function(file){
		var reader = new FileReader();
		reader.onload = function(load_event){
			var yml = load_event.target.result;
			try{
				var data = jsyaml.safeLoad(yml);
			}
			catch(err){
				alert('The file you uploaded does not appear to be a valid YAML file');
			}

			_.each(data, function(value, key){
				var clang_option = clang_options[clang_version][key];
				if(clang_option){
					if (key == 'BraceWrapping') {
						_.each(value, function(value, key) {
							$(`#${key}`).prop('checked', value);
						})
					} else {
						$('#' + key).val(value);
					}
				}
				else
				{
					console.log(key, value);
				}
			});
			request_update(clang_options, clang_version);
		};
		reader.readAsText(file);
	});
	evt.target.value = '';
}

function save_config(clang_options, version){
	var config = get_config(clang_options, version);
	var yml;
	if(_.size(config))
	{
		try {
			yml = jsyaml.safeDump(config);
		} catch (error) {
			console.log(error);
		}
	}
	else
		yml = '';
	var blob = new Blob(['---\n',yml,'\n...\n'], {type: 'text/plain;charset=utf-8'});
	FileSaver.saveAs(blob, '.clang-format');
}


function get_config(options, version){
	var result = {};
	$.each(options[version], function(key, value){
		var option_value = {};
		if (key == 'BraceWrapping') {
			if ($('#BreakBeforeBraces').val() == 'Custom') {
				$.each(value.options, function(key, value) {
					option_value[value] = $(`#${value}`).is(':checked');
				});
			}
		} else {
			option_value = $(`#${key}`).val();
		}
		if(option_value && option_value !== 'Default')
			result[key] = option_value;
	});
	return result;
}

function create_inputs(options){

	var container = $('#options');

	if(typeof(clang_version) === 'undefined')
	{
		clang_options = options;
		clang_version = options.versions[0];

		var version_input = select_input('clang_version', options.versions);
		$(version_input).appendTo($('#version'));

		$('#clang_version').on('change', function(evt){
			clang_version = $('#clang_version').val();
			container.empty();
			create_inputs(options);
			request_update(clang_options, clang_version);
		});
	}

	$.each(options[clang_version], function(key, value){
		var input = create_input(key, value);
		$(input).appendTo(container);
	});

	$('.form-control, .flags_input').on('change', function(evt){
		request_update(clang_options, clang_version);
	});

}

function create_input(option_name, option_details){
	var input_template;

	if(option_details.type === 'BraceWrappingFlags')
		input_template = flags_input(option_name, option_details.options);
	else if($.isArray(option_details.options))
		input_template = select_input(option_name, ['Default'].concat(option_details.options));
	else if(option_details.type === 'bool')
		input_template = select_input(option_name, ['Default', true, false]);
	else if(option_details.type === 'std::string' || option_details.type === 'string')
		input_template = string_input(option_name);
	else if(option_details.type === 'std::vector<std::string>')
		input_template = string_input(option_name);
	else if(option_details.type === 'int')
		input_template = int_input(option_name);
	else if(option_details.type === 'unsigned')
		input_template = int_input(option_name, 0);
	else
	{
		console.log('No input created for ' + option_name + ' (type: ' + option_details.type + ')');
	}

	var template =
		'<div class="form-group">' +
		'	<label class="col-sm-8">' +
		'		<a href="#<%= option_name %>_collapse" data-toggle="collapse"><i class="fa fa-info-circle"></i></a>' +
		'		<%= option_name %>:' +
		'	</label>' +
		'	<div class="col-sm-4">' +
		input_template +
		'	</div>' +
		'</div>' +
		'<div class="collapse" id="<%= option_name %>_collapse">' +
		'	<div class="well">' +
		'		<%= option_doc %>' +
		'	</div>' +
		'</div>';

	return _.template(template)({
		option_name: option_name,
		option_doc:  option_details.doc
	});
}

function select_input(option_name, options){
	var template =
		'		<select id="<%= option_name %>" class="form-control">' +
		'			<% _.forEach(options, function(option){%>' +
		'				<option value="<%= option %>"><%= option %></option>' +
		'			<%});%>' +
		'		</select>';
	return _.template(template)({
		option_name: option_name,
		options:     options
	});
}

function string_input(option_name){
	var template =
		'<input type="text" class="form-control" id="<%= option_name %>" placeholder="Default"/>';
	return _.template(template)({
		option_name: option_name
	});
}

function int_input(option_name, min){
	var template =
		'<input type="number" class="form-control" id="<%= option_name %>" placeholder="Default" min="<%= min %>" />';

	return _.template(template)({
		option_name: option_name,
		min:         min
	});
}

function flags_input(option_name, options){
	var template =
		'<fieldset>' +
		'<legend><%= option_name %></legend>' +
		'			<% _.forEach(options, function(option){%>' +
		'           <input type="checkbox" id="<%= option %>" class="flags_input" /><label for="cb1"><%= option %></label><br/>'+
		'			<%});%>' +
		'</ul>'+
		'</fieldset>';
	return _.template(template)({
		option_name: option_name,
		options:     options,
	});
}

function handle_ajax_error(err){
	console.log(err);
	$('#error_content').text(err.statusText);
	$('#error_modal').modal('show');
}
