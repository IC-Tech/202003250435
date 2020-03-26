const http = require('http')
const https = require('https')
const url = require('url')
const path = require('path')
const fs = require('fs')

var _op = _ => {
	_ = typeof _ == 'string' ? ({url: _}) : _
	_.s = _.url.startsWith('https')
	var a = url.parse(_.url)
	return Object.assign(_, {
		s: _.s,
		url: a,
		op: {
		  hostname: a.hostname,
		  port: a.port ? a.port : (_.s ? 443 : 80),
		  path: a.path,
		  agent: false
		}
	})
}
var _web = _ => new Promise(b => {
	_ = _op(_)
	;(_.s ? https : http).get(_.op, res => {
		let d = Buffer.from([])
		res.on('data', _ => {
			d = Buffer.concat([d, _ instanceof Buffer ? _ : Buffer.from(_)])
		})
		res.on('end', _ => b(d))
	}).on('error', (e) => {
	  console.error(e)
	})
})
var web = _ => new Promise(b => {
	_ = _op(_)
	;(_.s ? https : http).get(_.op, res => {
		/*var a = fs.createWriteStream(_.fs)
		res.pipe(a)
		a.on('finish', c=> {
			a.close()
			b()
		})*/
		var a = fs.createWriteStream(_.fs)
		res.on('data', b => {
		  a.write(b = (b instanceof Buffer ? b : Buffer.from(b)))
		  if(_.state) _.state(b.length)
		})
		res.on('end', _ => {
			a.end()
			b()
		})
	}).on('error', (e) => {
	  console.error(e)
	})
})
var _size = _ => new Promise(b => {
	_ = _op(_)
	;(_.s ? https : http).get(_.op, res => {
		Object.keys(res.headers).some(_ => {
			if(_ != 'content-length') return !!0
			b(parseInt(res.headers[_]))
		})
		b(-1)
	}).on('error', (e) => {
	  console.error(e)
	})
})
var sizeSt = _ => {
	a = 0
	while(([_ >= 1024, ++a])[0]) _ /= 1024
	return (parseInt(_ * 100) / 100) + ' ' + (['bytes', 'Kib', 'Mib', 'Gib', 'Tib', 'Pib'][--a])
}
var read = async _ => {
	var url = _
	_ = (await _web(url)).toString().split('\n')
	if(!_[0].startsWith('#EXTM3U')) return console.log({f:1, d: 'unsupported file format'})
	console.log('start reading.')
	_ = _.slice(1)
	var a = {url: url, directive:[], tracks: [], extensions: {}}
	var c = 0
	_.some((b, _) => {
		c = _
		if(b.startsWith('#EXTINF:')) return !0
		a.directive.push(b)
		return !!0
	})
	_.slice(c).some((b, c, _) => {
		if(b.startsWith('#EXTINF:')) a.tracks.push({
			d: b.substring('#EXTINF:'.length, b.endsWith(',') ? b.length-1 : b.length).split(',').map(_=> _.startsWith(' ') ? _.substr(1) : _),
			file: _[c + 1]
		})
		return b.startsWith('#EXT-X-ENDLIST')
	})
	for(c=0; c<a.directive.length; c++) {
		if(!a.directive[c].startsWith('#EXT-X-')) continue
		var b = 0
		a.extensions[a.directive[c].substring('#EXT-X-'.length, b = a.directive[c].indexOf(':'))] = a.directive[c].substr(b + 1)
		a.directive.splice(c, c-- + 1)
	}
	a.duration = 0
	a.size = 0
	console.log('start calculating.')
	_ = 0
	var b=0
	c = url.substring(0, url.indexOf(path.parse(_op(url).url.path).base))
	a.base = c
	console.log('0% completed.')
	var d = async b => {
		if(_ != -1) {
			_ = await _size(c + a.tracks[b].file)
			a.tracks[b].size = _
			a.size += _ > 0 ? _ : 0
		}
		if(f[2] == 0 && ++f[0] == f[1]) f[2] = 1
	}
	var e = []
	var f = [1, a.tracks.length, 0, 0]
	for(; b<a.tracks.length; b++) {
		a.duration+=parseFloat(a.tracks[b].d[0])
		e.push(d(b))
	}
	e.push(new Promise(_ => {
		f[3] = setInterval(() => {
			if(f[2] == 1) {
				console.log('\033[1A\033[K\rDone calculating.')
				clearInterval(f[3])
				return _()
			}
			console.log('\033[1A\033[K\r' + parseInt((f[0] / f[1]) * 100 * 100) / 100 + '% completed.')
		}, 1000)
	}))
	await Promise.all(e)
	a._size = sizeSt(a.size)
	return a
}
var mkdir = a => new Promise(_ => fs.mkdir(a, async b => {
	if(!b) return _()
	if(b.code == 'ENOENT') {
		await mkdir(path.parse(a).dir)
		return _(await mkdir(a))
	}
	throw b
}))
var download = async _ => {
	console.log('Start Download.')
	var a = (_ => ['FullYear', 'Month', 'Date', 'Hours', 'Minutes', 'Seconds'].map(b=>(a => ((a = (_['get' + a]() + (a == 'Month' ? 1 : 0)).toString()).length == 1 ? ('0'+a) : a))(b)).join(''))(new Date())
	var b = './Download/' + a
	await mkdir(b)
	b += '/'
	await web({url: _.url, fs: b + path.parse(_.url).base})
	var c = [0, _.size, 0, 1, _.tracks.length, 0]
	var d = _ => c[0] += _
	var e = a => new Promise(async _ => {
		await web({url: a, fs: b + path.parse(a).base, state: d})
		if(c[2] == 0 && ++c[3] == c[4]) c[2] = 1
		_()
	})
	var f = []
	var g = 
	_.tracks.forEach(a => f.push(e(_.base + a.file)))
	console.log('0% completed.')
	f.push(new Promise(_ => {
		c[5] = setInterval(() => {
			if(c[2] == 1) {
				console.log('\033[1A\033[K\rDownload completed.')
				clearInterval(c[5])
				return _()
			}
			console.log('\033[1A\033[K\r' + parseInt((c[3] / c[4]) * 100 * 100) / 100 + '% completed. | ' + sizeSt(c[0]) + '/' + sizeSt(c[1]) + ' | ')
		}, 1000)
	}))
	await Promise.all(f)
	console.log(a)
}
(async _ => {
	_ = Array.from(process.argv).slice(2)
	if(_.length >= 2 && (_[0] = _[0].toLowerCase()) == 'check') _[2] = 0
	else if(_.length >= 2 && _[0] == 'download') _[2] = 1
	else return console.log('invalid command')
	var a = await read(_[1])
	console.log(a)
	if(a.f) return
	if(_[2] == 1) await download(a)
})()
