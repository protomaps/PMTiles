
#pmtiles to files
import gzip
import json
import os
import sqlite3
from pmtiles.reader import read
from pmtiles.writer import write


def may_compress(data,compress):
    if compress and data[0:2] !=  b'\x1f\x8b':
        return gzip.compress(data)
    return data


def mbtiles_to_pmtiles(input, output, maxzoom):
    conn = sqlite3.connect(input)
    cursor = conn.cursor()

    with write(output) as writer:
        for row in cursor.execute('SELECT zoom_level,tile_column,tile_row,tile_data FROM tiles WHERE zoom_level <= ? ORDER BY zoom_level,tile_column,tile_row ASC',(maxzoom or 99,)):
            flipped = (1 << row[0]) - 1 - row[2]
            writer.write_tile(row[0],row[1],flipped,row[3])

        metadata = {}
        for row in cursor.execute('SELECT name,value FROM metadata'):
            metadata[row[0]] = row[1]
        if maxzoom:
            metadata['maxzoom'] = str(maxzoom)
        result = writer.finalize(metadata)
        print("Num tiles:",result['num_tiles'])
        print("Num unique tiles:",result['num_unique_tiles'])
        print("Num leaves:",result['num_leaves'])

    conn.close()


def pmtiles_to_mbtiles(input, output, gzip):
    conn = sqlite3.connect(output)
    cursor = conn.cursor()
    cursor.execute('CREATE TABLE metadata (name text, value text);')
    cursor.execute('CREATE TABLE tiles (zoom_level integer, tile_column integer, tile_row integer, tile_data blob);')

    with read(input) as reader:
        for k,v in reader.metadata.items():
            cursor.execute('INSERT INTO metadata VALUES(?,?)',(k,v))
        for tile, data in reader.tiles():
            flipped = (1 << tile[0]) - 1 - tile[2]
            cursor.execute('INSERT INTO tiles VALUES(?,?,?,?)',(tile[0],tile[1],flipped,may_compress(data,gzip)))

    cursor.execute('CREATE UNIQUE INDEX tile_index on tiles (zoom_level, tile_column, tile_row);')
    conn.commit()
    conn.close()

def pmtiles_to_dir(input, output, gzip):
    os.makedirs(output)

    with read(input) as reader:
        metadata = reader.metadata
        metadata['format']
        with open(os.path.join(output,'metadata.json'),'w') as f:
            f.write(json.dumps(metadata))

        for tile, data in reader.tiles():
            directory = os.path.join(output,str(tile[0]),str(tile[1]))
            path = os.path.join(directory,str(tile[2]) + '.' + metadata['format'])
            os.makedirs(directory,exist_ok=True)
            with open(path,'wb') as f:
                f.write(may_compress(data,gzip))
