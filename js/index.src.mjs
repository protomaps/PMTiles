const shift = (number, shift) => {
    return number * Math.pow(2, shift)
}

const getUint24 = (dataview, pos) => {
  return shift(dataview.getUint16(pos+1,true),8) + dataview.getUint8(pos,true)
}

const getUint48 = (dataview, pos) => {
    return shift(dataview.getUint32(pos+2,true),16) + dataview.getUint16(pos,true)
}

export const parseHeader = dataview => {
    var magic = dataview.getUint16(0,true)
    if (magic !== 19792) {
      throw new Error('File header does not begin with "PM"')
    }
    var version = dataview.getUint16(2,true)
    var json_size = dataview.getUint32(4,true)
    var root_entries = dataview.getUint16(8,true)
    return {version:version,json_size:json_size,root_entries:root_entries}
}

export const parseEntry = (dataview,i) => {
    var z_raw = dataview.getUint8(i,true)
    var z = z_raw & 127
    var is_dir = z_raw >> 7
    var x = getUint24(dataview,i+1)
    var y = getUint24(dataview,i+4)
    var offset = getUint48(dataview,i+7)
    var length = dataview.getUint32(i+13,true)
    return [z,x,y,offset,length,is_dir]
}

export const bytesToMap = dataview => {
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

export class PMTiles {
    constructor(url) {
        this.url = url
        this.step = 0
        this.leaves = new Map()
        this.outstanding_requests = new Map()
    }

    metadata = func => {
        return new Promise((resolve,reject) => {
            this.getRoot().then(root => {
                resolve(root.metadata)
            })
        })
    }

    getRoot = () => {
        if (this.root) return this.root
        const controller = new AbortController()
        const signal = controller.signal
        this.root = fetch(this.url,{signal:signal, headers:{Range:'bytes=0-511999'}}).then(resp => {
            if (resp.headers.get('Content-Length') != 512000) {
                console.error("Content-Length mismatch indicates byte serving not supported; aborting.")
                controller.abort()
            }
            return resp.arrayBuffer()
        }).then(buf => {
            let header = parseHeader(new DataView(buf,0,10))
            let dec = new TextDecoder("utf-8")
            let metadata = JSON.parse(dec.decode(new DataView(buf,10,header.json_size)))
            if (metadata.compress) {
                console.error(`Archive has compression type: ${metadata.compress} and is not readable directly by browsers.`)
            }
            return {
                metadata: metadata,
                dir:bytesToMap(new DataView(buf,10+header.json_size,17*header.root_entries))
            }
        })
        return this.root
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
        return this.getRoot().then(root => {
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

    // leaflet adapter
    leafletLayer = options => {
        const self = this
        var cls = L.GridLayer.extend({
            createTile: function(coord, done){
                var tile = document.createElement('img')

                self.getZxy(coord.z,coord.x,coord.y).then(result => {
                    if (result === null) return

                    const controller = new AbortController()
                    const signal = controller.signal
                    tile.cancel = () => { controller.abort() }
                    fetch(self.url,{signal:signal,headers:{Range:'bytes=' + result[0] + '-' + (result[0]+result[1]-1)}}).then(resp => {
                        return resp.arrayBuffer()
                    }).then(buf => {
                        var blob = new Blob( [buf], { type: "image/png" } )
                        var imageUrl = window.URL.createObjectURL(blob)
                        tile.src = imageUrl
                        tile.cancel = null
                        done(null,tile)
                    }).catch(error => {
                        if (error.name !== "AbortError") throw error

                    })
                })
                return tile
            },

            _removeTile: function (key) {
                var tile = this._tiles[key]
                if (!tile) { return }

                if (tile.el.cancel) tile.el.cancel()

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

export const addProtocol = maplibre_instance => {
    let re = new RegExp(/pmtiles:\/\/(.+)\/(\d+)\/(\d+)\/(\d+)/)
    let pmtiles_instances = new Map()
    maplibregl.addProtocol('pmtiles', (params, callback) => {
        let result = params.url.match(re)
        let pmtiles_url = result[1]
        if (!pmtiles_instances.has(pmtiles_url)) {
            pmtiles_instances.set(pmtiles_url,new pmtiles.PMTiles(pmtiles_url))
        }
        let instance = pmtiles_instances.get(pmtiles_url)
        let z = result[2]
        let x = result[3]
        let y = result[4]
        var cancel = () => { }
        instance.getZxy(+z,+x,+y).then(val => {
            if (val) {
                let headers = {'Range':'bytes=' + val[0] + '-' + (val[0]+val[1]-1)}
                const controller = new AbortController()
                const signal = controller.signal
                cancel = () => { controller.abort() }
                fetch(pmtiles_url,{signal:signal,headers:headers}).then(resp => {
                    return resp.arrayBuffer()
                }).then(arr => {
                    callback(null,arr,null,null)
                }).catch(e => {
                    callback(new Error("Canceled"),null,null,null)
                })
            } else {
                callback(null,new Uint8Array(),null,null)
            }
        })
        return { cancel: () => { cancel() } }
     })
}
