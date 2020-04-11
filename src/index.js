const http = require('http')
const https = require('https')
const url = require('url')
const path = require('path')
const fs = require('fs')

const dir = './Download'

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
var saveFile = (...a) => {
	var b = fs.createWriteStream(a[0])
	b.write(Buffer.from(a[1]))
	b.close()
}
var readFile = a => new Promise((_, r) => {
  a = fs.createReadStream(a)
  let d = [];
  a.on('error', e => r(e))
	a.on('data', a => d.push(a))
	a.on('close', b => _(Buffer.concat(d)))
})
var TC = a => (_ => ['FullYear', 'Month', 'Date', 'Hours', 'Minutes', 'Seconds'].map(b=>(a => ((a = (_['get' + a]() + (a == 'Month' ? 1 : 0)).toString()).length == 1 ? ('0'+a) : a))(b)).join(''))(new Date())

var mkdir = a => new Promise(_ => fs.mkdir(a, async b => {
	if(!b) return _()
	if(b.code == 'ENOENT') {
		await mkdir(path.parse(a).dir)
		return _(await mkdir(a))
	}
	throw b
}))
var download = async (_, _a) => {
	console.log('Start Download.')
	var c = [0, 0, _.length, 0, 0]
	var d = _ => c[2] += _
	var e = (a, b) => _[a].state = b
	var b = _ => new Promise(async a => {
		try {
			await web({url: _[0], fs: _[1], state: _[2]})
			e(_[3], !0)
		}
		catch(err) {
			c[3]++
			e(_[3], !!0)
			console.error(err)
		}
		c[0]++
		a()
	})
	var f = _.map((a, _) => a.state ? ([null, c[0]++])[0] : b([a.link, a.path, d, _]))
	console.log('0% completed.')
	f.push(new Promise(a => {
		c[4] = setInterval(() => {
			saveFile(_a[1], JSON.stringify(_))
			if(c[0] >= c[1]) {
				console.log('\033[1A\033[K\rDownload completed.')
				clearInterval(c[4])
				return a()
			}
			console.log('\033[1A\033[K\r' + parseInt((c[0] / c[1]) * 100 * 100) / 100 + '% completed. | ' + sizeSt(c[2]) + '/' + _a[0] + ' | ')
		}, 500)
	}))
	await Promise.all(f)
	console.log(`${_.length} files, ${sizeSt(c[2])} Downloaded`)
}
(async _ => {
	_ = Array.from(process.argv).slice(2)
	if(_.length >= 2 && (_[0] = _[0].toLowerCase()) == 'check') _[2] = 0
	else if(_.length >= 2 && _[0] == 'download') _[2] = 1
	else if(_.length >= 2 && _[0] == 'resume')
		return await download(JSON.parse((await readFile(_[1])).toString()), ['Unknown', path.parse(_[1]).dir + '/download-' + TC() + '.json'])
	else return console.log('invalid command')
	var a = await read(_[1])
	console.log(a)
	if(a.f) return
	if(_[2] == 1) {
		var d = a => path.parse(url.parse(a).pathname).base
		var mod = !!0
		var b = [
			{link: a.url, path: d(a.url)},
			...a.tracks.map(b => ({
				link: ['http://', 'https://'].some(_ => ([_ = b.file.startsWith(_), mod ? !!0 : mod = _])[0]) ? b.file : a.base + b.file,
				path: d(b.file)
			}))
		]
		var _c = []
		d = (a,d) => _c.some((b,c) => a == b)
		var e = (a, b) => ([a = path.parse(a), a.name + (b || '') + a.ext])[1]
		b = b.map((a, b) => {
			if(!d(a.path)) return ([_c.push(a.path), a])[1]
			var c = 0
			while(d(e(a.path, '_' + ++c)));
			_c[b] = e(a.path, '_' + c)
			return Object.assign(a, {path: _c[b]})
		})
		var c = 0, f = 'play.m3u8'
		if(d(f)) {
			while(d(e(f, '_' + ++c)));
			f = e(f, '_' + c)
		}
		var d = dir + '/' + TC() + '/'
		await mkdir(d)
		saveFile(d + 'data.json', JSON.stringify(a))
		a.tracks = a.tracks.map((a,c) => ([a.file = b[c + 1].path, a, b[c + 1].path = d + b[c + 1].path, c == 0 ? b[c].path = d + b[c].path : 0])[1])
		saveFile(d + f, '#EXTM3U\n' + Object.keys(a.extensions).map(b => '#EXT-X-' + b + ':' + a.extensions[b]).join('\n') + '\n' + a.tracks.map(a => '#EXTINF:' + a.d.join(',') + ',\n' + a.file).join('\n') + '\n#EXT-X-ENDLIST')
		saveFile(d + 'download_backup.json', JSON.stringify(b))
		await download(b, [a._size, d + 'download.json'])
	}
})()
