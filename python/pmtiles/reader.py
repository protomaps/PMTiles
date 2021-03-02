import json
import mmap
from contextlib import contextmanager

@contextmanager
def read(fname):
    r = Reader(fname)
    try:
        yield r
    finally:
        r.close()

class Reader:
    def __init__(self,fname):
        self.f = open(fname, "r+b")
        self.mmap = mmap.mmap(self.f.fileno(), 0)
        assert int.from_bytes(self.mmap[0:2],byteorder='little') == 0x4D50
        first_entry_idx = 10+self.metadata_len
        self.root_dir, self.leaves = self.load_directory(first_entry_idx,self.root_entries)

    def load_directory(self,offset,num_entries):
        directory = {}
        leaves = {}
        for i in range(offset,offset+num_entries*17,17):
            z = int.from_bytes(self.mmap[i:i+1],byteorder='little')
            x = int.from_bytes(self.mmap[i+1:i+4],byteorder='little')
            y = int.from_bytes(self.mmap[i+4:i+7],byteorder='little')
            tile_off = int.from_bytes(self.mmap[i+7:i+13],byteorder='little')
            tile_len = int.from_bytes(self.mmap[i+13:i+17],byteorder='little')
            if (z & 0b10000000):
                leaves[(z & 0b01111111,x,y)] = (tile_off,tile_len)
            else:
                directory[(z,x,y)] = (tile_off,tile_len)
        return (directory,leaves)

    def close(self):
        self.f.close()

    @property
    def metadata_len(self):
        return int.from_bytes(self.mmap[4:8],byteorder='little')

    @property
    def metadata(self):
        s = self.mmap[10:10+self.metadata_len]
        return json.loads(s)

    @property
    def version(self):
        return int.from_bytes(self.mmap[2:4],byteorder='little')

    @property
    def root_entries(self):
        return int.from_bytes(self.mmap[8:10],byteorder='little')

    def get(self,z,x,y):
        val = self.root_dir.get((z,x,y))
        if val:
            return self.mmap[val[0]:val[0]+val[1]]
        else:
            z7_tile_diff = z - 7
            z7_tile = (7,x // (1 << z7_tile_diff),y // (1 << z7_tile_diff))
            val = self.leaves.get(z7_tile)
            if val:
                directory, _ = self.load_directory(val[0],val[1]//17)
                val = directory.get((z,x,y))
                if val:
                    return self.mmap[val[0]:val[0]+val[1]]

    def tiles(self):
        for k,v in self.root_dir.items():
            yield (k,self.mmap[v[0]:v[0]+v[1]])
        for val in self.leaves.values():
            leaf_dir, _ = self.load_directory(val[0],val[1]//17)
            for k,v in leaf_dir.items():
                yield (k,self.mmap[v[0]:v[0]+v[1]])

