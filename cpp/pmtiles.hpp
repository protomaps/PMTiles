#include <iostream>
#include <fstream>
#include <tuple>
#include <vector>
#include "xxhash.h"
#include <map>

void writePmtilesHeader(std::ostream &outfile, const std::string &metadata, uint16_t root_entries_len) {
    uint16_t MAGIC = 0x4d50;
    outfile.write((char *)&MAGIC,2);
    uint16_t version = 2;
    outfile.write((char *)&version,2);
    uint32_t metadata_size = metadata.size();
    outfile.write((char *)&metadata_size,4);
    outfile.write((char *)&root_entries_len,2);
    outfile << metadata;
}

void writeEntry(std::ostream &outfile, const std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t> &tile, bool is_directory = false) {
    uint8_t z_val = std::get<0>(tile);
    if (is_directory) z_val |= 0b10000000;
    outfile.write((char *)&z_val,1);
    outfile.write((char *)&std::get<1>(tile),3);
    outfile.write((char *)&std::get<2>(tile),3);
    outfile.write((char *)&std::get<3>(tile),6);
    outfile.write((char *)&std::get<4>(tile),4);
}

struct pmtiles_v2_writer {
    std::vector<std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t>> entries{};
    std::ofstream ostream;
    uint64_t offset = 0;
    std::map<XXH64_hash_t,uint64_t> hash_to_offset;
};

pmtiles_v2_writer *pmtiles_v2_open(const char *filename) {
    pmtiles_v2_writer *w = new pmtiles_v2_writer;
    w->ostream.open(filename,std::ios::out | std::ios::binary);

    w->offset = 512000;

    for (int i = 0; i < w->offset; ++i) {
        char zero = 0;
        w->ostream.write(&zero,sizeof(char));
    }

    return w;
}

void pmtiles_v2_write_tile(pmtiles_v2_writer *w, int z, int x, int y, const std::string &data) {
    XXH64_hash_t hash = XXH64(data.data(),data.size(),3857);
    if (w->hash_to_offset.count(hash) > 0) {
        w->entries.emplace_back(z,x,y,w->hash_to_offset[hash],data.size());
    } else {
        w->ostream << data;
        w->entries.emplace_back(z,x,y,w->offset,data.size());
        w->hash_to_offset[hash] = w->offset;
        w->offset += data.size();
    }
}

struct TileCompare {
    bool operator()(std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t> const &lhs, std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t> const &rhs) const
    {
        uint8_t zl = std::get<0>(lhs);
        uint8_t zr = std::get<0>(rhs);
        if (zl != zr) return zl < zr;
        uint32_t xl = std::get<1>(lhs);
        uint32_t xr = std::get<1>(rhs);
        if (xl != xr) return xl < xr;
        uint32_t yl = std::get<2>(lhs);
        uint32_t yr = std::get<2>(rhs);
        return yl < yr;
    }
};

void pmtiles_v2_finalize(pmtiles_v2_writer *w, const std::string serialized_metadata) {
    if (w->entries.size() < 21845) {
        w->ostream.seekp(0);
        writePmtilesHeader(w->ostream,serialized_metadata,w->entries.size());
        sort(begin(w->entries),end(w->entries),TileCompare());

        for (auto const &entry : w->entries) {
            writeEntry(w->ostream,entry);
        }
    } else {
        // this eats too much ram
        std::map<std::tuple<uint8_t,uint32_t,uint32_t>,std::vector<std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t>>> by_z7;
        for (auto const &entry : w->entries) {
            if (std::get<0>(entry) >= 7) {
                int level_diff = std::get<0>(entry) - 7;
                std::tuple<uint8_t,uint32_t,uint32_t> z7_tile{7,std::get<1>(entry)/(1 << level_diff),std::get<2>(entry)/(1 << level_diff)};
                if (by_z7.count(z7_tile) > 0) {
                    by_z7[z7_tile].push_back(entry);
                } else {
                    by_z7[z7_tile] = {entry};
                }
            }
        }

        std::vector<std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t>> leaves;
        std::vector<std::tuple<uint8_t,uint32_t,uint32_t>> leafdir_z7s;
        int leafdir_size = 0;

        for (auto const &group : by_z7) {
            auto key = group.first;
            if (leafdir_size + group.second.size() <= 21845) {
                leafdir_z7s.push_back(key);
                leafdir_size += group.second.size();
            } else {
                for (auto const &k : leafdir_z7s) {
                    leaves.emplace_back(std::get<0>(k),std::get<1>(k),std::get<2>(k),w->offset,17*leafdir_size);
                    auto to_sort = by_z7[k];
                    sort(begin(to_sort),end(to_sort),TileCompare());
                    for (auto const &entry : to_sort) writeEntry(w->ostream,entry);
                }
                w->offset += 17 * leafdir_size;
                leafdir_z7s = {key};
                leafdir_size = group.second.size();
            }
        }

        if (leafdir_size > 0) {
            for (auto const &k : leafdir_z7s) {
                leaves.emplace_back(std::get<0>(k),std::get<1>(k),std::get<2>(k),w->offset,17*leafdir_size);
                    auto to_sort = by_z7[k];
                    sort(begin(to_sort),end(to_sort),TileCompare());
                for (auto const &entry : to_sort) writeEntry(w->ostream,entry);
            }
        }

        std::vector<std::tuple<uint8_t,uint32_t,uint32_t,uint64_t,uint32_t>> root_entries;
        for (auto const &entry : w->entries) {
            if (std::get<0>(entry) < 7) root_entries.push_back(entry);
        }

        w->ostream.seekp(0);
        writePmtilesHeader(w->ostream,serialized_metadata,root_entries.size() + leaves.size());

        std::sort(begin(root_entries),end(root_entries),TileCompare());
        for (auto const &entry : root_entries) {
            writeEntry(w->ostream,entry);
        }
        std::sort(begin(leaves),end(leaves),TileCompare());
        for (auto const & leaf : leaves) {
            writeEntry(w->ostream,leaf,true);
        }
    }

    // cout << "Num tiles: " << tiles.size() << endl;
    // cout << "Num unique tiles: " << hash_to_offset.size() << endl;

    w->ostream.close();

}