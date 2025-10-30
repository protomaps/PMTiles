"""Dialog for converting MBTiles --> PMTiles."""

from qgis.core import Qgis, QgsMessageLog
from qgis.PyQt.QtCore import Qt
from qgis.PyQt.QtGui import QIntValidator
from qgis.PyQt.QtWidgets import (
    QDialog,
    QFileDialog,
    QFormLayout,
    QHBoxLayout,
    QLabel,
    QLineEdit,
    QPushButton,
    QVBoxLayout,
)

# Relative import from vendored pmtiles lib at package time
from .vendor.pmtiles.convert import mbtiles_to_pmtiles


class PMTilesDialog(QDialog):
    """Simple dialog to convert an MBTiles file to a PMTiles file."""

    def __init__(self, parent=None):
        """Initialise dialog."""
        super().__init__(parent)

        self.setWindowTitle("Convert MBTiles to PMTiles")
        self.setMinimumWidth(400)

        # Input/output fields
        # TODO allow the user to select a layer instead,
        # and do layer.dataProvider().dataSourceUri()
        self.inputLineEdit = QLineEdit()
        self.inputLineEdit.setReadOnly(True)
        self.inputBrowseButton = QPushButton("Browse…")

        self.outputLineEdit = QLineEdit()
        self.outputLineEdit.setReadOnly(True)
        self.outputBrowseButton = QPushButton("Save As…")

        self.maxZoomLineEdit = QLineEdit()
        self.maxZoomLineEdit.setValidator(QIntValidator(1, 23))

        # Action buttons
        self.convertButton = QPushButton("Convert")
        self.convertButton.setDefault(True)

        # Error label
        self.statusLabel = QLabel("")
        self.statusLabel.setWordWrap(True)
        self.statusLabel.setStyleSheet("color: red")

        # Build layout
        form = QFormLayout()
        input_row = QHBoxLayout()
        input_row.addWidget(self.inputLineEdit)
        input_row.addWidget(self.inputBrowseButton)
        form.addRow("Input MBTiles:", input_row)

        output_row = QHBoxLayout()
        output_row.addWidget(self.outputLineEdit)
        output_row.addWidget(self.outputBrowseButton)
        form.addRow("Output PMTiles:", output_row)

        maxzoom_row = QHBoxLayout()
        maxzoom_row.addWidget(self.maxZoomLineEdit)
        form.addRow("Max zoom:", maxzoom_row)

        layout = QVBoxLayout()
        layout.addLayout(form)
        layout.addWidget(self.statusLabel)
        layout.addWidget(self.convertButton, alignment=Qt.AlignRight)
        self.setLayout(layout)

        # Connections
        self.inputBrowseButton.clicked.connect(self.select_input_file)
        self.outputBrowseButton.clicked.connect(self.select_output_file)
        self.convertButton.clicked.connect(self.convert_mbtiles_to_pmtiles)

        # Internal state
        self.input_file = None
        self.output_file = None
        self.maxzoom = None

    def select_input_file(self):
        """Select input MBTiles file."""
        path, _ = QFileDialog.getOpenFileName(
            self, "Select MBTiles file", "", "MBTiles (*.mbtiles)"
        )
        if path:
            self.input_file = path
            self.inputLineEdit.setText(path)
            self.statusLabel.clear()

    def select_output_file(self):
        """Select output PMTiles file."""
        path, _ = QFileDialog.getSaveFileName(
            self, "Save PMTiles file", "", "PMTiles (*.pmtiles)"
        )
        if path:
            if not path.lower().endswith(".pmtiles"):
                path += ".pmtiles"
            self.output_file = path
            self.outputLineEdit.setText(path)
            self.statusLabel.clear()

    def validate_entry(self) -> bool:
        """Validate fields prior to convert."""
        if not self.input_file or not self.output_file:
            self.statusLabel.setText("Please select both input and output files.")
            return False

        maxzoom_text = self.maxZoomLineEdit.text().strip()
        if not maxzoom_text or maxzoom_text == "":
            self.statusLabel.setText("Please enter a numerical max zoom value.")
            return False

        maxzoom_int = int(maxzoom_text)
        if maxzoom_int > 23 or maxzoom_int < 1:
            self.statusLabel.setText("Max zoom must be between 1 and 23.")
            return False

        self.maxzoom = maxzoom_int

        return True


    def convert_mbtiles_to_pmtiles(self):
        """Convert MBTiles archive to PMTiles archive."""
        all_valid = self.validate_entry()
        if not all_valid:
            return

        try:
            mbtiles_to_pmtiles(self.input_file, self.output_file, self.maxzoom)
            self.statusLabel.setStyleSheet("color: green")
            self.statusLabel.setText("✅ Conversion successful!")
            QgsMessageLog.logMessage(
                f"Converted {self.input_file} → {self.output_file}",
                "PMTiles",
                level=Qgis.Info,
            )
        except Exception as e:
            self.statusLabel.setStyleSheet("color: red")
            self.statusLabel.setText(f"Conversion failed: {e}")
            QgsMessageLog.logMessage(
                f"Conversion failed: {e}", "PMTiles", level=Qgis.Critical
            )
