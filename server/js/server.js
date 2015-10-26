#!/usr/bin/env node
var express       = require('express');
var body_parser   = require('body-parser');
var child_process = require('child_process');
var userid        = require('userid');
var path          = require('path');
var fs            = require('fs');
var marked        = require('marked');

marked.InlineLexer.breaks = new marked.InlineLexer([]);
marked.InlineLexer.breaks.rules.text   = /^[\s\S]+?(?=[\\<!\[_*`:]| {2,}\n|$)/,

marked.InlineLexer.breaks.rules.link   = /^`((?:[^`<]|\n)*)[\s\S]<([^>]*)>`_/;
marked.InlineLexer.breaks.rules.strong = /^:\w*:`([\w\-]*?)`|^\*\*([\s\S]+?)\*\*(?!\*)/;
marked.InlineLexer.breaks.rules.code   = /^(``+)\s*([\s\S]*?[^`])\s*\1(?!`)/;

marked.Lexer.rules.tables.fences    = /^ *(`{3,}|~{3,}|\\code)[ \.]*(\S+)? *\n([\s\S]*?)\s*(\1|\\endcode) *(?:\n+|$)/;
marked.Lexer.rules.tables.paragraph = /^((?:[^\n]+\n?(?! *(`{3,}|~{3,}|\\code)[ \.]*(\S+)? *\n([\s\S]*?)\s*(\2|\\endcode) *(?:\n+|$)|( *)((?:[*+-]|\d+\.)) [\s\S]+?(?:\n+(?=\3?(?:[-*_] *){3,}(?:\n+|$))|\n+(?= *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))|\n{2,}(?! )(?!\1(?:[*+-]|\d+\.) )\n*|\s*$)|( *[-*_]){3,} *(?:\n+|$)| *(#{1,6}) *([^\n]+?) *#* *(?:\n+|$)|([^\n]+)\n *(=|-){2,} *(?:\n+|$)|( *>[^\n]+(\n(?! *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$))[^\n]+)*\n*)+|<(?!(?:a|em|strong|small|s|cite|q|dfn|abbr|data|time|code|var|samp|kbd|sub|sup|i|b|u|mark|ruby|rt|rp|bdi|bdo|span|br|wbr|ins|del|img)\b)\w+(?!:\/|[^\w\s@]*@)\b| *\[([^\]]+)\]: *<?([^\s>]+)>?(?: +["(]([^\n]+)[")])? *(?:\n+|$)))+)\n*/

var app = express();

//var firejail_path = '/usr/bin/firejail';
var clang_base    = path.resolve(__dirname, '../llvm');

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

var option_documentation = parse_documentation();

app.post('/format', function(req, res){
	res.header("Access-Control-Allow-Origin", "http://zed0.co.uk");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	run_clang_format(req.body.code, req.body.config, req.body.range, res);
});

app.get('/doc', function(req, res){
	res.header("Access-Control-Allow-Origin", "http://zed0.co.uk");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	get_documentation(req, res);
});

/*
var firejail_proc = start_firejail_process();
process.on('SIGINT', function(){
	stop_firejail_process(firejail_proc);
	process.exit();
});
*/

app.listen(8038);

function run_clang_format(code, config, range, res){
	var proc = clang_format_process(config, range);
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

function run_firejail_process(program, args){
	var options = [
		'--join=' + firejail_proc,
		'--'
	];
	options.push(program);
	return child_process.spawn(
		firejail_path,
		options.concat(args)
	);
}

function start_firejail_process(){
	var options = [
		'--quiet',
		'--private=' + clang_base,
		'--net=none',
		'--shell=none',
		'--caps.drop=all',
		'--blacklist=/',
		'--name=configurator',
		'--',
		'sleep',
		'inf'
	];
	console.log('[daemon]: starting firejail...');
	var daemon = child_process.spawn(
		firejail_path,
		options
	);
	daemon.stderr.on('data', function(data){
		console.log('[daemon]: ' + data.toString('utf8'));
	});
	daemon.stdout.on('data', function(data){
		console.log('[daemon]: ' + data.toString('utf8'));
	});
	console.log('[daemon]: started with pid: ' + daemon.pid);
	return daemon.pid;
}

function stop_firejail_process(pid){
	var options = [
		'--shutdown=' + pid
	];
	return child_process.spawn(
		firejail_path,
		options
	);
}

function clang_format_process(config, range){
	var clang_version = '3.7.0';
	var clang_path    = clang_version + '/bin/clang-format'
	var options       = [];

	if(config)
		options.push('-style=' + config);
	if(range)
		options.push('-lines=' + range);

	return run_process(clang_base + '/' + clang_path, options);
	//return run_firejail_process(clang_path, options);
}

function get_documentation(req, res){
	if(req.query.option)
	{
		if(option_documentation[req.query.option])
			res.jsonp(option_documentation[req.query.option]);
		else
			res.status(404).end();
	}
	else
		res.jsonp(option_documentation);
}

function parse_documentation(){
	var clang_version = '3.7.0';
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
	var docs = {};

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
