#include "minunit.h"
#include "pmtiles.hpp"

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

MU_TEST(test_serialize_directory) {
	std::vector<entryv3> entries;
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

MU_TEST_SUITE(test_suite) {
	MU_RUN_TEST(test_tileid_to_zxy);
	MU_RUN_TEST(test_zxy_to_tileid);
	MU_RUN_TEST(test_serialize_directory);
	MU_RUN_TEST(test_serialize_header);
	MU_RUN_TEST(test_deserialize_header);
}

int main(int argc, char *argv[]) {
	MU_RUN_SUITE(test_suite);
	MU_REPORT();
	return MU_EXIT_CODE;
}