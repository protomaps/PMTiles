(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory()
    } else {
        root.pmtiles = factory()
  }
}(typeof self !== 'undefined' ? self : this, function () {
    const shift = (number, shift) => {
        return number * Math.pow(2, shift)
    }


    const getUint24 = (dataview, pos) => {
      return shift(dataview.getUint16(pos+1,true),8) + dataview.getUint8(pos,true)
    }

    const getUint48 = (dataview, pos) => {
        return shift(dataview.getUint32(pos+2,true),16) + dataview.getUint16(pos,true)
    }

    const parseHeader = dataview => {
        var magic = dataview.getUint16(0,true)
        // assert that the magic number (2 bytes) matches 19792
        var version = dataview.getUint16(2,true)
        var json_size = dataview.getUint32(4,true)
        var root_entries = dataview.getUint16(8,true)
        return {version:version,json_size:json_size,root_entries:root_entries}
    }

    const bytesToMap = dataview => {
        let m = new Map() 
        for (var i = 0; i < dataview.byteLength; i+=17) {
            var z_raw = dataview.getUint8(i,true)
            var z = z_raw & 127
            var is_dir = z_raw >> 7
            var x = getUint24(dataview,i+1)
            var y = getUint24(dataview,i+4)
            var offset = getUint48(dataview,i+7)
            var length = dataview.getUint32(i+13,true)
            m.set(z + '_' + x + '_' + y,[offset,length,is_dir])
        }
        return m
    }

    class PMTiles {
        constructor(url, options = {}) {
            this.url = url
            this.root = fetch(this.url,{method:'HEAD',headers:{Range:'bytes=0-511999'}}).then(resp => {
                 // for servers like Azure, GH Pages which return 200 instead of 206
                if (resp.status == 206 || (resp.status == 200 && options.allow_200)) {
                    console.log("Check succeeded: server supports byte ranges")
                    return fetch(this.url,{headers:{Range:'bytes=0-511999'}}).then(resp => {
                        return resp.arrayBuffer()
                    }).then(buf => {
                        const header = parseHeader(new DataView(buf,0,10))
                        var dec = new TextDecoder("utf-8")
                        return {
                            metadata: JSON.parse(dec.decode(new DataView(buf,10,header.json_size))),
                            dir:bytesToMap(new DataView(buf,10+header.json_size,17*header.root_entries))
                        }
                    })
                } else {
                    throw new Error("Invalid response: " + resp.status)
                }
            })
            this.step = 0
            this.leaves = new Map()
            this.outstanding_requests = new Map()
        }

        metadata = func => {
            this.root.then(root => {
                func(root.metadata)
            })
        }

        getLeaf = (offset, len) => {
            return new Promise((resolve,reject) => {
                if (this.leaves.has(offset)) {
                    this.leaves.get(offset)[0]++
                    resolve(this.leaves.get(offset)[1])
                } else if (this.outstanding_requests.has(offset)) {
                    this.outstanding_requests.get(offset).push(resolve)
                } else {
                    this.outstanding_requests.set(offset,[])
                    fetch(this.url, {headers:{Range:'bytes=' + offset + '-' + (offset + len-1)}}).then(resp => {
                        return resp.arrayBuffer()
                    }).then(buf => {
                        var map = bytesToMap(new DataView(buf),len/17)
                        if (this.leaves.size > 32) {
                            var minStep = Infinity
                            var minKey = undefined
                            this.leaves.forEach((val,key) => {
                                if (val[0] < minStep) {
                                    minStep = val[0]
                                    minKey = key
                                }
                            })
                            this.leaves.delete(minKey)
                        }

                        this.leaves.set(offset,[this.step++,map])
                        resolve(map)
                        this.outstanding_requests.get(offset).forEach(f => f(map))
                        this.outstanding_requests.delete(offset)
                    })
                }
            })
        }

        getZxy = (z,x,y) => {
            var strid = z + '_' + x + '_' + y
            return this.root.then(root => {
                if (root.dir.has(strid) && root.dir.get(strid)[2] == 0) {
                    return root.dir.get(strid)
                } else {
                   if (z >= 7) {
                        var z7_tile_diff = (z - 7)
                        var z7_tile = [7,Math.trunc(x / (1 << z7_tile_diff)), Math.trunc(y / (1 << z7_tile_diff))]
                        var z7_tile_str = z7_tile[0] + "_" + z7_tile[1] + "_" + z7_tile[2]
                        if (root.dir.has(z7_tile_str) && root.dir.get(z7_tile_str)[2] == 1) {
                            const val = root.dir.get(z7_tile_str)
                            return this.getLeaf(val[0],val[1]).then(leafdir => {
                                if (leafdir.has(strid)) {
                                    return leafdir.get(strid)
                                }
                                return null
                            })
                        }
                   } 
                }
                return null
            }) 
        }

        transformRequest = (u,t,tile,done) => {
            if (u.endsWith('.pmtiles') && done) {
                var tid = tile.tileID.canonical
                var strid = tid.z + '_' + tid.x + '_' + tid.y
                this.getZxy(tid.z,tid.x,tid.y).then(val => {
                    if (val) {
                        done({url: this.url, headers:{'Range':'bytes=' + val[0] + '-' + (val[0]+val[1]-1)}})
                    }
                })
            }
            return {url: u}
        }

        // take URL here
        leafletLayer = options => {
            const self = this
            var cls = L.GridLayer.extend({
                createTile: function(coord, done){
                    var tile = document.createElement('img')
                    var error

                    self.getZxy(coord.z,coord.x,coord.y).then(result => {
                        if (result === null) return
                        fetch(self.url,{headers:{Range:'bytes=' + result[0] + '-' + (result[0]+result[1]-1)}}).then(resp => {
                            return resp.arrayBuffer()
                        }).then(buf => {
                            var blob = new Blob( [buf], { type: "image/png" } )
                            var imageUrl = window.URL.createObjectURL(blob)
                            tile.src = imageUrl
                            done(error,tile)
                        })
                    })
                    return tile
                },

                _removeTile: function (key) {
                    var tile = this._tiles[key]
                    if (!tile) { return }
                    tile.el.width = 0
                    tile.el.height = 0
                    tile.el.deleted = true
                    L.DomUtil.remove(tile.el)
                    delete this._tiles[key]
                    this.fire('tileunload', {
                        tile: tile.el,
                        coords: this._keyToTileCoords(key)
                    })
                },
            })
            return new cls(options)
        }
    }
    return {PMTiles:PMTiles}
}))