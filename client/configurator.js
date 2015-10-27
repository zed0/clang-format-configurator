var example =
	'#include <iostream>\n' +
	'#include <algorithm>\n' +
	'#include <functional>\n' +
	'#include <iterator>\n' +
	'#include <cstdlib>\n' +
	'#include <ctime>\n' +
	'\n' +
	'template <typename T, int size> bool is_sorted(T(&array)[size]) {\n' +
	'  return std::adjacent_find(array, array + size, std::greater<T>()) ==\n' +
	'         array + size;\n' +
	'}\n' +
	'\n' +
	'int main() {\n' +
	'  std::srand(std::time(0));\n' +
	'\n' +
	'  int list[] = {1, 2, 3, 4, 5, 6, 7, 8, 9};\n' +
	'\n' +
	'  do {\n' +
	'    std::random_shuffle(list, list + 9);\n' +
	'  } while (is_sorted(list));\n' +
	'\n' +
	'  int score = 0;\n' +
	'\n' +
	'  do {\n' +
	'    std::cout << "Current list: ";\n' +
	'    std::copy(list, list + 9, std::ostream_iterator<int>(std::cout, " "));\n' +
	'\n' +
	'    int rev;\n' +
	'    while (true) {\n' +
	'      std::cout << "\\nDigits to reverse? ";\n' +
	'      std::cin >> rev;\n' +
	'      if (rev > 1 && rev < 10)\n' +
	'        break;\n' +
	'      std::cout << "Please enter a value between 2 and 9.";\n' +
	'    }\n' +
	'\n' +
	'    ++score;\n' +
	'    std::reverse(list, list + rev);\n' +
	'  } while (!is_sorted(list));\n' +
	'\n' +
	'  std::cout << "Congratulations, you sorted the list.\\n"\n' +
	'            << "You needed " << score << " reversals." << std::endl;\n' +
	'  return 0;\n' +
	'}\n';

var code;
var clang_options;
var clang_version;

$(document).ready(function(){
	$.ajax({
		url: 'http://uwcs.co.uk:8038/doc',
		type: 'GET',
		dataType: 'json',
		crossDomain: true,
		success: create_inputs,
		error: function(err){
			console.log(err);
		}
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
		url: 'http://uwcs.co.uk:8038/format',
		type: 'POST',
		dataType: 'json',
		crossDomain: true,
		success: update_code,
		error: function(err){
			console.log(err);
		},
		data: options
	});
}

function save_config(clang_options, version){
	var yml = window.YAML.stringify(get_config(clang_options, version));
	var blob = new Blob(['---\n',yml,'\n...\n'], {type: "text/plain;charset=utf-8"});
	saveAs(blob, ".clang-format");
}


function get_config(options, version){
	var result = {};
	$.each(options[version], function(key, value){
		var option_value = $('#' + key).val();
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

	$('.form-control').on('change', function(evt){
		request_update(clang_options, clang_version);
	});

}

function create_input(option_name, option_details){
	var input_template;
	if($.isArray(option_details.options))
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
