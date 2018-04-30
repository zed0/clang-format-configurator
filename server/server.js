#!/usr/bin/env node
var express       = require('express');
var http          = require('http');
var https         = require('https');
var body_parser   = require('body-parser');
var child_process = require('child_process');
var userid        = require('userid');
var path          = require('path');
var fs            = require('fs');
var marked        = require('marked');
var config = require('../config.json');

setup_marked();

var client_url = config.url;
if(config.clientPort)
	client_url += ':' + config.clientPort;

var clang_base = path.resolve(__dirname, 'llvm');

function get_available_versions(base_dir){
    var versionsArray = []
	const is_bin_dir = source => (fs.lstatSync(source).isDirectory() && (source.toString().match("\.src$")===null))
	const get_directories = source =>
	  fs.readdirSync(source).map(name => path.join(source, name)).filter(is_bin_dir)

	list_of_dirs=get_directories(base_dir)
	for (var i in list_of_dirs) {
		versionsArray.push(path.basename(list_of_dirs[i]))
	  }
    return versionsArray
}

var clang_versions = get_available_versions(clang_base);

var option_documentation = {};
option_documentation.versions = clang_versions;
clang_versions.forEach(function(version){
	option_documentation[version] = parse_documentation(version);
});

var option_defaults = {};
option_defaults.versions = clang_versions;
clang_versions.forEach(function(version){
	option_defaults[version] = JSON.parse(fs.readFileSync(clang_base + '/' + version + 
	'.src/docs/defaults.js', 'utf8'));
});

var app = express();
app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

app.post('/format', function(req, res){
	res.header('Access-Control-Allow-Origin', client_url);
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	run_clang_format(req.body.version, req.body.code, req.body.config, req.body.range, res);
});

app.get('/doc', function(req, res){
	res.header('Access-Control-Allow-Origin', client_url);
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	get_documentation(req, res);
});

app.get('/defaults', function(req, res){
	res.header('Access-Control-Allow-Origin', client_url);
	res.header('Access-Control-Allow-Headers', 'X-Requested-With');
	get_defaults(req, res);
});

if(config.url.lastIndexOf('https:', 0) === 0) {
	var privateKey = fs.readFileSync(config.privKeyPath);
	var certificate = fs.readFileSync(config.pubKeyPath);

	https.createServer({
		key: privateKey,
		cert: certificate
	}, app).listen(config.serverPort);
} else {
	http.createServer(app).listen(config.serverPort);
}

console.log('Started server.');

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
		clang_base + '/' + clang_version + '.src/docs/ClangFormatStyleOptions.rst',
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
	var start_delimiter_nested = '  Nested configuration flags:\n\n'
	var start = doc.search(start_delimiter);
	var search_area = doc.substring(start + start_delimiter.length);
	var split_jump = 2

	var splits;
	if(name === 'BasedOnStyle'){
		splits = search_area.split(/  \* ``(\w*)``\n/).slice(1);
	}
	else if (name === 'BraceWrapping') {
		var start_nested = doc.search(start_delimiter_nested);
		var search_area_nested = doc.substring(start_nested + start_delimiter_nested.length);
		splits = search_area_nested.split(/  \* ``(\w*) (\w*)`` .*\n/).slice(2);
		split_jump = 3
	} else
		splits = search_area.split(/  \* ``\w*`` \(in configuration: ``(\w*)``\)\n/).slice(1);

	var result = [];

	for(var i=0; i<splits.length; i+=split_jump)
		result.push(splits[i]);

	return result;
}

function get_defaults(req, res){
	if(req.query.option)
	{
		if(option_defaults[req.query.version][req.query.option])
			res.jsonp(option_defaults[req.query.version][req.query.option]);
		else
			res.status(404).end();
	}
	else
		res.jsonp(option_defaults);
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

	//Allow code in the formats:
	// \code\nfoo\nbar\nbaz\n\endcode
	// .. code-block:: foo\n\nfoo\nbar\nbaz\n
	marked.Lexer.rules.tables.fences = /^(( *)(?:`{3,}|~{3,}|\\code|\.\. code-block::.*\n))\n?((?:\n?(?!\1|\2\\endcode)\2.+)+)(\n\1|\n\2\\endcode|\n|$)/;

	//Add above code syntax to stuff to skip in paragraphs
	marked.Lexer.rules.tables.paragraph = /^((?:[^\n]+\n?(?!(( *)(?:`{3,}|~{3,}|\\code|\.\. code-block::.*\n))\n?((?:\n?(?!\2|\3\\endcode)\3.+)+)(\n\2|\n\3\\endcode|\n)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\3?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)|( *[-*_]){3,} *(?:\n+|$)| *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)|([^\n]+)\n *(=|-){2,} *(?:\n+|$)|( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b| *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)))+)\n*/;
}
