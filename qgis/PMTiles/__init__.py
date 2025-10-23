"""The Protomaps QGIS PMTiles Plugin."""

from PMTiles.PMTilesPlugin import PMTilesPlugin


def classFactory(iface):  # pylint: disable=invalid-name
    """Load plugin.

    :param iface: A QGIS interface instance.
    :type iface: QgsInterface
    """
    return PMTilesPlugin(iface)
