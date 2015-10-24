var clang_options = {
	BasedOnStyle:                                   ['LLVM', 'Google', 'Chromium', 'Mozilla', 'WebKit'],
	Language:                                       ['Cpp', 'Java', 'JavaScript', 'Proto'],
	AccessModifierOffset:                           'int',
	AlignAfterOpenBracket:                          'bool',
	AlignConsecutiveAssignments:                    'bool',
	AlignEscapedNewlinesLeft:                       'bool',
	AlignOperands:                                  'bool',
	AlignTrailingComments:                          'bool',
	AllowAllParametersOfDeclarationOnNextLine:      'bool',
	AllowShortBlocksOnASingleLine:                  'bool',
	AllowShortCaseLabelsOnASingleLine:              'bool',
	AllowShortFunctionsOnASingleLine:               ['None', 'Empty', 'Inline', 'All'],
	AllowShortIfStatementsOnASingleLine:            'bool',
	AllowShortLoopsOnASingleLine:                   'bool',
	AlwaysBreakAfterDefinitionReturnType:           ['None', 'All', 'TopLevel'],
	AlwaysBreakBeforeMultilineStrings:              'bool',
	AlwaysBreakTemplateDeclarations:                'bool',
	BinPackArguments:                               'bool',
	BinPackParameters:                              'bool',
	BreakBeforeBinaryOperators:                     ['None', 'NonAssignment', 'All'],
	BreakBeforeBraces:                              ['Attach', 'Linux', 'Mozilla', 'Stroustrup', 'Allman', 'GNU'],
	BreakBeforeTernaryOperators:                    'bool',
	BreakConstructorInitializersBeforeComma:        'bool',
	ColumnLimit:                                    'unsigned',
	CommentPragmas:                                 'string',
	ConstructorInitializerAllOnOneLineOrOnePerLine: 'bool',
	ConstructorInitializerIndentWidth:              'unsigned',
	ContinuationIndentWidth:                        'unsigned',
	Cpp11BracedListStyle:                           'bool',
	DerivePointerAlignment:                         'bool',
	DisableFormat:                                  'bool',
	ExperimentalAutoDetectBinPacking:               'bool',
	//ForEachMacros:                                  [ 'foreach', 'Q_FOREACH', 'BOOST_FOREACH' ],
	IndentCaseLabels:                               'bool',
	IndentWidth:                                    'unsigned',
	IndentWrappedFunctionNames:                     'bool',
	KeepEmptyLinesAtTheStartOfBlocks:               'bool',
	MacroBlockBegin:                                'string',
	MacroBlockEnd:                                  'string',
	MaxEmptyLinesToKeep:                            'unsigned',
	NamespaceIndentation:                           ['None', 'Inner', 'All'],
	ObjCBlockIndentWidth:                           'unsigned',
	ObjCSpaceAfterProperty:                         'bool',
	ObjCSpaceBeforeProtocolList:                    'bool',
	PenaltyBreakBeforeFirstCallParameter:           'unsigned',
	PenaltyBreakComment:                            'unsigned',
	PenaltyBreakFirstLessLess:                      'unsigned',
	PenaltyBreakString:                             'unsigned',
	PenaltyExcessCharacter:                         'unsigned',
	PenaltyReturnTypeOnItsOwnLine:                  'unsigned',
	PointerAlignment:                               ['Left', 'Right', 'Middle'],
	SpaceAfterCStyleCast:                           'bool',
	SpaceBeforeAssignmentOperators:                 'bool',
	SpaceBeforeParens:                              ['Never', 'ControlStatements', 'Always'],
	SpaceInEmptyParentheses:                        'bool',
	SpacesBeforeTrailingComments:                   'unsigned',
	SpacesInAngles:                                 'bool',
	SpacesInContainerLiterals:                      'bool',
	SpacesInCStyleCastParentheses:                  'bool',
	SpacesInParentheses:                            'bool',
	SpacesInSquareBrackets:                         'bool',
	Standard:                                       ['Cpp03', 'Cpp11', 'Auto'],
	TabWidth:                                       'unsigned',
	UseTab:                                         ['Never', 'ForIndentation', 'Always']
}

var example =
'#include <iostream>\n' +
'#include <algorithm>\n' +
'#include <functional>\n' +
'#include <iterator>\n' +
'#include <cstdlib>\n' +
'#include <ctime>\n' +
' \n' +
'template<typename T, int size>\n' +
' bool is_sorted(T (&array)[size])\n' +
'{\n' +
'  return std::adjacent_find(array, array+size, std::greater<T>())\n' +
'    == array+size;\n' +
'}\n' +
' \n' +
'int main()\n' +
'{\n' +
'  std::srand(std::time(0));\n' +
' \n' +
'  int list[] = { 1, 2, 3, 4, 5, 6, 7, 8, 9 };\n' +
' \n' +
'  do\n' +
'  {\n' +
'    std::random_shuffle(list, list+9);\n' +
'  } while (is_sorted(list));\n' +
' \n' +
'  int score = 0;\n' +
' \n' +
'  do\n' +
'  {\n' +
'    std::cout << "Current list: ";\n' +
'    std::copy(list, list+9, std::ostream_iterator<int>(std::cout, " "));\n' +
' \n' +
'    int rev;\n' +
'    while (true)\n' +
'    {\n' +
'      std::cout << "\\nDigits to reverse? ";\n' +
'      std::cin >> rev;\n' +
'      if (rev > 1 && rev < 10)\n' +
'        break;\n' +
'      std::cout << "Please enter a value between 2 and 9.";\n' +
'    }\n' +
' \n' +
'    ++score;\n' +
'    std::reverse(list, list + rev);\n' +
'  } while (!is_sorted(list));\n' +
' \n' +
'  std::cout << "Congratulations, you sorted the list.\\n"\n' +
'            << "You needed " << score << " reversals." << std::endl;\n' +
'  return 0;\n' +
'}\n';

var code;

$(document).ready(function(){
	code = ace.edit('code');
	code.setTheme('ace/theme/twilight');
	code.getSession().setMode('ace/mode/c_cpp');
	code.getSession().setUseSoftTabs(true);
	code.getSession().setTabSize(2);
	code.getSession().setUseWrapMode(false);
	code.setOption('showInvisibles', true);
	code.setPrintMarginColumn(80);
	code.$blockScrolling = Infinity;
	code.getSession().setValue(example);

	create_inputs(clang_options);

	$('#update_button').on('click', function(evt){
		request_update(clang_options);
	});
	$('.form-control').on('change', function(evt){
		request_update(clang_options);
	});
	$('#save_button').on('click', function(evt){
		save_config(clang_options);
	});
});

function update_code(data){
	var range = code.selection.getRange();
	code.getSession().setValue(data);
	code.selection.setRange(range);
}

function request_update(clang_options){
	var new_config = get_config(clang_options);
	code.getSession().setTabSize(new_config.TabWidth || 2);
	code.setPrintMarginColumn(new_config.ColumnLimit || 80);
	var range = code.selection.getRange();

	var options = {
		config: JSON.stringify(new_config),
		code: code.getSession().getValue()
	};

	if(range.start.row != range.end.row && range.start.column != range.end.column)
		options.range = range.start.row + ':' + range.end.row;

	$.ajax({
		url: 'http://uwcs.co.uk:8038/',
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

function save_config(clang_options){
	var yml = window.YAML.stringify(get_config(clang_options));
	var blob = new Blob(['---\n',yml,'\n...\n'], {type: "text/plain;charset=utf-8"});
	saveAs(blob, ".clang-format");
}


function get_config(options){
	var result = {};
	$.each(options, function(key, value){
		var option_value = $('#' + key).val();
		if(option_value && option_value !== 'Default')
			result[key] = option_value;
	});
	return result;
}

function create_inputs(options){
	var container = $('#options');

	$.each(options, function(key, value){
		var input;
		if($.isArray(value))
			input = select_input(key, ['Default'].concat(value));
		else if(value === 'bool')
			input = select_input(key, ['Default', true, false]);
		else if(value === 'string')
			input = string_input(key);
		else if(value === 'int')
			input = int_input(key);
		else if(value === 'unsigned')
			input = int_input(key, 0);
		else
			console.log('No input created for type: ' + value);

		$(input).appendTo(container);
	});
}

function select_input(option_name, options){
	var template =
		'<div class="form-group">' +
		'	<label class="col-sm-8"><%= option_name %>:</label>' +
		'	<div class="col-sm-4">' +
		'		<select id="<%= option_name %>" class="form-control">' +
		'			<% _.forEach(options, function(option){%>' +
		'				<option value="<%= option %>"><%= option %></option>' +
		'			<%});%>' +
		'		</select>' +
		'	</div>' +
		'</div>';

	return _.template(template)({
		option_name: option_name,
		options: options
	});
}

function string_input(option_name){
	var template =
		'<div class="form-group">' +
		'	<label class="col-sm-8"><%= option_name %>:</label>' +
		'	<div class="col-sm-4">' +
		'		<input type="text" class="form-control" id="<%= option_name %>" placeholder="Default"/>' +
		'	</div>' +
		'</div>';

	return _.template(template)({
		option_name: option_name
	});
}

function int_input(option_name, min){
	var template =
		'<div class="form-group">' +
		'	<label class="col-sm-8"><%= option_name %>:</label>' +
		'	<div class="col-sm-4">' +
		'		<input type="number" class="form-control" id="<%= option_name %>" placeholder="Default" min="<%= min %>" />' +
		'	</div>' +
		'</div>';

	return _.template(template)({
		option_name: option_name,
		min: min
	});
}
