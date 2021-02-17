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

        self.root_dir = {}
        first_entry_idx = 10+self.metadata_len
        last_entry_idx = first_entry_idx + self.root_entries * 17
        for i in range(first_entry_idx,last_entry_idx,17):
            z = int.from_bytes(self.mmap[i:i+1],byteorder='little')
            x = int.from_bytes(self.mmap[i+1:i+4],byteorder='little')
            y = int.from_bytes(self.mmap[i+4:i+7],byteorder='little')
            tile_off = int.from_bytes(self.mmap[i+7:i+13],byteorder='little')
            tile_len = int.from_bytes(self.mmap[i+13:i+17],byteorder='little')
            self.root_dir[(z,x,y)] = (tile_off,tile_len)

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
