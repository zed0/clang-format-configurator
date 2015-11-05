#!/usr/bin/env node
var express       = require('express');
var body_parser   = require('body-parser');
var child_process = require('child_process');
var userid        = require('userid');
var path          = require('path');
var fs            = require('fs');
var marked        = require('marked');
var clang_format_config = require('./settings.js');

setup_marked();

var clang_versions = clang_format_config.versions;

var clang_base = path.resolve(__dirname, '../llvm');

var option_documentation = {};
option_documentation.versions = clang_versions;
clang_versions.forEach(function(version){
	option_documentation[version] = parse_documentation(version);
});

var app = express();
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

app.post('/format', function(req, res){
	res.header("Access-Control-Allow-Origin", "http://zed0.co.uk");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	run_clang_format(req.body.version, req.body.code, req.body.config, req.body.range, res);
});

app.get('/doc', function(req, res){
	res.header("Access-Control-Allow-Origin", "http://zed0.co.uk");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	get_documentation(req, res);
});

app.listen(clang_format_config.port);


function run_clang_format(clang_version, code, config, range, res){
	var proc = clang_format_process(clang_version, config, range);
	var output = '';

	proc.stdout.on('data', function(data){
		output += data;
	});

	proc.stderr.on('data', function(data){
		console.log('[clang-complete]: ' + data.toString('utf8'));
	});

	proc.on('close', function(code){
		if(code)
		{
			console.log('[clang-complete]: closed with code: ' + code + '!');
			res.status(400).end();
		}
		else
		{
			res.jsonp(output);
		}
	});

	proc.stdin.end(code);
}

function run_process(program, args){
	return child_process.spawn(
		program,
		args
	);
}

function clang_format_process(clang_version, config, range){
	var clang_path    = clang_version + '/bin/clang-format'
	var options       = [];

	if(config)
		options.push('-style=' + config);
	if(range)
		options.push('-lines=' + range);

	return run_process(clang_base + '/' + clang_path, options);
}

function get_documentation(req, res){
	if(req.query.option)
	{
		if(option_documentation[req.query.version][req.query.option])
			res.jsonp(option_documentation[req.query.version][req.query.option]);
		else
			res.status(404).end();
	}
	else
		res.jsonp(option_documentation);
}

function parse_documentation(clang_version){
	var docs = {};
	var result = fs.readFileSync(
		'llvm/' + clang_version + '.src/docs/ClangFormatStyleOptions.rst',
		{
			encoding: 'utf8'
		}
	);

	var start_based_on = result.indexOf('**BasedOnStyle** (``string``)');
	var end_based_on   = result.indexOf('.. START_FORMAT_STYLE_OPTIONS');
	var based_on = result.substring(start_based_on, end_based_on);

	var start_delimiter = '.. START_FORMAT_STYLE_OPTIONS';
	var end_delimiter   = '.. END_FORMAT_STYLE_OPTIONS';
	var start = result.indexOf(start_delimiter);
	var end   = result.indexOf(end_delimiter);
	result = based_on + result.substring(start + start_delimiter.length, end);

	var splits = result.split(/\*\*(\w*)\*\* \(``([^`]*)``\)\n/).slice(1);

	for(var i=0; i<splits.length; i+=3)
	{
		var name = splits[i];
		var type = splits[i+1];
		var doc  = splits[i+2];

		docs[name] = {
			type: type,
			doc:  marked(doc)
		};
		var recognised_types = [
			'bool',
			'unsigned',
			'int',
			'std::string',
			'std::vector<std::string>'
		];
		if(recognised_types.indexOf(type) === -1)
		{
			docs[name].options = get_select_options(name, doc);
		}
	}
	return docs;
}

function get_select_options(name, doc){
	var start_delimiter = '  Possible values:\n\n';
	var start = doc.search(start_delimiter);
	var search_area = doc.substring(start + start_delimiter.length);

	var splits;
	if(name === 'BasedOnStyle')
		splits = search_area.split(/  \* ``(\w*)``\n/).slice(1);
	else
		splits = search_area.split(/  \* ``\w*`` \(in configuration: ``(\w*)``\)\n/).slice(1);

	var result = [];

	for(var i=0; i<splits.length; i+=2)
		result.push(splits[i]);

	return result;
}

function setup_marked(){
	marked.InlineLexer.breaks = new marked.InlineLexer([]);

	//Allow Links in the format: `Foo bar baz <http://foo.bar/baz>`_
	marked.InlineLexer.breaks.rules.link   = /^`((?:[^`<]|\n)*)[\s\S]<([^>]*)>`_/;
	//Allow bold in the format: :program:`foo-bar`
	marked.InlineLexer.breaks.rules.strong = /^:\w*:`([\w\-]*?)`|^\*\*([\s\S]+?)\*\*(?!\*)/;
	//Add : to the list of potential special characters in text:
	marked.InlineLexer.breaks.rules.text   = /^[\s\S]+?(?=[\\<!\[_*`:]| {2,}\n|$)/,
	//Enforce code having at least two backticks around it:
	marked.InlineLexer.breaks.rules.code   = /^(``+)\s*([\s\S]*?[^`])\s*\1(?!`)/;

	//Allow code in the format: \code\nfoo\nbar\nbaz\n\endcode
	marked.Lexer.rules.tables.fences    = /^ *(`{3,}|~{3,}|\\code)[ \.]*(\S+)? *\n([\s\S]*?)\s*(\1|\\endcode) *(?:\n+|$)/;
	//Add above code syntax to stuff to skip in paragraphs
	marked.Lexer.rules.tables.paragraph = /^((?:[^\n]+\n?(?! *(`{3,}|~{3,}|\\code)[ \.]*(\S+)? *\n([\s\S]*?)\s*(\2|\\endcode) *(?:\n+|$)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\3?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)|( *[-*_]){3,} *(?:\n+|$)| *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)|([^\n]+)\n *(=|-){2,} *(?:\n+|$)|( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b| *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)))+)\n*/;
}
