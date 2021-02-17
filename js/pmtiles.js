(function (root, factory) {
    if (typeof define === 'function' && define.amd) {
        define([], factory)
    } else if (typeof module === 'object' && module.exports) {
        module.exports = factory()
    } else {
        root.pmtiles = factory()
  }
}(typeof self !== 'undefined' ? self : this, function () {
    const getUint24 = (dataview, pos) => {
      return (dataview.getUint16(pos+1,true) << 8) + dataview.getUint8(pos,true);
    }

    const getUint48 = (dataview, pos) => {
        return (dataview.getUint32(pos+2,true) << 16) + dataview.getUint16(pos,true);
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
        constructor(url,ready) {
            this.url = url
            this.apex = fetch(this.url,{method:'HEAD',headers:{'Range':'bytes=0-511999'}}).then(resp => {
                if (resp.status == 206) { // this does not work on Azure, it returns 200 instead of 206
                    console.log("Check succeeded: server supports byte ranges")
                    return fetch(this.url,{headers:{'Range':'bytes=0-511999'}}).then(resp => {
                        return resp.arrayBuffer()
                    }).then(buf => {
                        const header = parseHeader(new DataView(buf,0,10))
                        var dec = new TextDecoder("utf-8")
                        if (ready) {
                            ready(JSON.parse(dec.decode(new DataView(buf,10,header.json_size))))
                        }
                        return bytesToMap(new DataView(buf,10+header.json_size,17*header.root_entries))
                    })
                }
            })
            // TODO make this LRU
            this.leaves = new Map()
            this.outstanding_requests = new Map()
        }

        getLeaf = tilestr => {
            return new Promise((resolve,reject) => {
                if (this.leaves.has(tilestr)) {
                    resolve(this.leaves.get(tilestr))
                } else if (this.outstanding_requests.has(tilestr)) {
                    this.outstanding_requests.get(tilestr).push(resolve)
                } else {
                    this.outstanding_requests.set(tilestr,[])
                    this.apex.then(apex_map => {
                        if (apex_map.has(tilestr)) {
                            var val = apex_map.get(tilestr)
                            if (val[2] == 1) { // it is a directory
                                fetch(this.url, {headers:{'range':'bytes=' + val[0] + '-' + (val[0] + val[1]-1)}}).then(resp => {
                                    return resp.arraybuffer()
                                }).then(buf => {
                                    var map = bytestomap(buf,val[1]/17)
                                    this.leaves.set(tilestr,map)
                                    resolve(map)
                                    this.outstanding_requests.get(tilestr).foreach(f => {
                                        f(map)
                                    })
                                    console.log("leaves: ", this.leaves.size)
                                })
                            }
                        }
                    })
                }
            })
        }

        leafletLayer = options => {
            const self = this
            var cls = L.GridLayer.extend({
                createTile: function(coords, done){
                    var tile = document.createElement('img');
                    var error

                    self.apex.then(map => {
                        var strid = coords.z + '_' + coords.x + '_' + coords.y
                        if (map.has(strid)) {
                            var val = map.get(strid)
                            fetch(self.url,{headers:{'Range':'bytes=' + val[0] + '-' + (val[0]+val[1]-1)}}).then(resp => {
                                return resp.arrayBuffer()
                            }).then(buf => {
                                var blob = new Blob( [buf], { type: "image/png" } );
                                var imageUrl = window.URL.createObjectURL(blob);
                                tile.src = imageUrl;
                                done(error,tile)
                            })
                        }
                    })

                    return tile;

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
            return new cls()
        }
    }

    return {PMTiles:PMTiles}
}));