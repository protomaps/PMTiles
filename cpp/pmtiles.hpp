#ifndef PMTILES_HPP
#define PMTILES_HPP

#include <string>
#include <sstream>
#include <vector>
#include <tuple>

namespace pmtiles {

const uint8_t TILETYPE_UNKNOWN = 0x0;
const uint8_t TILETYPE_MVT = 0x1;
const uint8_t TILETYPE_PNG = 0x2;
const uint8_t TILETYPE_JPEG = 0x3;
const uint8_t TILETYPE_WEBP = 0x4;

const uint8_t COMPRESSION_UNKNOWN = 0x0;
const uint8_t COMPRESSION_NONE = 0x1;
const uint8_t COMPRESSION_GZIP = 0x2;
const uint8_t COMPRESSION_BROTLI = 0x3;
const uint8_t COMPRESSION_ZSTD = 0x4;

struct headerv3 {
	uint64_t root_dir_offset;
	uint64_t root_dir_bytes;
	uint64_t json_metadata_offset;
	uint64_t json_metadata_bytes;
	uint64_t leaf_dirs_offset;
	uint64_t leaf_dirs_bytes;
	uint64_t tile_data_offset;
	uint64_t tile_data_bytes;
	uint64_t addressed_tiles_count;
	uint64_t tile_entries_count;
	uint64_t tile_contents_count;
	bool clustered;
	uint8_t internal_compression;
	uint8_t tile_compression;
	uint8_t tile_type;
	uint8_t min_zoom;
	uint8_t max_zoom;
	int32_t min_lon_e7;
	int32_t min_lat_e7;
	int32_t max_lon_e7;
	int32_t max_lat_e7;
	uint8_t center_zoom;
	int32_t center_lon_e7;
	int32_t center_lat_e7;

	// WARNING: this is limited to little-endian
	std::string serialize() {
		std::stringstream ss;
		ss << "PMTiles";
		uint8_t version = 3;
		ss.write((char *) &version, 1);
		ss.write((char *) &root_dir_offset, 8);
		ss.write((char *) &root_dir_bytes, 8);
		ss.write((char *) &json_metadata_offset, 8);
		ss.write((char *) &json_metadata_bytes, 8);
		ss.write((char *) &leaf_dirs_offset, 8);
		ss.write((char *) &leaf_dirs_bytes, 8);
		ss.write((char *) &tile_data_offset, 8);
		ss.write((char *) &tile_data_bytes, 8);
		ss.write((char *) &addressed_tiles_count, 8);
		ss.write((char *) &tile_entries_count, 8);
		ss.write((char *) &tile_contents_count, 8);

		uint8_t clustered_val = 0x0;
		if (clustered) {
			clustered_val = 0x1;
		}

		ss.write((char *) &clustered_val, 1);
		ss.write((char *) &internal_compression, 1);
		ss.write((char *) &tile_compression, 1);
		ss.write((char *) &tile_type, 1);
		ss.write((char *) &min_zoom, 1);
		ss.write((char *) &max_zoom, 1);
		ss.write((char *) &min_lon_e7, 4);
		ss.write((char *) &min_lat_e7, 4);
		ss.write((char *) &max_lon_e7, 4);
		ss.write((char *) &max_lat_e7, 4);
		ss.write((char *) &center_zoom, 1);
		ss.write((char *) &center_lon_e7, 4);
		ss.write((char *) &center_lat_e7, 4);

		return ss.str();
	}
};

struct pmtiles_magic_number_exception : std::exception {
	const char *what() const noexcept override {
		return "pmtiles magic number exception";
	}
};

struct pmtiles_version_exception : std::exception {
	const char *what() const noexcept override {
		return "pmtiles version: must be 3";
	}
};

inline headerv3 deserialize_header(const std::string &s) {
	if (s.substr(0, 7) != "PMTiles") {
		throw pmtiles_magic_number_exception{};
	}
	if (s.size() != 127 || s[7] != 0x3) {
		throw pmtiles_version_exception{};
	}
	headerv3 h;
	s.copy((char *) &h.root_dir_offset, 8, 8);
	s.copy((char *) &h.root_dir_bytes, 8, 16);
	s.copy((char *) &h.json_metadata_offset, 8, 24);
	s.copy((char *) &h.json_metadata_bytes, 8, 32);
	s.copy((char *) &h.leaf_dirs_offset, 8, 40);
	s.copy((char *) &h.leaf_dirs_bytes, 8, 48);
	s.copy((char *) &h.tile_data_offset, 8, 56);
	s.copy((char *) &h.tile_data_bytes, 8, 64);
	s.copy((char *) &h.addressed_tiles_count, 8, 72);
	s.copy((char *) &h.tile_entries_count, 8, 80);
	s.copy((char *) &h.tile_contents_count, 8, 88);
	if (s[96] == 0x1) {
		h.clustered = true;
	} else {
		h.clustered = false;
	}
	h.internal_compression = s[97];
	h.tile_compression = s[98];
	h.tile_type = s[99];
	h.min_zoom = s[100];
	h.max_zoom = s[101];
	s.copy((char *) &h.min_lon_e7, 4, 102);
	s.copy((char *) &h.min_lat_e7, 4, 106);
	s.copy((char *) &h.max_lon_e7, 4, 110);
	s.copy((char *) &h.max_lat_e7, 4, 114);
	h.center_zoom = s[118];
	s.copy((char *) &h.center_lon_e7, 4, 119);
	s.copy((char *) &h.center_lat_e7, 4, 123);
	return h;
}

struct zxy {
	uint8_t z;
	uint32_t x;
	uint32_t y;

	zxy(int _z, int _x, int _y)
	    : z(_z), x(_x), y(_y) {
	}
};

struct entryv3 {
	uint64_t tile_id;
	uint64_t offset;
	uint32_t length;
	uint32_t run_length;

	entryv3()
	    : tile_id(0), offset(0), length(0), run_length(0) {
	}

	entryv3(uint64_t _tile_id, uint64_t _offset, uint32_t _length, uint32_t _run_length)
	    : tile_id(_tile_id), offset(_offset), length(_length), run_length(_run_length) {
	}
};

struct {
	bool operator()(entryv3 a, entryv3 b) const {
		return a.tile_id < b.tile_id;
	}
} entryv3_cmp;

struct entry_zxy {
	uint8_t z;
	uint32_t x;
	uint32_t y;
	uint64_t offset;
	uint32_t length;

	entry_zxy(uint8_t _z, uint32_t _x, uint32_t _y, uint64_t _offset, uint32_t _length)
	    : z(_z), x(_x), y(_y), offset(_offset), length(_length) {
	}
};

struct {
	bool operator()(entry_zxy a, entry_zxy b) const {
		if (a.z != b.z) {
			return a.z < b.z;
		}
		if (a.x != b.x) {
			return a.x < b.x;
		}
		return a.y < b.y;
	}
} entry_zxy_cmp;

struct varint_too_long_exception : std::exception {
	const char *what() const noexcept override {
		return "varint too long exception";
	}
};

struct end_of_buffer_exception : std::exception {
	const char *what() const noexcept override {
		return "end of buffer exception";
	}
};

namespace {
constexpr const int8_t max_varint_length = sizeof(uint64_t) * 8 / 7 + 1;

// from https://github.com/mapbox/protozero/blob/master/include/protozero/varint.hpp
uint64_t decode_varint_impl(const char **data, const char *end) {
	const auto *begin = reinterpret_cast<const int8_t *>(*data);
	const auto *iend = reinterpret_cast<const int8_t *>(end);
	const int8_t *p = begin;
	uint64_t val = 0;

	if (iend - begin >= max_varint_length) {  // fast path
		do {
			int64_t b = *p++;
			val = ((uint64_t(b) & 0x7fU));
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 7U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 14U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 21U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 28U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 35U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 42U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 49U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x7fU) << 56U);
			if (b >= 0) {
				break;
			}
			b = *p++;
			val |= ((uint64_t(b) & 0x01U) << 63U);
			if (b >= 0) {
				break;
			}
			throw varint_too_long_exception{};
		} while (false);
	} else {
		unsigned int shift = 0;
		while (p != iend && *p < 0) {
			val |= (uint64_t(*p++) & 0x7fU) << shift;
			shift += 7;
		}
		if (p == iend) {
			throw end_of_buffer_exception{};
		}
		val |= uint64_t(*p++) << shift;
	}

	*data = reinterpret_cast<const char *>(p);
	return val;
}

uint64_t decode_varint(const char **data, const char *end) {
	// If this is a one-byte varint, decode it here.
	if (end != *data && ((static_cast<uint64_t>(**data) & 0x80U) == 0)) {
		const auto val = static_cast<uint64_t>(**data);
		++(*data);
		return val;
	}
	// If this varint is more than one byte, defer to complete implementation.
	return decode_varint_impl(data, end);
}

void rotate(int64_t n, int64_t &x, int64_t &y, int64_t rx, int64_t ry) {
	if (ry == 0) {
		if (rx == 1) {
			x = n - 1 - x;
			y = n - 1 - y;
		}
		int64_t t = x;
		x = y;
		y = t;
	}
}

zxy t_on_level(uint8_t z, uint64_t pos) {
	int64_t n = 1 << z;
	int64_t rx, ry, s, t = pos;
	int64_t tx = 0;
	int64_t ty = 0;

	for (s = 1; s < n; s *= 2) {
		rx = 1 & (t / 2);
		ry = 1 & (t ^ rx);
		rotate(s, tx, ty, rx, ry);
		tx += s * rx;
		ty += s * ry;
		t /= 4;
	}
	return zxy(z, tx, ty);
}

int write_varint(std::back_insert_iterator<std::string> data, uint64_t value) {
	int n = 1;

	while (value >= 0x80U) {
		*data++ = char((value & 0x7fU) | 0x80U);
		value >>= 7U;
		++n;
	}
	*data = char(value);

	return n;
}

struct {
	bool operator()(entry_zxy a, entry_zxy b) const {
		if (a.z != b.z) {
			return a.z < b.z;
		}
		if (a.x != b.x) {
			return a.x < b.x;
		}
		return a.y < b.y;
	}
} colmajor_cmp;

// use a 0 length entry as a null value.
entryv3 find_tile(const std::vector<entryv3> &entries, uint64_t tile_id) {
	int m = 0;
	int n = entries.size() - 1;
	while (m <= n) {
		int k = (n + m) >> 1;
		int cmp = tile_id - entries[k].tile_id;
		if (cmp > 0) {
			m = k + 1;
		} else if (cmp < 0) {
			n = k - 1;
		} else {
			return entries[k];
		}
	}

	if (n >= 0) {
		if (entries[n].run_length == 0) {
			return entries[n];
		}
		if (tile_id - entries[n].tile_id < entries[n].run_length) {
			return entries[n];
		}
	}

	return entryv3{0, 0, 0, 0};
}

}  // end anonymous namespace

inline zxy tileid_to_zxy(uint64_t tileid) {
	uint64_t acc = 0;
	uint8_t t_z = 0;
	while (true) {
		uint64_t num_tiles = (1 << t_z) * (1 << t_z);
		if (acc + num_tiles > tileid) {
			return t_on_level(t_z, tileid - acc);
		}
		acc += num_tiles;
		t_z++;
	}
}

inline uint64_t zxy_to_tileid(uint8_t z, uint32_t x, uint32_t y) {
	uint64_t acc = 0;
	for (uint8_t t_z = 0; t_z < z; t_z++) acc += (0x1 << t_z) * (0x1 << t_z);
	int64_t n = 1 << z;
	int64_t rx, ry, s, d = 0;
	int64_t tx = x;
	int64_t ty = y;
	for (s = n / 2; s > 0; s /= 2) {
		rx = (tx & s) > 0;
		ry = (ty & s) > 0;
		d += s * s * ((3 * rx) ^ ry);
		rotate(s, tx, ty, rx, ry);
	}
	return acc + d;
}

// returns an uncompressed byte buffer
inline std::string serialize_directory(const std::vector<entryv3> &entries) {
	std::string data;

	write_varint(std::back_inserter(data), entries.size());

	uint64_t last_id = 0;
	for (auto const &entry : entries) {
		write_varint(std::back_inserter(data), entry.tile_id - last_id);
		last_id = entry.tile_id;
	}

	for (auto const &entry : entries) {
		write_varint(std::back_inserter(data), entry.run_length);
	}

	for (auto const &entry : entries) {
		write_varint(std::back_inserter(data), entry.length);
	}

	for (size_t i = 0; i < entries.size(); i++) {
		if (i > 0 && entries[i].offset == entries[i - 1].offset + entries[i - 1].length) {
			write_varint(std::back_inserter(data), 0);
		} else {
			write_varint(std::back_inserter(data), entries[i].offset + 1);
		}
	}

	return data;
}

// takes an uncompressed byte buffer
inline std::vector<entryv3> deserialize_directory(const std::string &decompressed) {
	const char *t = decompressed.data();
	const char *end = t + decompressed.size();

	uint64_t num_entries = decode_varint(&t, end);

	std::vector<entryv3> result;
	result.resize(num_entries);

	uint64_t last_id = 0;
	for (size_t i = 0; i < num_entries; i++) {
		uint64_t tile_id = last_id + decode_varint(&t, end);
		result[i].tile_id = tile_id;
		last_id = tile_id;
	}

	for (size_t i = 0; i < num_entries; i++) {
		result[i].run_length = decode_varint(&t, end);
	}

	for (size_t i = 0; i < num_entries; i++) {
		result[i].length = decode_varint(&t, end);
	}

	for (size_t i = 0; i < num_entries; i++) {
		uint64_t tmp = decode_varint(&t, end);

		if (i > 0 && tmp == 0) {
			result[i].offset = result[i - 1].offset + result[i - 1].length;
		} else {
			result[i].offset = tmp - 1;
		}
	}

	// assert the directory has been fully consumed
	if (t != end) {
		fprintf(stderr, "Error: malformed pmtiles directory\n");
		exit(EXIT_FAILURE);
	}

	return result;
}

inline std::tuple<std::string, std::string, int> build_root_leaves(const std::function<std::string(const std::string &, uint8_t)> mycompress, uint8_t compression, const std::vector<pmtiles::entryv3> &entries, int leaf_size) {
	std::vector<pmtiles::entryv3> root_entries;
	std::string leaves_bytes;
	int num_leaves = 0;
	for (size_t i = 0; i <= entries.size(); i += leaf_size) {
		num_leaves++;
		int end = i + leaf_size;
		if (i + leaf_size > entries.size()) {
			end = entries.size();
		}
		std::vector<pmtiles::entryv3> subentries = {entries.begin() + i, entries.begin() + end};
		auto uncompressed_leaf = pmtiles::serialize_directory(subentries);
		auto compressed_leaf = mycompress(uncompressed_leaf, compression);
		root_entries.emplace_back(entries[i].tile_id, leaves_bytes.size(), compressed_leaf.size(), 0);
		leaves_bytes += compressed_leaf;
	}
	auto uncompressed_root = pmtiles::serialize_directory(root_entries);
	auto compressed_root = mycompress(uncompressed_root, compression);
	return std::make_tuple(compressed_root, leaves_bytes, num_leaves);
}

inline std::tuple<std::string, std::string, int> make_root_leaves(const std::function<std::string(const std::string &, uint8_t)> mycompress, uint8_t compression, const std::vector<pmtiles::entryv3> &entries) {
	auto test_bytes = pmtiles::serialize_directory(entries);
	auto compressed = mycompress(test_bytes, compression);
	if (compressed.size() <= 16384 - 127) {
		return std::make_tuple(compressed, "", 0);
	}
	int leaf_size = 4096;
	while (true) {
		std::string root_bytes;
		std::string leaves_bytes;
		int num_leaves;
		std::tie(root_bytes, leaves_bytes, num_leaves) = build_root_leaves(mycompress, compression, entries, leaf_size);
		if (root_bytes.length() < 16384 - 127) {
			return std::make_tuple(root_bytes, leaves_bytes, num_leaves);
		}
		leaf_size *= 2;
	}
}

inline void collect_entries_zxy(const std::function<std::string(const std::string &, uint8_t)> decompress, std::vector<entry_zxy> &tile_entries, const char *pmtiles_map, const headerv3 &h, uint64_t dir_offset, uint64_t dir_len) {
	std::string dir_s{pmtiles_map + dir_offset, dir_len};
	std::string decompressed_dir = decompress(dir_s, h.internal_compression);

	auto dir_entries = pmtiles::deserialize_directory(decompressed_dir);
	for (auto const &entry : dir_entries) {
		if (entry.run_length == 0) {
			collect_entries_zxy(decompress, tile_entries, pmtiles_map, h, h.leaf_dirs_offset + entry.offset, entry.length);
		} else {
			for (uint64_t i = entry.tile_id; i < entry.tile_id + entry.run_length; i++) {
				pmtiles::zxy zxy = pmtiles::tileid_to_zxy(i);
				tile_entries.emplace_back(zxy.z, zxy.x, zxy.y, h.tile_data_offset + entry.offset, entry.length);
			}
		}
	}
}

inline std::vector<entry_zxy> entries_zxy(const std::function<std::string(const std::string &, uint8_t)> decompress, const char *pmtiles_map) {
	std::string header_s{pmtiles_map, 127};
	auto header = pmtiles::deserialize_header(header_s);

	std::vector<entry_zxy> tile_entries;

	collect_entries_zxy(decompress, tile_entries, pmtiles_map, header, header.root_dir_offset, header.root_dir_bytes);
	std::sort(tile_entries.begin(), tile_entries.end(), colmajor_cmp);
	return tile_entries;
}

inline std::tuple<uint64_t, uint32_t> get_tile(const std::function<std::string(const std::string &, uint8_t)> decompress, const char *pmtiles_map, uint8_t z, uint32_t x, uint32_t y) {
	uint64_t tile_id = pmtiles::zxy_to_tileid(z, x, y);

	std::string header_s{pmtiles_map, 127};
	auto h = pmtiles::deserialize_header(header_s);

	uint64_t dir_offset = h.root_dir_offset;
	uint32_t dir_length = h.root_dir_bytes;
	for (int depth = 0; depth <= 3; depth++) {
		std::string dir_s{pmtiles_map + dir_offset, dir_length};
		std::string decompressed_dir = decompress(dir_s, h.internal_compression);
		auto dir_entries = pmtiles::deserialize_directory(decompressed_dir);
		auto entry = find_tile(dir_entries, tile_id);

		if (entry.length > 0) {
			if (entry.run_length > 0) {
				return std::make_pair(h.tile_data_offset + entry.offset, entry.length);
			} else {
				dir_offset = h.leaf_dirs_offset + entry.offset;
				dir_length = entry.length;
			}
		} else {
			return std::make_pair(0, 0);
		}
	}

	return std::make_pair(0, 0);
}

}  // namespace pmtiles
#endif