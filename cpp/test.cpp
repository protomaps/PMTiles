#include "minunit.h"
#include "pmtiles.hpp"
#include <sys/stat.h>
#include <sys/mman.h>
#include <fcntl.h>
#include <fstream>
#include <iostream>

using namespace std;
using namespace pmtiles;

MU_TEST(test_tileid_to_zxy) {
	auto result = tileid_to_zxy(0);
	mu_check(result.z == 0);
	mu_check(result.x == 0);
	mu_check(result.y == 0);
	result = tileid_to_zxy(1);
	mu_check(result.z == 1);
	mu_check(result.x == 0);
	mu_check(result.y == 0);
	result = tileid_to_zxy(2);
	mu_check(result.z == 1);
	mu_check(result.x == 0);
	mu_check(result.y == 1);
	result = tileid_to_zxy(3);
	mu_check(result.z == 1);
	mu_check(result.x == 1);
	mu_check(result.y == 1);
	result = tileid_to_zxy(4);
	mu_check(result.z == 1);
	mu_check(result.x == 1);
	mu_check(result.y == 0);
	result = tileid_to_zxy(5);
	mu_check(result.z == 2);
	mu_check(result.x == 0);
	mu_check(result.y == 0);
}

MU_TEST(test_zxy_to_tileid) {
	mu_check(zxy_to_tileid(0, 0, 0) == 0);
	mu_check(zxy_to_tileid(1, 0, 0) == 1);
	mu_check(zxy_to_tileid(1, 0, 1) == 2);
	mu_check(zxy_to_tileid(1, 1, 1) == 3);
	mu_check(zxy_to_tileid(1, 1, 0) == 4);
	mu_check(zxy_to_tileid(2, 0, 0) == 5);
}

MU_TEST(test_roundtrip) {
	for (int z = 0; z < 32; z++) {
		uint32_t dim = (1 << z) - 1;
		auto tl = tileid_to_zxy(zxy_to_tileid(z, 0, 0));
		mu_check(tl.z == z);
		mu_check(tl.x == 0);
		mu_check(tl.y == 0);
		auto tr = tileid_to_zxy(zxy_to_tileid(z, dim, 0));
		mu_check(tr.z == z);
		mu_check(tr.x == dim);
		mu_check(tr.y == 0);
		auto bl = tileid_to_zxy(zxy_to_tileid(z, 0, dim));
		mu_check(bl.z == z);
		mu_check(bl.x == 0);
		mu_check(bl.y == dim);
		auto br = tileid_to_zxy(zxy_to_tileid(z, dim, dim));
		mu_check(br.z == z);
		mu_check(br.x == dim);
		mu_check(br.y == dim);
	}

	bool caught = false;
	try {
		tileid_to_zxy(18446744073709551615ULL);
	} catch (const std::runtime_error &e) {
		caught = true;
	}

	mu_check(caught);

	caught = false;
	try {
		zxy_to_tileid(32, 0, 0);
	} catch (const std::runtime_error &e) {
		caught = true;
	}

	mu_check(caught);

	caught = false;
	try {
		zxy_to_tileid(0, 1, 1);
	} catch (const std::runtime_error &e) {
		caught = true;
	}

	mu_check(caught);

	caught = false;
	try {
		zxy_to_tileid(31, 2147483647ULL + 1, 2147483647ULL + 1);
	} catch (const std::runtime_error &e) {
		caught = true;
	}
	mu_check(caught);
}

MU_TEST(test_serialize_directory) {
	vector<entryv3> entries;
	entries.push_back(entryv3(0, 0, 0, 0));
	entries.push_back(entryv3(1, 1, 1, 1));
	entries.push_back(entryv3(2, 2, 2, 2));
	auto serialized = serialize_directory(entries);
	auto result = deserialize_directory(serialized);
	mu_check(result.size() == 3);
	mu_check(result[0].tile_id == 0);
	mu_check(result[0].offset == 0);
	mu_check(result[0].length == 0);
	mu_check(result[0].run_length == 0);
	mu_check(result[1].tile_id == 1);
	mu_check(result[1].offset == 1);
	mu_check(result[1].length == 1);
	mu_check(result[1].run_length == 1);
	mu_check(result[2].tile_id == 2);
	mu_check(result[2].offset == 2);
	mu_check(result[2].length == 2);
	mu_check(result[2].run_length == 2);
}

MU_TEST(test_serialize_header) {
	headerv3 header;
	auto len = header.serialize().size();
	mu_check(len == 127);
}

MU_TEST(test_deserialize_header) {
	headerv3 header;
	header.root_dir_offset = 1;
	header.root_dir_bytes = 2;
	header.json_metadata_offset = 3;
	header.json_metadata_bytes = 4;
	header.leaf_dirs_offset = 5;
	header.leaf_dirs_bytes = 6;
	header.tile_data_offset = 7;
	header.tile_data_bytes = 8;
	header.addressed_tiles_count = 9;
	header.tile_entries_count = 10;
	header.tile_contents_count = 11;
	header.clustered = true;
	header.internal_compression = 0x1;
	header.tile_compression = 0x2;
	header.tile_type = 0x3;
	header.min_zoom = 12;
	header.max_zoom = 13;
	header.min_lon_e7 = 14;
	header.min_lat_e7 = 15;
	header.max_lon_e7 = 16;
	header.max_lat_e7 = 17;
	header.center_zoom = 14;
	header.center_lon_e7 = 18;
	header.center_lat_e7 = 19;
	auto serialized = header.serialize();
	auto deserialized = deserialize_header(serialized);
	mu_check(deserialized.root_dir_offset == 1);
	mu_check(deserialized.root_dir_bytes == 2);
	mu_check(deserialized.json_metadata_offset == 3);
	mu_check(deserialized.json_metadata_bytes == 4);
	mu_check(deserialized.leaf_dirs_offset == 5);
	mu_check(deserialized.leaf_dirs_bytes == 6);
	mu_check(deserialized.tile_data_offset == 7);
	mu_check(deserialized.tile_data_bytes == 8);
	mu_check(deserialized.addressed_tiles_count == 9);
	mu_check(deserialized.tile_entries_count == 10);
	mu_check(deserialized.tile_contents_count == 11);
	mu_check(deserialized.clustered == true);
	mu_check(deserialized.internal_compression == 0x1);
	mu_check(deserialized.tile_compression == 0x2);
	mu_check(deserialized.tile_type == 0x3);
	mu_check(deserialized.min_zoom == 12);
	mu_check(deserialized.max_zoom == 13);
	mu_check(deserialized.min_lon_e7 == 14);
	mu_check(deserialized.min_lat_e7 == 15);
	mu_check(deserialized.max_lon_e7 == 16);
	mu_check(deserialized.max_lat_e7 == 17);
	mu_check(deserialized.center_zoom == 14);
	mu_check(deserialized.center_lon_e7 == 18);
	mu_check(deserialized.center_lat_e7 == 19);
}

static string mycompress(const string &input, uint8_t compression) {
	if (compression != pmtiles::COMPRESSION_NONE)
		throw runtime_error("Unsupported compression");
	return input;
}

static string mydecompress(const string &input, uint8_t compression) {
	if (compression != pmtiles::COMPRESSION_NONE)
		throw runtime_error("Unsupported compression");
	return input;
}

MU_TEST(test_build_dirs_one) {
	vector<entryv3> entries;
	entries.push_back(entryv3(0, 0, 1, 2));
	string root_bytes;
	string leaves_bytes;
	int num_leaves;
	tie(root_bytes, leaves_bytes, num_leaves) = build_root_leaves(&mycompress, pmtiles::COMPRESSION_NONE, entries, 1);
	mu_check(num_leaves == 1);
}

MU_TEST(test_build_dirs) {
	vector<entryv3> entries;
	for (int i = 0; i < 100000; i += 2) {
		entries.push_back(entryv3(i, i, 1, 2));
	}
	string root_bytes;
	string leaves_bytes;
	int num_leaves;
	tie(root_bytes, leaves_bytes, num_leaves) = make_root_leaves(&mycompress, pmtiles::COMPRESSION_NONE, entries);

	pmtiles::headerv3 header;
	header.clustered = 0x0;
	header.internal_compression = COMPRESSION_NONE;
	header.root_dir_offset = 127;
	header.root_dir_bytes = root_bytes.size();
	header.leaf_dirs_offset = 127 + root_bytes.size();
	header.leaf_dirs_bytes = leaves_bytes.size();
	header.tile_data_offset = header.leaf_dirs_offset + header.leaf_dirs_bytes;

	ofstream ostream;
	ostream.open("tmp.pmtiles", ios::out | ios::binary);
	auto header_str = header.serialize();
	ostream.write(header_str.data(), header_str.length());
	ostream.write(root_bytes.data(), root_bytes.length());
	ostream.write(leaves_bytes.data(), leaves_bytes.length());
	ostream.close();

	mu_check(root_bytes.size() <= 16384);

	struct stat st;
	int fd = open("tmp.pmtiles", O_RDONLY);
	fstat(fd, &st);
	char *map = static_cast<char *>(mmap(nullptr, st.st_size, PROT_READ, MAP_PRIVATE, fd, 0));

	auto result = entries_tms(&mydecompress, map);
	mu_check(result.size() == 100000);
	// 1 4
	// 2 3
	// in TMS order, 2, 1, 3, 4
	mu_check(result[0].offset == header.tile_data_offset);
	mu_check(result[1].offset == header.tile_data_offset + 2);
	mu_check(result[2].offset == header.tile_data_offset);
	mu_check(result[3].offset == header.tile_data_offset + 2);
	mu_check(result[4].offset == header.tile_data_offset + 4);

	for (int i = 0; i < 100000; i += 31) {
		auto zxy = tileid_to_zxy(i);
		auto tile = get_tile(&mydecompress, map, zxy.z, zxy.x, zxy.y);
		mu_check(get<0>(tile) == header.tile_data_offset + i - (i % 2));
		mu_check(get<1>(tile) == 1);
	}

	unlink("tmp.pmtiles");
}

MU_TEST_SUITE(test_suite) {
	MU_RUN_TEST(test_tileid_to_zxy);
	MU_RUN_TEST(test_zxy_to_tileid);
	MU_RUN_TEST(test_roundtrip);
	MU_RUN_TEST(test_serialize_directory);
	MU_RUN_TEST(test_serialize_header);
	MU_RUN_TEST(test_deserialize_header);
	MU_RUN_TEST(test_build_dirs);
	MU_RUN_TEST(test_build_dirs_one);
}

int main() {
	MU_RUN_SUITE(test_suite);
	MU_REPORT();
	return MU_EXIT_CODE;
}