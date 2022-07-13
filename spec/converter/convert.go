package main

import (
	"bytes"
	"compress/gzip"
	"encoding/binary"
	"encoding/json"
	"fmt"
	"github.com/RoaringBitmap/roaring"
	"github.com/schollz/progressbar/v3"
	"hash/fnv"
	"io"
	"io/ioutil"
	"log"
	"math"
	"os"
	// "runtime/pprof"
	"strconv"
	"strings"
	"time"
	"zombiezen.com/go/sqlite"
)

type Entry struct {
	Id        int64
	Offset    int64
	Length    int32
	RunLength uint32
}

type Header struct {
	SpecVersion      uint8
	RootLength       uint32
	MetadataLength   uint32 // NEED leaf length
	Tiles            uint64
	TileEntries      uint64
	UniqueTiles      uint64
	IndexCompression string
	TileCompression  string
	Clustered        bool
	Format           string
	MinZoom          uint8
	MaxZoom          uint8
	MinLon           float32
	MinLat           float32
	MaxLon           float32
	MaxLat           float32
	CenterZoom       uint8
	CenterLon        float32
	CenterLat        float32
}

func serialize_entries(entries []Entry) []byte {
	var b bytes.Buffer
	tmp := make([]byte, binary.MaxVarintLen64)
	w := gzip.NewWriter(&b)

	// write a length prefix
	n := binary.PutUvarint(tmp, uint64(len(entries)))
	w.Write(tmp[:n])

	lastId := uint64(0)
	for _, entry := range entries {
		n := binary.PutUvarint(tmp, uint64(entry.Id)-lastId)
		w.Write(tmp[:n])
		lastId = uint64(entry.Id)
	}

	for _, entry := range entries {
		n := binary.PutUvarint(tmp, uint64(entry.RunLength))
		w.Write(tmp[:n])
	}

	// put lengths
	for _, entry := range entries {
		n := binary.PutUvarint(tmp, uint64(entry.Length))
		w.Write(tmp[:n])
	}

	// put offsets
	for i, entry := range entries {
		var n int
		if i > 0 && entry.Offset == entries[i-1].Offset+int64(entries[i-1].Length) {
			n = binary.PutUvarint(tmp, 0)
		} else {
			n = binary.PutUvarint(tmp, uint64(entry.Offset+1)) // add 1 to not conflict with 0
		}
		w.Write(tmp[:n])
	}

	w.Close()
	return b.Bytes()
}

func build_tree(entries []Entry, dir_size int) ([]byte, []byte) {
	root_entries := make([]Entry, 0)
	var leaves []byte
	var root []byte

	fmt.Println("target directory count", dir_size)

	for idx := 0; idx <= len(entries); idx += dir_size {
		end := idx + dir_size
		if idx+dir_size > len(entries) {
			end = len(entries)
		}
		serialized := serialize_entries(entries[idx:end])

		root_entries = append(root_entries, Entry{entries[idx].Id, int64(len(leaves)), int32(len(serialized)), 0})
		leaves = append(leaves, serialized...)
	}

	fmt.Println("root entries count", len(root_entries))
	root = serialize_entries(root_entries)
	fmt.Println("root dir bytes", len(root))
	fmt.Println("leaves dir bytes", len(leaves))
	fmt.Println("average leaf dir bytes", len(leaves) / (len(entries)/dir_size+1))
	return root, leaves
}

func main() {
	// f, err := os.Create("output.profile")
	// if err != nil {
	// 	log.Fatal(err)
	// }
	// pprof.StartCPUProfile(f)
	// defer pprof.StopCPUProfile()

	start := time.Now()

	// create ID bitmap
	conn, err := sqlite.OpenConn(os.Args[1], sqlite.OpenReadOnly)
	if err != nil {
		log.Fatal(err)
	}
	defer conn.Close()

	tileset := roaring.New()
	{
		stmt, _, err := conn.PrepareTransient("SELECT zoom_level, tile_column, tile_row FROM tiles")
		if err != nil {
			log.Fatal(err)
		}
		defer stmt.Finalize()

		for {
			row, err := stmt.Step()
			if err != nil {
				log.Fatal(err)
			}
			if !row {
				break
			}
			z := stmt.ColumnInt64(0)
			x := stmt.ColumnInt64(1)
			y := stmt.ColumnInt64(2)
			flipped_y := (1 << z) - 1 - y
			id := ZxyToId(z, x, flipped_y)
			tileset.Add(uint32(id))
		}
	}

	fmt.Println("Total tile entries", tileset.GetCardinality())
	fmt.Println("Elapsed", time.Since(start))

	// Create entries with RLE encoding

	tmpfile, err := ioutil.TempFile("", "")
	if err != nil {
		log.Fatal(err)
	}
	defer os.Remove(tmpfile.Name())
	entries := make([]Entry, 0)
	maxRunLength := uint32(0)
	id_to_offset := make(map[uint64]uint64)

	{
		bar := progressbar.Default(int64(tileset.GetCardinality()))
		i := tileset.Iterator()
		stmt := conn.Prep("SELECT tile_data FROM tiles WHERE zoom_level = ? AND tile_column = ? AND tile_row = ?")

		offset := uint64(0)
		for i.HasNext() {
			id := i.Next()
			z, x, y := IdToZxy(int64(id))
			flipped_y := (1 << z) - 1 - y

			stmt.BindInt64(1, z)
			stmt.BindInt64(2, x)
			stmt.BindInt64(3, flipped_y)

			has_row, err := stmt.Step()
			if err != nil {
				log.Fatal(err)
			}
			if !has_row {
				log.Fatal("Missing row")
			}

			reader := stmt.ColumnReader(0)

			buf := new(bytes.Buffer)
			buf.ReadFrom(reader)
			data := buf.Bytes()

			hsh := fnv.New64a()
			hsh.Write(data)
			sum := hsh.Sum64()

			if val, ok := id_to_offset[sum]; ok {
				last_entry := entries[len(entries)-1]
				// fmt.Println(IdToZxy((int64(id))))
				// fmt.Println(id,last_entry.Id,last_entry.RunLength,last_entry.Offset,val);

				if int64(id) == last_entry.Id+int64(last_entry.RunLength) && last_entry.Offset == int64(val) {
					// apply run-length compression
					// runlength 0 means it is a leaf directory
					entries[len(entries)-1].RunLength++
					if entries[len(entries)-1].RunLength > maxRunLength {
						maxRunLength = entries[len(entries)-1].RunLength
					}
				} else {
					entries = append(entries, Entry{int64(id), int64(val), int32(len(data)), 1})
				}
			} else {

				id_to_offset[sum] = offset
				entries = append(entries, Entry{int64(id), int64(offset), int32(len(data)), 1})

				tmpfile.Write(data)
				offset += uint64(len(data))
			}

			stmt.ClearBindings()
			stmt.Reset()
			bar.Add(1)
		}
	}

	tmpfile.Seek(0, 0)

	fmt.Println("Length of entries", len(entries))

	// construct index
	var leaves []byte
	var root []byte

	// test the size of the root directory
	test_root := serialize_entries(entries)
	fmt.Println("Test root entries", len(test_root))

	// (8 + 58 kb) root entries # 2282
	// (16 + 29 kb) root entrie # 4564
	// 20 kb + 23 kb root entries # 5714

	if len(test_root) <= 16384 - 83 {
		fmt.Println("root entries len", len(entries))
		root = serialize_entries(entries)
	} else {
		// dir_size := int(math.Ceil(math.Sqrt(float64(len(entries)))))

		root, leaves = build_tree(entries, 4096)
		root, leaves = build_tree(entries, 8192)
		root, leaves = build_tree(entries, 16384)
	}
	total_index_size := len(root) + len(leaves)

	metadata := make(map[string]interface{})

	var header Header
	{
		stmt, _, err := conn.PrepareTransient("SELECT name, value FROM metadata")
		if err != nil {
			log.Fatal(err)
		}
		defer stmt.Finalize()

		for {
			row, err := stmt.Step()
			if err != nil {
				log.Fatal(err)
			}
			if !row {
				break
			}
			name := stmt.ColumnText(0)
			value := stmt.ColumnText(1)
			if name == "version" || name == "compression" {
				// skip
			} else if name == "format" {
				header.Format = value
			} else if name == "center" {
				parts := strings.Split(value, ",")
				f, err := strconv.ParseFloat(parts[0], 32)
				if err != nil {
					log.Fatal(err)
				}
				header.CenterLon = float32(f)
				f, err = strconv.ParseFloat(parts[1], 32)
				if err != nil {
					log.Fatal(err)
				}
				header.CenterLat = float32(f)
				i, err := strconv.ParseInt(parts[2], 10, 8)
				if err != nil {
					log.Fatal(err)
				}
				header.CenterZoom = uint8(i)
			} else if name == "bounds" {
				parts := strings.Split(value, ",")
				f, err := strconv.ParseFloat(parts[0], 32)
				if err != nil {
					log.Fatal(err)
				}
				header.MinLon = float32(f)
				f, err = strconv.ParseFloat(parts[1], 32)
				if err != nil {
					log.Fatal(err)
				}
				header.MinLat = float32(f)
				f, err = strconv.ParseFloat(parts[2], 32)
				if err != nil {
					log.Fatal(err)
				}
				header.MaxLon = float32(f)
				f, err = strconv.ParseFloat(parts[3], 32)
				if err != nil {
					log.Fatal(err)
				}
				header.MaxLat = float32(f)
			} else if name == "minzoom" {
				i, err := strconv.ParseInt(value, 10, 8)
				if err != nil {
					log.Fatal(err)
				}
				header.MinZoom = uint8(i)
			} else if name == "maxzoom" {
				i, err := strconv.ParseInt(value, 10, 8)
				if err != nil {
					log.Fatal(err)
				}
				header.MaxZoom = uint8(i)
			} else if name == "json" {
				var mbtilesJson map[string]interface{}
				json.Unmarshal([]byte(value), &mbtilesJson)
				metadata["json"] = mbtilesJson
			} else {
				metadata[name] = value
			}
		}
	}

	metadata_bytes, err := json.Marshal(metadata)
	if err != nil {
		log.Fatal(err)
	}

	// header
	header_bytes := make([]byte, 83)
	o := 0
	// Magic Numbers
	copy(header_bytes[o:o+2], "PM")
	o += 2
	// Spec Version
	header_bytes[o] = 3
	o += 1
	// root directory length in bytes (4 bytes)
	binary.LittleEndian.PutUint32(header_bytes[o:o+4], uint32(len(root)))
	o += 4
	// metadata length in bytes (4 bytes)
	binary.LittleEndian.PutUint32(header_bytes[o:o+4], uint32(len(metadata_bytes)))
	o += 4

	// total tiles (before RLE encoding)
	binary.LittleEndian.PutUint64(header_bytes[o:o+8], tileset.GetCardinality())
	o += 8
	// total entries (after RLE encoding)
	binary.LittleEndian.PutUint64(header_bytes[o:o+8], uint64(len(entries)))
	o += 8

	// unique tiles (unique offsets)
	binary.LittleEndian.PutUint64(header_bytes[o:o+8], uint64(len(id_to_offset)))
	o += 8

	// compression: "gzip", "br", "zstd", "deflate"... etc (10 bytes)
	copy(header_bytes[o:o+10], "gzip")
	o += 10
	// clustered: one byte (true/false)
	header_bytes[o] = 1
	o += 1
	// format: "pbf", "png", "jpg"... (10 bytes)
	copy(header_bytes[o:o+10], header.Format)
	o += 10
	// minzoom (1 byte) REQUIRED
	header_bytes[o] = header.MinZoom
	o += 1
	// maxzoom (1 byte) REQUIRED
	header_bytes[o] = header.MaxZoom
	o += 1

	binary.LittleEndian.PutUint32(header_bytes[o:o+4], math.Float32bits(header.MinLon))
	o += 4
	binary.LittleEndian.PutUint32(header_bytes[o:o+4], math.Float32bits(header.MinLat))
	o += 4
	binary.LittleEndian.PutUint32(header_bytes[o:o+4], math.Float32bits(header.MaxLon))
	o += 4
	binary.LittleEndian.PutUint32(header_bytes[o:o+4], math.Float32bits(header.MaxLat))
	o += 4

	header_bytes[o] = header.CenterZoom
	o += 1

	binary.LittleEndian.PutUint32(header_bytes[o:o+4], math.Float32bits(header.CenterLon))
	o += 4
	binary.LittleEndian.PutUint32(header_bytes[o:o+4], math.Float32bits(header.CenterLat))

	// construct the final file

	outfile, err := os.Create(os.Args[2])
	outfile.Write(header_bytes)
	outfile.Write(root)
	outfile.Write(metadata_bytes)
	outfile.Write(leaves)
	io.Copy(outfile, tmpfile)

	fmt.Println("Elapsed", time.Since(start))
	fmt.Println("Max runlength", maxRunLength)
	fmt.Println("Naive index size", 24*tileset.GetCardinality())
	fmt.Println("Total unique tiles", len(id_to_offset))

	fmt.Println("root entries size ", len(root))
	fmt.Println("Final index size", total_index_size)
	fmt.Println("Bytes per entry", float64(total_index_size)/float64(tileset.GetCardinality()))
}
