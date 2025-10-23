"""The Protomaps QGIS PMTiles Plugin."""

__author__ = "(C) 2025 by Sam Woodcock"
__date__ = "23/10/2025"
__copyright__ = "Copyright 2025, Protomaps"
# This will get replaced with a git SHA1 when you do a git archive
__revision__ = "$Format:%H$"

from pathlib import Path

from qgis.PyQt.QtGui import QIcon
from qgis.PyQt.QtWidgets import QAction

from PMTiles.dialog import PMTilesDialog


class PMTilesPlugin:
    """The PMTiles QGIS plugin."""

    def __init__(self, iface):
        """Initialise plugin."""
        self.iface = iface
        self.plugin_dir = Path(__file__).parent

    def initGui(self):
        """Load GUI elements."""
        icon_path = str(self.plugin_dir / "icon.svg")
        self.action = QAction(
            QIcon(icon_path), "Convert MBTiles --> PMTiles", self.iface.mainWindow()
        )
        self.iface.addToolBarIcon(self.action)
        self.action.triggered.connect(self.run)

    def unload(self):
        """Unload GUI elements."""
        self.iface.removeToolBarIcon(self.action)
        del self.action

    def run(self):
        """Run the main processing dialog."""
        dlg = PMTilesDialog(self.iface.mainWindow())
        dlg.exec_()
