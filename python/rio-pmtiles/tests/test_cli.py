import os
import sqlite3
import sys
import warnings

import click
from click.testing import CliRunner
import pytest
import rasterio
from rasterio.rio.main import main_group

from pmtiles.reader import Reader, MmapSource, all_tiles
import rio_pmtiles.scripts.cli
from rio_pmtiles.scripts.cli import guess_maxzoom

from conftest import mock

class Output:
    def __init__(self, fname):
        self.file = open(fname, 'rb')

    def __enter__(self):
        return Reader(MmapSource(self.file))

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.file.close()

def test_cli_help():
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles", "--help"])
    assert result.exit_code == 0
    assert "Export a dataset to PMTiles." in result.output


@mock.patch("rio_pmtiles.scripts.cli.rasterio")
def test_dst_nodata_validation(rio):
    """--dst-nodata requires source nodata in some form"""
    rio.open.return_value.__enter__.return_value.profile.get.return_value = None
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", "--dst-nodata", "0", "in.tif", "out.pmtiles"]
    )
    assert result.exit_code == 2


@pytest.mark.parametrize("filename", ["RGB.byte.tif", "RGBA.byte.tif"])
def test_export_metadata(tmpdir, data, filename):
    inputfile = str(data.join(filename))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles", inputfile, outputfile])
    assert result.exit_code == 0

    with Output(outputfile) as p:
        assert p.metadata()['name'] == filename

def test_export_metadata_output_opt(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles", inputfile, "-o", outputfile])
    assert result.exit_code == 0

    with Output(outputfile) as p:
        assert p.metadata()['name'] == "RGB.byte.tif"

def test_export_tiles(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles", inputfile, outputfile])
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 19


def test_export_zoom_both(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", inputfile, outputfile, "--zoom-levels", "6..7"]
    )
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 6

def test_export_zoom_neither(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", inputfile, outputfile, "--zoom-levels", ".."]
    )
    assert result.exit_code == 0

    with open(outputfile, "rb") as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 19

def test_export_zoom_only_min(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", inputfile, outputfile, "--zoom-levels", "6.."]
    )
    assert result.exit_code == 0

    with open(outputfile, "rb") as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 12

def test_export_zoom_only_max(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", inputfile, outputfile, "--zoom-levels", "..7"]
    )
    assert result.exit_code == 0

    with open(outputfile, "rb") as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 13


def test_export_jobs(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles", inputfile, outputfile, "-j", "4"])
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 19


def test_export_src_nodata(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group,
        ["pmtiles", inputfile, outputfile, "--src-nodata", "0", "--dst-nodata", "0"],
    )
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 19


def test_export_bilinear(tmpdir, data):
    inputfile = str(data.join("RGB.byte.tif"))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", inputfile, outputfile, "--resampling", "bilinear"]
    )
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 19


def test_skip_empty(tmpdir, empty_data):
    """This file has the same shape as RGB.byte.tif, but no data."""
    inputfile = empty_data
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles", inputfile, outputfile])
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 0


def test_include_empty(tmpdir, empty_data):
    """This file has the same shape as RGB.byte.tif, but no data."""
    inputfile = empty_data
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", "--include-empty-tiles", inputfile, outputfile]
    )
    assert result.exit_code == 0

    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == 19


def test_invalid_format_rgba(tmpdir, empty_data):
    """--format JPEG --rgba is not allowed"""
    inputfile = empty_data
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", "--format", "JPEG", "--rgba", inputfile, outputfile]
    )
    assert result.exit_code == 2


@pytest.mark.parametrize("filename", ["RGBA.byte.tif", "RGB.byte.tif"])
def test_rgba_png(tmpdir, data, filename):
    inputfile = str(data.join(filename))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group, ["pmtiles", "--rgba", "--format", "PNG", inputfile, outputfile]
    )
    with Output(outputfile) as p:
        assert p.metadata()['name'] == filename


@pytest.mark.parametrize(
    "minzoom,maxzoom,exp_num_tiles,source",
    [
        (4, 10, 70, "RGB.byte.tif"),
        (6, 7, 6, "RGB.byte.tif"),
        (4, 10, 12, "rgb-193f513.vrt"),
        (4, 10, 70, "rgb-fa48952.vrt"),
    ],
)
def test_export_count(tmpdir, data, minzoom, maxzoom, exp_num_tiles, source):
    inputfile = str(data.join(source))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group,
        [
            "pmtiles",
            "--zoom-levels",
            "{}..{}".format(minzoom, maxzoom),
            inputfile,
            outputfile,
        ],
    )
    assert result.exit_code == 0
    with open(outputfile, 'rb') as f:
        src = MmapSource(f)
        assert len(list(all_tiles(src))) == exp_num_tiles


@pytest.mark.parametrize("filename", ["RGBA.byte.tif"])
def test_progress_bar(tmpdir, data, filename):
    inputfile = str(data.join(filename))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group,
        [
            "pmtiles",
            "--zoom-levels",
            "4..11",
            "--rgba",
            "--format",
            "PNG",
            inputfile,
            outputfile,
        ],
    )
    assert result.exit_code == 0
    assert "100%" in result.output


@pytest.mark.parametrize("inputfiles", [[], ["a.tif", "b.tif"]])
def test_input_required(inputfiles):
    """We require exactly one input file"""
    runner = CliRunner()
    result = runner.invoke(main_group, ["pmtiles"] + inputfiles + ["foo.pmtiles"])
    assert result.exit_code == 2


@pytest.mark.parametrize("filename", ["RGBA.byte.tif"])
def test_cutline_progress_bar(tmpdir, data, rgba_cutline_path, filename):
    """rio-pmtiles accepts and uses a cutline"""
    inputfile = str(data.join(filename))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group,
        [
            "pmtiles",
            "--zoom-levels",
            "4..11",
            "--rgba",
            "--format",
            "PNG",
            "--cutline",
            rgba_cutline_path,
            inputfile,
            outputfile,
        ],
    )
    assert result.exit_code == 0
    assert "100%" in result.output


@pytest.mark.parametrize("filename", ["RGBA.byte.tif"])
def test_invalid_cutline(tmpdir, data, rgba_points_path, filename):
    """Points cannot serve as a cutline"""
    inputfile = str(data.join(filename))
    outputfile = str(tmpdir.join("export.pmtiles"))
    runner = CliRunner()
    result = runner.invoke(
        main_group,
        [
            "pmtiles",
            "--zoom-levels",
            "4..11",
            "--rgba",
            "--format",
            "PNG",
            "--cutline",
            rgba_points_path,
            inputfile,
            outputfile,
        ],
    )
    assert result.exit_code == 1

@pytest.mark.parametrize(
    "crs,bounds,width,height,tile_size,maxzoom",
    [
        ("EPSG:4326",[-180,-90,180,90],256,256,256,0),
        ("EPSG:4326",[-180,-90,180,90],512,512,256,1),
        ("EPSG:4326",[-180,-90,180.00000000007202,90],512,1,256,1),
    ],
)
def test_guess_maxzoom(crs, bounds, width, height, tile_size, maxzoom):
    assert guess_maxzoom(crs, bounds, width, height, tile_size) == maxzoom
