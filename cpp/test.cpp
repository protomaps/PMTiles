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
	mu_check(zxy_to_tileid(0,0,0) == 0);
	mu_check(zxy_to_tileid(1,0,0) == 1);
	mu_check(zxy_to_tileid(1,0,1) == 2);
	mu_check(zxy_to_tileid(1,1,1) == 3);
	mu_check(zxy_to_tileid(1,1,0) == 4);
	mu_check(zxy_to_tileid(2,0,0) == 5);
}

MU_TEST(test_serialize_directory) {
	std::vector<entryv3> entries;
	entries.push_back(entryv3(0,0,0,0));
	entries.push_back(entryv3(1,1,1,1));
	entries.push_back(entryv3(2,2,2,2));
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

MU_TEST_SUITE(test_suite) {
	MU_RUN_TEST(test_tileid_to_zxy);
	MU_RUN_TEST(test_zxy_to_tileid);
	MU_RUN_TEST(test_serialize_directory);
	MU_RUN_TEST(test_serialize_header);
}

int main(int argc, char *argv[]) {
	MU_RUN_SUITE(test_suite);
	MU_REPORT();
	return MU_EXIT_CODE;
}