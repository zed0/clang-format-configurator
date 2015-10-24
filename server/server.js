#!/usr/bin/env node
var express       = require('express');
var body_parser   = require('body-parser');
var child_process = require('child_process');
var userid        = require('userid');
var path          = require('path');

var app = express();

//var firejail_path = '/usr/bin/firejail';
var clang_base    = path.resolve(__dirname, '../llvm');

app.use(body_parser.json());
app.use(body_parser.urlencoded({extended: true}));

app.post('/', function(req, res){
	res.header("Access-Control-Allow-Origin", "http://zed0.co.uk");
	res.header("Access-Control-Allow-Headers", "X-Requested-With");
	run_clang_format(req.body.code, req.body.config, req.body.range, res);
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
		//'--quiet',
		'--private=' + clang_base,
		'--net=none',
		'--shell=none',
		'--caps.drop=all',
		//'--blacklist=/',
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
